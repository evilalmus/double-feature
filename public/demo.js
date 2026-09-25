// Small, intentional offline catalog. Production searches TMDB instead.
const raw = [
 [120467,'The Grand Budapest Hotel',2014,100,'Wes Anderson',['Ralph Fiennes','Bill Murray','Edward Norton'],['friendship','escape'],['whimsical','bittersweet'],['meticulous composition','ensemble comedy'],'grand-budapest.png'],
 [83666,'Moonrise Kingdom',2012,94,'Wes Anderson',['Bill Murray','Edward Norton','Frances McDormand'],['escape','belonging'],['whimsical','tender'],['meticulous composition','ensemble comedy'],'moonrise.jpg'],
 [10315,'Fantastic Mr. Fox',2009,87,'Wes Anderson',['George Clooney','Meryl Streep','Bill Murray'],['family','rebellion'],['whimsical','mischievous'],['meticulous composition','stop-motion animation'],'fantastic-fox.jpg'],
 [115,'The Big Lebowski',1998,117,'Joel Coen',['Jeff Bridges','John Goodman','Steve Buscemi'],['mistaken identity','crime'],['absurd','laid-back'],['ensemble comedy','neo-noir']],
 [680,'Pulp Fiction',1994,154,'Quentin Tarantino',['John Travolta','Samuel L. Jackson','Uma Thurman'],['crime','chance'],['darkly comic','tense'],['nonlinear storytelling','ensemble comedy']],
 [101,'Léon: The Professional',1994,111,'Luc Besson',['Jean Reno','Natalie Portman','Gary Oldman'],['crime','friendship'],['tense','bittersweet'],['stylized action','neo-noir']],
 [27205,'Inception',2010,148,'Christopher Nolan',['Leonardo DiCaprio','Joseph Gordon-Levitt','Tom Hardy'],['memory','reality'],['cerebral','tense'],['nonlinear storytelling','high-concept science fiction']],
 [157336,'Interstellar',2014,169,'Christopher Nolan',['Matthew McConaughey','Anne Hathaway','Jessica Chastain'],['family','time'],['awe','bittersweet'],['high-concept science fiction','epic scale']],
 [77,'Memento',2000,113,'Christopher Nolan',['Guy Pearce','Carrie-Anne Moss','Joe Pantoliano'],['memory','identity'],['cerebral','tense'],['nonlinear storytelling','neo-noir']],
 [1124,'The Prestige',2006,130,'Christopher Nolan',['Hugh Jackman','Christian Bale','Scarlett Johansson'],['obsession','identity'],['cerebral','tense'],['nonlinear storytelling','period drama']],
 [329865,'Arrival',2016,116,'Denis Villeneuve',['Amy Adams','Jeremy Renner','Forest Whitaker'],['time','communication'],['cerebral','bittersweet'],['high-concept science fiction','restrained visual storytelling']],
 [335984,'Blade Runner 2049',2017,164,'Denis Villeneuve',['Ryan Gosling','Harrison Ford','Ana de Armas'],['identity','belonging'],['melancholy','cerebral'],['neo-noir','high-concept science fiction']],
 [78,'Blade Runner',1982,117,'Ridley Scott',['Harrison Ford','Rutger Hauer','Sean Young'],['identity','mortality'],['melancholy','tense'],['neo-noir','high-concept science fiction']],
 [603,'The Matrix',1999,136,'Lana & Lilly Wachowski',['Keanu Reeves','Carrie-Anne Moss','Laurence Fishburne'],['reality','rebellion'],['cerebral','electric'],['high-concept science fiction','stylized action']],
 [84892,'The Perks of Being a Wallflower',2012,103,'Stephen Chbosky',['Logan Lerman','Emma Watson','Ezra Miller'],['friendship','belonging'],['tender','bittersweet'],['coming-of-age drama','intimate storytelling']],
 [313369,'La La Land',2016,128,'Damien Chazelle',['Ryan Gosling','Emma Stone','John Legend'],['ambition','love'],['bittersweet','dreamy'],['musical','expressive color']],
 [244786,'Whiplash',2014,107,'Damien Chazelle',['Miles Teller','J. K. Simmons','Paul Reiser'],['ambition','obsession'],['tense','electric'],['rhythmic editing','intimate storytelling']],
 [872585,'Oppenheimer',2023,181,'Christopher Nolan',['Cillian Murphy','Emily Blunt','Robert Downey Jr.'],['ambition','responsibility'],['cerebral','tense'],['nonlinear storytelling','epic scale']],
 [346698,'Barbie',2023,114,'Greta Gerwig',['Margot Robbie','Ryan Gosling','America Ferrera'],['identity','belonging'],['playful','bittersweet'],['expressive color','satirical comedy']],
 [391713,'Lady Bird',2017,94,'Greta Gerwig',['Saoirse Ronan','Laurie Metcalf','Timothée Chalamet'],['family','belonging'],['tender','bittersweet'],['coming-of-age drama','intimate storytelling']],
 [545611,'Everything Everywhere All at Once',2022,140,'Daniel Kwan & Daniel Scheinert',['Michelle Yeoh','Stephanie Hsu','Ke Huy Quan'],['family','identity'],['absurd','tender'],['high-concept science fiction','stylized action']],
 [129,'Spirited Away',2001,125,'Hayao Miyazaki',['Rumi Hiiragi','Miyu Irino','Mari Natsuki'],['identity','courage'],['dreamy','whimsical'],['hand-drawn animation','fantasy']],
 [10515,'Castle in the Sky',1986,125,'Hayao Miyazaki',['Mayumi Tanaka','Keiko Yokozawa','Kotoe Hatsui'],['friendship','escape'],['awe','whimsical'],['hand-drawn animation','fantasy']],
 [8392,'My Neighbor Totoro',1988,86,'Hayao Miyazaki',['Noriko Hidaka','Chika Sakamoto','Hitoshi Takagi'],['family','wonder'],['tender','whimsical'],['hand-drawn animation','fantasy']],
 [105,'Back to the Future',1985,116,'Robert Zemeckis',['Michael J. Fox','Christopher Lloyd','Lea Thompson'],['time','family'],['playful','electric'],['high-concept science fiction','adventure comedy']],
 [620,'Ghostbusters',1984,107,'Ivan Reitman',['Bill Murray','Dan Aykroyd','Sigourney Weaver'],['friendship','supernatural'],['playful','absurd'],['ensemble comedy','adventure comedy']],
 [2493,'The Princess Bride',1987,98,'Rob Reiner',['Cary Elwes','Robin Wright','Mandy Patinkin'],['love','adventure'],['playful','tender'],['fantasy','adventure comedy']],
 [694,'The Shining',1980,144,'Stanley Kubrick',['Jack Nicholson','Shelley Duvall','Danny Lloyd'],['isolation','family'],['unsettling','tense'],['psychological horror','meticulous composition']],
 [419430,'Get Out',2017,104,'Jordan Peele',['Daniel Kaluuya','Allison Williams','Catherine Keener'],['identity','control'],['unsettling','tense'],['psychological horror','satirical comedy']],
 [762504,'Nope',2022,130,'Jordan Peele',['Daniel Kaluuya','Keke Palmer','Steven Yeun'],['spectacle','family'],['unsettling','awe'],['science-fiction horror','epic scale']],
 [496243,'Parasite',2019,132,'Bong Joon Ho',['Song Kang-ho','Lee Sun-kyun','Cho Yeo-jeong'],['class','family'],['darkly comic','tense'],['satirical comedy','meticulous composition']],
 [76341,'Mad Max: Fury Road',2015,121,'George Miller',['Tom Hardy','Charlize Theron','Nicholas Hoult'],['escape','rebellion'],['electric','tense'],['stylized action','epic scale']],
 [324857,'Spider-Man: Into the Spider-Verse',2018,117,'Bob Persichetti, Peter Ramsey & Rodney Rothman',['Shameik Moore','Jake Johnson','Hailee Steinfeld'],['identity','belonging'],['playful','electric'],['expressive color','stylized action']],
 [137,'Groundhog Day',1993,101,'Harold Ramis',['Bill Murray','Andie MacDowell','Chris Elliott'],['time','self-discovery'],['playful','tender'],['high-concept comedy','romantic comedy']],
 [38,'Eternal Sunshine of the Spotless Mind',2004,108,'Michel Gondry',['Jim Carrey','Kate Winslet','Kirsten Dunst'],['memory','love'],['dreamy','bittersweet'],['nonlinear storytelling','high-concept science fiction']],
 [152601,'Her',2013,126,'Spike Jonze',['Joaquin Phoenix','Scarlett Johansson','Amy Adams'],['love','identity'],['tender','melancholy'],['high-concept science fiction','intimate storytelling']]
];
export const catalog = raw.map(([id,title,year,runtime,director,cast,theme,mood,style,poster])=>({id,title,year,runtime,director,cast,theme,mood,style,poster:poster?`./assets/${poster}`:null}));
const common=(a,b,k)=>a[k].filter(v=>b[k].includes(v));
function connection(a,b,type){
 const actor=common(a,b,'cast')[0];
 const theme=common(a,b,'theme')[0],mood=common(a,b,'mood')[0],style=common(a,b,'style')[0];
 const sameDirector=a.director===b.director,decade=Math.floor(a.year/10)*10;
 const options={
  director:sameDirector?{score:12,label:'Director',title:'Two chapters. One signature.',reason:`${a.director} directed both films, making this a chance to explore the recurring sensibilities of one filmmaker.`,blurb:`Spend the evening in ${a.director}’s world. ${a.title} and ${b.title} offer two distinct ways into a singular cinematic imagination.`}:null,
  actor:actor?{score:10,label:'Actor',title:'Same star. A different spotlight.',reason:`${actor} appears in both films. Watching them together puts the performer in two different ensembles and stories.`,blurb:`Make it a two-film showcase for ${actor}. Settle in for ${a.title}, then discover a different side of the screen presence in ${b.title}.`}:null,
  theme:theme?{score:8,label:'Theme',title:`An evening of ${theme}.`,reason:`Both films explore ${theme}, approaching that shared idea through different characters and stories.`,blurb:`Two stories, one irresistible thread: ${theme}. Let ${a.title} and ${b.title} start a conversation that lasts beyond the final credits.`}:null,
  mood:mood?{score:6,label:'Mood',title:`Keep the ${mood} feeling going.`,reason:`Both films have a ${mood} sensibility, offering an emotional connection even when their stories take different paths.`,blurb:`Follow one feeling through two different worlds. This ${mood} double bill makes room for the moments that linger after the lights come up.`}:null,
  style:style?{score:7,label:'Style',title:'A shared cinematic language.',reason:`Both films use ${style}. Pairing them draws attention to how technique shapes the experience of a story.`,blurb:`See what happens when ${style} takes the lead. ${a.title} and ${b.title} make a night worth watching closely.`}:null,
  era:Math.floor(b.year/10)*10===decade?{score:3,label:'Era',title:`A night in the ${decade}s.`,reason:`Released in ${a.year} and ${b.year}, these films share a release decade. This pairing is about the era they were made, rather than when their stories are set.`,blurb:`Turn back the clock to the ${decade}s. Revisit two different corners of the decade with ${a.title} and ${b.title}.`}:null
 };
 if(type!=='choose')return options[type];
 return Object.values(options).filter(Boolean).sort((x,y)=>y.score-x.score)[0]||{score:1,label:'Contrast',title:'Take the scenic route.',reason:'These films offer contrasting stories and sensibilities. This sample pairing is about variety rather than a specific shared credit or theme.',blurb:`Start with ${a.title}, then change direction with ${b.title}. Give your evening room for two very different cinematic worlds.`};
}
export function demoPairings(ids,type){
 const selected=ids.map(id=>catalog.find(m=>m.id===id)).filter(Boolean),pairs=[];
 for(let i=0;i<selected.length;i++)for(const b of (selected.length===1?catalog:selected.slice(i+1))){
  const a=selected[i];if(a.id===b.id)continue;const c=connection(a,b,type);if(c)pairs.push({...c,movies:[a,b],order:`Start with ${a.title}, then watch ${b.title}.`});
 }
 return {pairings:pairs.sort((a,b)=>b.score-a.score||a.movies[1].id-b.movies[1].id).slice(0,5),demo:true,cached:false};
}
