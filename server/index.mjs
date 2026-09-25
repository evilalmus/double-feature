import http from 'node:http';
import {readFile,stat} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {resolve,extname,sep} from 'node:path';
import {createHash,randomBytes} from 'node:crypto';
import {Store} from './store.mjs';
import {MovieService} from './tmdb.mjs';
import {PairingService} from './service.mjs';
import {PublicError} from './pairings.mjs';
import {log} from './log.mjs';

const root=fileURLToPath(new URL('../public/',import.meta.url));
const port=Number(process.env.PORT||4173);

const origins=new Set(
  (
    process.env.ALLOWED_ORIGINS||
    'http://localhost:4173,http://127.0.0.1:4173,http://terminal.local:4173'
  )
    .split(',')
    .map(s=>s.trim())
    .filter(Boolean)
);

const store=new Store(resolve(process.env.DATA_DIR||'.data'));

const movieService=new MovieService({
  token:process.env.TMDB_READ_TOKEN,
  store
});

const pairingService=new PairingService({
  movies:movieService,
  store,
  apiKey:process.env.OPENAI_API_KEY,
  model:process.env.OPENAI_MODEL||'gpt-4.1-mini',
  dailyLimit:Number(process.env.MAX_DAILY_GENERATIONS||100)
});

if(
  !Number.isInteger(pairingService.dailyLimit)||
  pairingService.dailyLimit<1
){
  throw new Error(
    'MAX_DAILY_GENERATIONS must be a positive integer.'
  );
}

const limits=new Map();
const salt=randomBytes(32).toString('hex');

function rate(req,kind,max,windowMs){
  const now=Date.now();

  for(const [k,v] of limits){
    if(v.until<=now){
      limits.delete(k);
    }
  }

  // Trust this only when the app is inaccessible except through a sanitizing proxy.
  const address=
    process.env.TRUST_PROXY==='1'
      ? String(
          req.headers['x-forwarded-for']||
          req.socket.remoteAddress
        )
          .split(',')[0]
          .trim()
      : req.socket.remoteAddress;

  const id=createHash('sha256')
    .update(`${salt}:${address}:${kind}`)
    .digest('hex');

  let item=limits.get(id);

  if(!item){
    if(limits.size>=10000){
      throw new PublicError(
        429,
        'Too many requests. Please try again later.'
      );
    }

    item={
      count:0,
      until:now+windowMs
    };

    limits.set(id,item);
  }

  if(++item.count>max){
    throw new PublicError(
      429,
      'Too many requests. Please wait a moment and try again.'
    );
  }
}

function json(res,status,data){
  res.writeHead(
    status,
    {
      'Content-Type':'application/json; charset=utf-8',
      'Cache-Control':'no-store'
    }
  );

  res.end(JSON.stringify(data));
}

async function body(req){
  if(
    !String(req.headers['content-type']||'')
      .startsWith('application/json')
  ){
    throw new PublicError(
      415,
      'Use a JSON request.'
    );
  }

  if(Number(req.headers['content-length']||0)>4096){
    throw new PublicError(
      413,
      'The selection is too large.'
    );
  }

  let length=0;
  const chunks=[];

  for await(const chunk of req){
    length+=chunk.length;

    if(length>4096){
      throw new PublicError(
        413,
        'The selection is too large.'
      );
    }

    chunks.push(chunk);
  }

  try{
    return JSON.parse(
      Buffer.concat(chunks).toString('utf8')
    );
  }catch{
    throw new PublicError(
      400,
      'The request could not be read.'
    );
  }
}

const server=http.createServer(async(req,res)=>{
  let requestPath='unknown';

  res.setHeader(
    'X-Content-Type-Options',
    'nosniff'
  );

  res.setHeader(
    'Referrer-Policy',
    'strict-origin-when-cross-origin'
  );

  res.setHeader(
    'X-Frame-Options',
    'DENY'
  );

  try{
    const url=new URL(
      req.url,
      'http://local.invalid'
    );

    requestPath=url.pathname;

    if(url.pathname.startsWith('/api/')){
      const origin=req.headers.origin;

      if(origin&&!origins.has(origin)){
        throw new PublicError(
          403,
          'This website is not allowed to use the movie service.'
        );
      }

      if(origin){
        res.setHeader(
          'Access-Control-Allow-Origin',
          origin
        );

        res.setHeader(
          'Vary',
          'Origin'
        );
      }

      if(req.method==='OPTIONS'){
        res.setHeader(
          'Access-Control-Allow-Methods',
          'GET, POST, OPTIONS'
        );

        res.setHeader(
          'Access-Control-Allow-Headers',
          'Content-Type'
        );

        res.setHeader(
          'Access-Control-Max-Age',
          '600'
        );

        res.writeHead(204);
        res.end();
        return;
      }

      if(
        req.method==='GET'&&
        url.pathname==='/api/health'
      ){
        json(
          res,
          200,
          {
            ready:!!(
              process.env.OPENAI_API_KEY&&
              process.env.TMDB_READ_TOKEN
            )
          }
        );

        return;
      }

            const shareMatch=url.pathname.match(
        /^\/api\/share\/([A-Za-z0-9_-]{16})$/
      );

      if(
        req.method==='GET'&&
        shareMatch
      ){
        rate(
          req,
          'share',
          120,
          60000
        );

        const shared=store.getShare(
          shareMatch[1]
        );

        if(!shared){
          throw new PublicError(
            404,
            'This shared movie night could not be found.'
          );
        }

        json(
          res,
          200,
          {
            ...shared,
            shared:true,
            shareId:shareMatch[1]
          }
        );

        return;
      }

      if(!process.env.TMDB_READ_TOKEN){
        throw new PublicError(
          503,
          'Movie search is not configured yet. Please contact the site owner.'
        );
      }

      if(
        req.method==='GET'&&
        url.pathname==='/api/search'
      ){
        const started=Date.now();

        rate(
          req,
          'search',
          60,
          60000
        );

        const q=String(
          url.searchParams.get('q')||''
        ).trim();

        if(
          q.length<2||
          q.length>100||
          /[\u0000-\u001f\u007f]/.test(q)
        ){
          throw new PublicError(
            400,
            'Enter a movie title between 2 and 100 characters.'
          );
        }

        const movies=await movieService.search(q);

        log(
          'SEARCH',
          {
            status:200,
            results:movies.length,
            durationMs:Date.now()-started
          }
        );

        json(
          res,
          200,
          {movies}
        );

        return;
      }

      if(
        req.method==='POST'&&
        url.pathname==='/api/pairings'
      ){
        if(!origin){
          throw new PublicError(
            403,
            'A permitted website origin is required.'
          );
        }

        rate(
          req,
          'pairings',
          10,
          600000
        );

        const input=await body(req);

        const result=await pairingService.generate(input);

        if(result.pairings?.length){
          const shareId=store.createShare({
            pairings:result.pairings
          });

          result.shareId=shareId;
        }

        json(
          res,
          200,
          result
        );

        return;
      }

      throw new PublicError(
        404,
        'Movie service route not found.'
      );
    }

    if(!['GET','HEAD'].includes(req.method)){
      throw new PublicError(
        405,
        'Method not allowed.'
      );
    }

    let pathname;

    try{
      pathname=decodeURIComponent(
        url.pathname
      );
    }catch{
      throw new PublicError(
        400,
        'Invalid path.'
      );
    }

    const file=resolve(
      root,
      `.${pathname==='/'?'/index.html':pathname}`
    );

    if(
      !file.startsWith(
        root.endsWith(sep)
          ? root
          : root+sep
      )
    ){
      throw new PublicError(
        403,
        'Access denied.'
      );
    }

    let info;

    try{
      info=await stat(file);
    }catch{
      throw new PublicError(
        404,
        'Page not found.'
      );
    }

    if(!info.isFile()){
      throw new PublicError(
        404,
        'Page not found.'
      );
    }

    const mime={
      '.html':'text/html; charset=utf-8',
      '.js':'text/javascript; charset=utf-8',
      '.css':'text/css; charset=utf-8',
      '.png':'image/png',
      '.jpg':'image/jpeg',
      '.svg':'image/svg+xml'
    };

    res.setHeader(
      'Content-Type',
      mime[extname(file)]||
      'application/octet-stream'
    );

    res.setHeader(
      'Cache-Control',
      'no-cache'
    );

    res.writeHead(200);

    res.end(
      req.method==='HEAD'
        ? undefined
        : await readFile(file)
    );
  }catch(e){
    const status=e.status||500;

    log(
      'REQUEST_ERROR',
      {
        status,
        path:requestPath,
        error:e.name
      }
    );

    if(res.headersSent){
      res.end();
      return;
    }

    json(
      res,
      status,
      {
        error:
          e instanceof PublicError
            ? e.message
            : 'The movie service encountered a problem. Please try again.'
      }
    );
  }
});

server.requestTimeout=100000;
server.headersTimeout=15000;

server.listen(
  port,
  '0.0.0.0',
  ()=>{
    console.log(
      `Double Feature listening on port ${server.address().port}. ${
        process.env.OPENAI_API_KEY&&
        process.env.TMDB_READ_TOKEN
          ? 'API configured.'
          : 'Offline demo available; live API keys not configured.'
      }`
    );
  }
);