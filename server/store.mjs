import {mkdirSync,readFileSync,writeFileSync,renameSync} from 'node:fs';
import {join} from 'node:path';
import {createHash} from 'node:crypto';

export class Store {
 constructor(directory){
  this.directory=directory;
  mkdirSync(directory,{recursive:true,mode:0o700});
  this.path=join(directory,'cache.json');

  try{
   this.data=JSON.parse(readFileSync(this.path,'utf8'));
  }catch(e){
   if(e.code!=='ENOENT'){
    throw new Error(
     'Cannot read cache storage. Restore it before starting to preserve the usage cap.'
    );
   }

   this.data={
    entries:{},
    usage:{},
    shares:{}
   };
  }

  // Older cache files will not have a shares object yet.
  if(!this.data.entries)this.data.entries={};
  if(!this.data.usage)this.data.usage={};
  if(!this.data.shares)this.data.shares={};
 }

 get(key){
  const e=this.data.entries[key];
  return e&&e.expires>Date.now()?e.value:undefined;
 }

 set(key,value,ttl){
  this.data.entries[key]={
   value,
   expires:Date.now()+ttl
  };

  this.save();
 }

 createShare(value){
  const serialized=JSON.stringify(value);

  const id=createHash('sha256')
   .update(serialized)
   .digest('base64url')
   .slice(0,16);

  if(!this.data.shares[id]){
   this.data.shares[id]=value;
   this.save();
  }

  return id;
 }

 getShare(id){
  return this.data.shares[id];
 }

 save(){
  const now=Date.now();

  const entries=Object.entries(this.data.entries)
   .filter(([,v])=>v.expires>now);

  this.data.entries=Object.fromEntries(
   entries.slice(-2500)
  );

  const today=new Date().toISOString().slice(0,10);

  for(const day of Object.keys(this.data.usage)){
   if(day!==today){
    delete this.data.usage[day];
   }
  }

  writeFileSync(
   `${this.path}.tmp`,
   JSON.stringify(this.data),
   {mode:0o600}
  );

  renameSync(
   `${this.path}.tmp`,
   this.path
  );
 }

 // Synchronous reservation is atomic within the supported single server process.
 reserveDaily(max){
  const day=new Date().toISOString().slice(0,10);
  const count=this.data.usage[day]||0;

  if(count>=max){
   return false;
  }

  this.data.usage[day]=count+1;
  this.save();

  return true;
 }
}