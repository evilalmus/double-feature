import {mkdirSync,readFileSync,writeFileSync,renameSync} from 'node:fs';
import {join} from 'node:path';
export class Store {
 constructor(directory){this.directory=directory;mkdirSync(directory,{recursive:true,mode:0o700});this.path=join(directory,'cache.json');try{this.data=JSON.parse(readFileSync(this.path,'utf8'));}catch(e){if(e.code!=='ENOENT')throw new Error('Cannot read cache storage. Restore it before starting to preserve the usage cap.');this.data={entries:{},usage:{}};}}
 get(key){const e=this.data.entries[key];return e&&e.expires>Date.now()?e.value:undefined;}
 set(key,value,ttl){this.data.entries[key]={value,expires:Date.now()+ttl};this.save();}
 save(){const now=Date.now();const entries=Object.entries(this.data.entries).filter(([,v])=>v.expires>now);this.data.entries=Object.fromEntries(entries.slice(-2500));const today=new Date().toISOString().slice(0,10);for(const day of Object.keys(this.data.usage))if(day!==today)delete this.data.usage[day];writeFileSync(`${this.path}.tmp`,JSON.stringify(this.data),{mode:0o600});renameSync(`${this.path}.tmp`,this.path);}
 // Synchronous reservation is atomic within the supported single server process.
 reserveDaily(max){const day=new Date().toISOString().slice(0,10),count=this.data.usage[day]||0;if(count>=max)return false;this.data.usage[day]=count+1;this.save();return true;}
}
