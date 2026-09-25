import {catalog,demoPairings} from './demo.js';
const config=window.DOUBLE_FEATURE_CONFIG||{demo:true,apiBase:''};
const $=id=>document.getElementById(id);
const types=[['choose','✦','You choose'],['actor','◉','Actor'],['director','▤','Director'],['theme','◇','Theme'],['mood','☾','Mood'],['era','◷','Era'],['style','◈','Style']];
let selected=[],locked=false,type='choose',suggestions=[],active=-1,searchTimer,searchController,searchVersion=0,busy=false;
const responseCache=new Map(),searchCache=new Map();
const base=String(config.apiBase||'').replace(/\/$/,'');
function node(tag,className,text){const n=document.createElement(tag);if(className)n.className=className;if(text!==undefined)n.textContent=text;return n;}
function announce(message){$('announce').textContent=message;}
function error(message){$('request-error').textContent=message;$('request-error').hidden=!message;}
async function api(path,options={}){
 const response=await fetch(`${base}/api${path}`,{...options,headers:{...(options.body?{'Content-Type':'application/json'}:{}),...options.headers}});
 let data;try{data=await response.json();}catch{throw new Error('The movie service is unavailable. Please try again shortly.');}
 if(!response.ok)throw new Error(data.error||'The movie service could not complete this request.');return data;
}
function closeSuggestions(){suggestions=[];active=-1;$('suggestions').hidden=true;$('movie-search').setAttribute('aria-expanded','false');$('movie-search').removeAttribute('aria-activedescendant');}
function cancelSearch(){clearTimeout(searchTimer);searchController?.abort();searchVersion++;closeSuggestions();}
function setActive(index){active=index;$('suggestions').querySelectorAll('[role=option]').forEach((n,i)=>n.setAttribute('aria-selected',String(i===active)));if(active>=0){$('movie-search').setAttribute('aria-activedescendant',`movie-option-${active}`);$('suggestions').children[active]?.scrollIntoView({block:'nearest'});}else $('movie-search').removeAttribute('aria-activedescendant');}
function showSuggestions(movies){suggestions=movies.filter(m=>!selected.some(s=>s.id===m.id)).slice(0,8);active=-1;$('suggestions').replaceChildren();suggestions.forEach((m,i)=>{const li=node('li','suggestion');li.id=`movie-option-${i}`;li.role='option';li.setAttribute('aria-selected','false');li.append(node('span','',m.title),node('small','',m.year||'Year unknown'));li.addEventListener('mousedown',e=>e.preventDefault());li.addEventListener('click',()=>addMovie(m));$('suggestions').append(li);});$('suggestions').hidden=!suggestions.length;$('movie-search').setAttribute('aria-expanded',String(!!suggestions.length));$('search-status').textContent=suggestions.length?'':config.demo?'No match in the sample catalog. Try “Inception” or “Barbie”.':'No matching movies. Try another title.';announce(`${suggestions.length} matching movies.`);}
async function search(){
 const q=$('movie-search').value.trim();const version=++searchVersion;searchController?.abort();closeSuggestions();
 if(q.length<2){$('search-status').textContent='';return;}
 $('search-status').textContent='Searching movies…';searchController=new AbortController();
 try{let movies;if(config.demo)movies=catalog.filter(m=>m.title.toLocaleLowerCase().includes(q.toLocaleLowerCase()));else if(searchCache.has(q.toLowerCase()))movies=searchCache.get(q.toLowerCase());else{const data=await api(`/search?q=${encodeURIComponent(q)}`,{signal:searchController.signal});movies=data.movies;searchCache.set(q.toLowerCase(),movies);}
 if(version!==searchVersion||locked)return;showSuggestions(movies);
 }catch(e){if(e.name==='AbortError'||version!==searchVersion)return;$('search-status').textContent=e.message;}
}
function addMovie(movie){if(locked||busy||selected.length>=12||selected.some(m=>m.id===movie.id))return;selected.push(movie);cancelSearch();$('movie-search').value='';$('search-status').textContent='';$('results').hidden=true;error('');update();announce(`${movie.title} added. ${selected.length} selected.`);$('movie-search').focus();}
function update(){
 $('selected-movies').replaceChildren();selected.forEach(movie=>{const chip=node('span','movie-chip');chip.append(node('span','',movie.title),node('small','',movie.year||''));if(!locked){const remove=node('button','remove-movie','×');remove.type='button';remove.setAttribute('aria-label',`Remove ${movie.title}`);remove.addEventListener('click',()=>{selected=selected.filter(m=>m.id!==movie.id);$('results').hidden=true;update();$('movie-search').focus();});chip.append(remove);}$('selected-movies').append(chip);});
 if(selected.length>1)type='choose';
 $('movie-entry').hidden=locked;$('starter-picks').hidden=selected.length>0||locked;
 $('movie-search').disabled=selected.length>=12;$('movie-search').placeholder=selected.length>=12?'Maximum 12 movies selected':'Search for a movie…';
 $('lock-movies').hidden=locked;$('lock-movies').disabled=!selected.length||busy;$('lock-movies').replaceChildren(document.createTextNode(selected.length>1?`Use these ${selected.length} movies`:'Use this movie'),node('span','','→'));
 $('edit-movies').hidden=!locked;$('edit-movies').disabled=busy;$('pairing-options').disabled=!locked||busy;
 $('step-two').classList.toggle('muted',!locked);
 $('pair-help').textContent=selected.length>1?'We’ll find the best connections within your list. Other pairing types are available when you pick one movie.':'Choose what brings your double feature together.';
 document.querySelectorAll('input[name=pairing]').forEach(r=>{r.disabled=selected.length>1&&r.value!=='choose';r.checked=r.value===type;});
 $('generate').disabled=!locked||busy;$('generate').classList.toggle('loading',busy);$('generate-label').textContent=busy?'Curating your movie night…':'Find my double features';
}
for(const [value,icon,label] of types){const l=node('label','pairing-option'),input=node('input');input.type='radio';input.name='pairing';input.value=value;input.checked=value==='choose';input.addEventListener('change',()=>{type=value;error('');$('results').hidden=true;});const symbol=node('span','pair-icon',icon);symbol.setAttribute('aria-hidden','true');l.append(input,symbol,node('span','',label));$('pairing-grid').append(l);}
[120467,27205,346698].forEach(id=>{const movie=catalog.find(m=>m.id===id),button=node('button','starter-button',movie.title);button.type='button';button.addEventListener('click',()=>addMovie(movie));$('starter-buttons').append(button);});
$('movie-search').addEventListener('input',()=>{cancelSearch();$('search-status').textContent='';searchTimer=setTimeout(search,300);});
$('movie-search').addEventListener('keydown',e=>{if(e.key==='ArrowDown'&&suggestions.length){e.preventDefault();setActive((active+1)%suggestions.length);}else if(e.key==='ArrowUp'&&suggestions.length){e.preventDefault();setActive(active<=0?suggestions.length-1:active-1);}else if(e.key==='Enter'){e.preventDefault();if(active>=0)addMovie(suggestions[active]);else if(suggestions.length===1)addMovie(suggestions[0]);else{$('search-status').textContent='Choose a movie from the suggestions to add it.';}}else if(e.key==='Escape')cancelSearch();});
$('movie-search').addEventListener('blur',()=>{setTimeout(()=>{if(document.activeElement!==$('movie-search'))cancelSearch();},150);});
$('lock-movies').addEventListener('click',()=>{if(!selected.length)return;locked=true;cancelSearch();error('');update();document.querySelector('input[name=pairing]:checked').focus();});
$('edit-movies').addEventListener('click',()=>{locked=false;$('results').hidden=true;error('');update();$('movie-search').focus();});
$('try-example').addEventListener('click',()=>{if(busy)return;selected=catalog.filter(m=>[120467,83666].includes(m.id));locked=true;type='choose';cancelSearch();$('results').hidden=true;update();$('picker').scrollIntoView({behavior:'smooth',block:'start'});$('generate').focus({preventScroll:true});});
function filmArt(movie){
 const fallback=()=>{const art=node('div','film-art film-typography');art.setAttribute('aria-hidden','true');art.append(node('span','','DOUBLE FEATURE'),node('strong','',movie.title),node('small','',String(movie.year||'CINEMA')));return art;};
 // Only use trusted poster origins (or the three bundled sample images).
 const safe=typeof movie.poster==='string'&&(/^\.\/assets\/[a-z-]+\.(jpg|png)$/.test(movie.poster)||/^https:\/\/image\.tmdb\.org\/t\/p\/w342\/[A-Za-z0-9._-]+$/.test(movie.poster));
 if(!safe)return fallback();const img=node('img','film-art');img.src=movie.poster;img.alt=`${movie.title} poster`;img.loading='lazy';img.width=220;img.height=330;img.addEventListener('error',()=>img.replaceWith(fallback()),{once:true});return img;
}
function renderResults(data){
 $('result-cards').replaceChildren();const pairings=data.pairings||[];
 $('results-summary').textContent=pairings.length?(selected.length>1?`The strongest connections from your ${selected.length} selected films.`:`An evening built around ${selected[0].title}.`):'No verified matches for this connection. Try “You choose” or a different movie.';
 $('results-kicker').textContent=data.demo?'SAMPLE PAIRINGS · OFFLINE DEMO':'YOUR NEXT MOVIE NIGHT';$('result-count').textContent=`${pairings.length} ${pairings.length===1?'pairing':'pairings'}`;
 pairings.forEach((pair,i)=>{const card=node('article','pair-card'),films=node('div','pair-films');pair.movies.forEach(m=>{const film=node('div','pair-film');film.append(filmArt(m),node('h3','',m.title),node('p','',[m.year,m.runtime?`${m.runtime} min`:null].filter(Boolean).join(' · ')));films.append(film);});const bridge=node('span','pair-bridge','+');bridge.setAttribute('aria-hidden','true');films.append(bridge);const copy=node('div','pair-copy'),total=pair.movies.reduce((sum,m)=>sum+(m.runtime||0),0);copy.append(node('p','eyebrow',`${String(i+1).padStart(2,'0')} / ${pair.label.toUpperCase()}${pair.movies.every(m=>m.runtime)?` / ${Math.floor(total/60)}H ${total%60}M`:''}`),node('h3','',pair.title),node('p','blurb',pair.blurb),node('span','why-label','WHY THEY WORK TOGETHER'),node('p','reason',pair.reason),node('p','watch-order',pair.order));card.append(films,copy);$('result-cards').append(card);});
 $('results').hidden=false;$('results-title').focus({preventScroll:true});$('results').scrollIntoView({behavior:'smooth',block:'start'});announce(`${pairings.length} double feature pairings ready.`);
}
async function generate(){
 if(!locked||busy)return;busy=true;error('');update();$('results').hidden=true;
 const ids=selected.map(m=>m.id).sort((a,b)=>a-b),key=JSON.stringify([ids,type]);
 try{let result=responseCache.get(key);if(!result){if(config.demo){await new Promise(r=>setTimeout(r,450));result=demoPairings(ids,type);}else result=await api('/pairings',{method:'POST',body:JSON.stringify({movieIds:ids,type}),signal:AbortSignal.timeout(90000)});responseCache.set(key,result);}renderResults(result);}
 catch(e){error(e.name==='TimeoutError'?'This request took longer than expected. Try again in a moment; a completed result will be reused.':e.message);announce('The pairing request could not be completed.');}
 finally{busy=false;update();}
}
$('generate').addEventListener('click',generate);
$('mode-note').textContent=config.demo?'DEMO · Sample catalog · No API calls':'Movie discovery, thoughtfully paired.';
update();
// Progressive enhancement: expose current movie-night state to supporting agents.
// Read-only: this tool cannot trigger a paid API request or modify the selection.
if(document.modelContext?.registerTool){
 const lifecycle=new AbortController();
 try{Promise.resolve(document.modelContext.registerTool({
  name:'get_movie_pairing_state',title:'Read movie pairing state',
  description:'Read the selected movies, available pairing types, selected type, and whether the movie selection is locked. Does not change the page or call any API.',
  inputSchema:{type:'object',properties:{},additionalProperties:false},
  annotations:{readOnlyHint:true,untrustedContentHint:true},
  execute(input){if(!input||typeof input!=='object'||Array.isArray(input)||Object.keys(input).length)throw new Error('This tool accepts an empty object only.');return {movies:selected.map(({id,title,year})=>({id,title,year})),locked,pairingType:type,availableTypes:selected.length>1?['choose']:types.map(t=>t[0]),busy,demo:!!config.demo};}
 },{signal:lifecycle.signal})).catch(()=>{});}catch{/* Browsers without WebMCP still have the complete interface. */}
 window.addEventListener('pagehide',()=>lifecycle.abort(),{once:true});
}
