import {PublicError,normalizeInput,cacheKey,modelSchema,buildPrompt,validateOutput} from './pairings.mjs';
import {log} from './log.mjs';
export class PairingService {
 constructor({movies,store,apiKey,model='gpt-4.1-mini',dailyLimit=100,fetcher=fetch}){Object.assign(this,{movies,store,apiKey,model,dailyLimit,fetcher});this.pending=new Map();this.busy=0;}
 async generate(body){
   const input = normalizeInput(body);
   const key = `pairings:${cacheKey(input,this.model)}`;
   const cached = this.store.get(key);
 
   if(cached){
     log('PAIRING',{
       type: input.type,
       cache: 'hit',
       model: this.model
     });
 
     return {...cached,cached:true};
   }
 
   if(this.pending.has(key)){
     log('PAIRING',{
       type: input.type,
       cache: 'pending',
       model: this.model
     });
 
     return this.pending.get(key);
   }
 
   log('PAIRING',{
     type: input.type,
     cache: 'miss',
     model: this.model
   });
 
   if(this.busy>=4){
     throw new PublicError(
       429,
       'The projection room is busy. Please try again in a moment.'
     );
   }
 
   this.busy++;
 
   const request = this.create(input,key);
   this.pending.set(key,request);
 
   try{
     return await request;
   }finally{
     this.pending.delete(key);
     this.busy--;
   }
 }
// async generate(body){
//  const input=normalizeInput(body),key=`pairings:${cacheKey(input,this.model)}`,cached=this.store.get(key);if(cached)return {...cached,cached:true};
//  if(this.pending.has(key))return this.pending.get(key);
//  if(this.busy>=4)throw new PublicError(429,'The projection room is busy. Please try again in a moment.');
//  this.busy++;const request=this.create(input,key);this.pending.set(key,request);try{return await request;}finally{this.pending.delete(key);this.busy--;}
// }
 async create(input,key){
  if(!this.apiKey)throw new PublicError(503,'Pairing generation is not configured yet. Please contact the site owner.');
  const selected=await Promise.all(input.movieIds.map(id=>this.movies.detail(id)));
  const candidates=input.movieIds.length===1?await this.movies.candidates(selected[0],input.type):[];
  if(input.movieIds.length===1&&!candidates.length){const result={pairings:[],demo:false,cached:false};this.store.set(key,result,86400000);return result;}
  const all=[...selected,...candidates];
  if(!this.store.reserveDaily(this.dailyLimit))throw new PublicError(429,'Today’s pairing limit has been reached. Please come back tomorrow.');
 let response;
 const openaiStarted=Date.now();
 
 // Exactly one OpenAI request. Deliberately no SDK retries, tools, or repair calls.
 try{
   response=await this.fetcher(
     'https://api.openai.com/v1/responses',
     {
       method:'POST',
       headers:{
         Authorization:`Bearer ${this.apiKey}`,
         'Content-Type':'application/json'
       },
       body:JSON.stringify({
         model:this.model,
         store:false,
         max_output_tokens:2600,
         input:buildPrompt(all,input),
         text:{
           format:{
             type:'json_schema',
             name:'double_feature_pairings',
             strict:true,
             schema:modelSchema(all.map(m=>m.id))
           }
         }
       }),
       signal:AbortSignal.timeout(55000)
     }
   );
 }catch{
   log('OPENAI',{
     status:'timeout',
     model:this.model,
     durationMs:Date.now()-openaiStarted
   });
 
   throw new PublicError(
     504,
     'The pairing service timed out. Please try again in a moment.'
   );
 }
 
 if(!response.ok){
   log('OPENAI',{
     status:response.status,
     model:this.model,
     durationMs:Date.now()-openaiStarted
   });
 
   throw new PublicError(
     response.status===429 ? 429 : 502,
     response.status===429
       ? 'The pairing service is at capacity. Please try again later.'
       : 'The pairing service is unavailable. Please try again later.'
   );
 }
 
 const data=await response.json();
 
 log('OPENAI',{
   status:response.status,
   model:this.model,
   durationMs:Date.now()-openaiStarted,
   inputTokens:data.usage?.input_tokens,
   outputTokens:data.usage?.output_tokens,
   totalTokens:data.usage?.total_tokens
 });
  //  let response;
//  // Exactly one OpenAI request. Deliberately no SDK retries, tools, or repair calls.
//  try{response=await this.fetcher('https://api.openai.com/v1/responses',{method:'POST',headers:{Authorization:`Bearer ${this.apiKey}`,'Content-Type':'application/json'},body:JSON.stringify({model:this.model,store:false,max_output_tokens:2600,input:buildPrompt(all,input),text:{format:{type:'json_schema',name:'double_feature_pairings',strict:true,schema:modelSchema(all.map(m=>m.id))}}}),signal:AbortSignal.timeout(55000)});}catch{throw new PublicError(504,'The pairing service timed out. Please try again in a moment.');}
//  if(!response.ok)throw new PublicError(response.status===429?429:502,response.status===429?'The pairing service is at capacity. Please try again later.':'The pairing service is unavailable. Please try again later.');
//  const data=await response.json();if(data.status!=='completed')throw new PublicError(502,'The pairing service could not finish the answer. Please try again.');
  if(data.status!=='completed'){
    throw new PublicError(
      502,
      'The pairing service could not finish the answer. Please try again.'
    );
  }
  const text=(data.output||[]).filter(o=>o.type==='message').flatMap(o=>o.content||[]).filter(c=>c.type==='output_text').map(c=>c.text).join('');
  let raw;try{raw=JSON.parse(text);}catch{throw new PublicError(502,'The pairing service returned an unreadable answer. Please try again.');}
  const result={pairings:validateOutput(raw,all,input),demo:false,cached:false};this.store.set(key,result,30*86400000);return result;
 }
}
