import {PublicError,publicMovie,factualMatch} from './pairings.mjs';
const DAY=86400000;
export class MovieService {
 constructor({token,store,fetcher=fetch}){this.token=token;this.store=store;this.fetcher=fetcher;this.pending=new Map();}
 async get(path,params={}){
  const url=new URL(`https://api.themoviedb.org/3${path}`);Object.entries({...params,language:'en-US'}).forEach(([k,v])=>url.searchParams.set(k,String(v)));
  const key=`tmdb:${url.pathname}?${url.searchParams}`,cached=this.store.get(key);if(cached)return cached;
  if(this.pending.has(key))return this.pending.get(key);
  const request=(async()=>{let response;try{response=await this.fetcher(url,{headers:{Authorization:`Bearer ${this.token}`,Accept:'application/json'},signal:AbortSignal.timeout(12000)});}catch{throw new PublicError(503,'Movie search is temporarily unavailable. Please try again.');}
  if(response.status===404)throw new PublicError(400,'A selected movie could not be found. Please select it again.');if(!response.ok)throw new PublicError(503,'The movie catalog is unavailable. Please try again later.');const json=await response.json();this.store.set(key,json,DAY);return json;})();this.pending.set(key,request);try{return await request;}finally{this.pending.delete(key);}
 }
 summary(m){
  return {
   id:m.id,
   title:m.title,
   year:m.release_date?Number(m.release_date.slice(0,4)):null,
   runtime:m.runtime||null,
   poster:typeof m.poster_path==='string'&&/^\/[A-Za-z0-9._-]+$/.test(m.poster_path)
    ?`https://image.tmdb.org/t/p/w342${m.poster_path}`
    :null,
   tmdbScore:typeof m.vote_average==='number'&&Number.isFinite(m.vote_average)
    ?Math.round(m.vote_average*10)/10
    :null
  };
 } async search(q){const data=await this.get('/search/movie',{query:q,include_adult:false,page:1});return (data.results||[]).filter(m=>!m.adult&&m.title).slice(0,8).map(m=>this.summary(m));}
 async detail(id){const m=await this.get(`/movie/${id}`,{append_to_response:'credits,keywords'});if(m.adult||!m.title)throw new PublicError(400,'This movie is not available in the catalog.');return {...this.summary(m),overview:String(m.overview||'').slice(0,1100),genres:(m.genres||[]).map(g=>g.name),cast:(m.credits?.cast||[]).slice(0,12).map(p=>({id:p.id,name:p.name})),directors:(m.credits?.crew||[]).filter(p=>p.job==='Director').map(p=>({id:p.id,name:p.name})),keywordIds:(m.keywords?.keywords||[]).slice(0,4).map(k=>k.id),genreIds:(m.genres||[]).map(g=>g.id)};}
 async candidates(anchor,type){
  let raw=[];
  if(type==='director'){
   const credits=await Promise.all(anchor.directors.slice(0,2).map(p=>this.get(`/person/${p.id}/movie_credits`)));raw=credits.flatMap(c=>(c.crew||[]).filter(m=>m.job==='Director'));
  }else if(type==='actor'){
   const credits=await Promise.all(anchor.cast.slice(0,3).map(p=>this.get(`/person/${p.id}/movie_credits`)));raw=credits.flatMap(c=>c.cast||[]);
  }else if(type==='era'&&anchor.year){
   const decade=Math.floor(anchor.year/10)*10;raw=(await this.get('/discover/movie',{'primary_release_date.gte':`${decade}-01-01`,'primary_release_date.lte':`${decade+9}-12-31`,'vote_count.gte':100,sort_by:'popularity.desc',include_adult:false})).results||[];
  }else{
   const found=await Promise.all([this.get(`/movie/${anchor.id}/recommendations`),this.get(`/movie/${anchor.id}/similar`)]);raw=found.flatMap(r=>r.results||[]);
   if(type==='theme'&&anchor.keywordIds.length){const byKeyword=await this.get('/discover/movie',{with_keywords:anchor.keywordIds.join('|'),'vote_count.gte':50,include_adult:false});raw.push(...(byKeyword.results||[]));}
   if(raw.length<8){const more=await this.get('/discover/movie',{with_genres:anchor.genreIds.slice(0,2).join('|'),'vote_count.gte':100,include_adult:false});raw.push(...(more.results||[]));}
  }
  const today=new Date().toISOString().slice(0,10),unique=new Map();
  for(const m of raw)if(Number.isSafeInteger(m.id)&&m.id!==anchor.id&&!m.adult&&m.release_date&&m.release_date<=today&&!unique.has(m.id))unique.set(m.id,m);
  const candidates=[...unique.values()].sort((a,b)=>(b.popularity||0)-(a.popularity||0)).slice(0,24);
  // Keep API concurrency bounded. These are TMDB requests, never OpenAI calls.
  const details=[];
  for(let i=0;i<candidates.length;i+=6){const batch=await Promise.all(candidates.slice(i,i+6).map(m=>this.detail(m.id).catch(e=>{if(e.status===400)return null;throw e;})));details.push(...batch.filter(Boolean));}
  return details.filter(m=>factualMatch(anchor,m,type));
 }
}
