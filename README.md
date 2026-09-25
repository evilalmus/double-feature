# Double Feature

A modern movie-night picker with a dark cinema palette, lime accents, keyboard-accessible autocomplete, and explanatory double-feature cards. The front end is plain HTML/CSS/JavaScript and runs on **GitHub Pages**, including repository subpaths. There is no front-end build step and no npm dependency installation is needed.

## Try the included demo

Requires Node.js 22.9+ (Node 24 also works):

```sh
npm start
```

Open **http://localhost:4173**. The default configuration is an explicitly labeled offline demo with 36 sample movies. It has all seven connection modes and locally written sample pairings; it does not contact TMDB or OpenAI. Autocomplete matches the sample catalog only. `public/` can also be served by any static HTTP server. Use HTTP rather than double-clicking `index.html`, because browser ES modules do not run reliably under `file://`.

## How it works

1. Type at least two characters, then select an autocomplete suggestion. Arrow keys, Enter and Escape work. Title and year distinguish remakes.
2. Add up to 12 distinct films. Lock the selection with **Use this movie** or **Use these movies**.
3. With one movie, choose **You choose**, **Actor**, **Director**, **Theme**, **Mood**, **Era**, or **Style**. With multiple movies, only **You choose** is enabled.
4. **Find my double features** confirms the pairing mode and generates up to five ranked pairings, each with an explanation, a 1–2 sentence promotional blurb and a suggested watch order. Runtime totals appear when available.
5. Every single-film result includes that film. Multiple-film results use only the selected films, with no self-pairings or duplicate unordered pairs. Two selected films produce one pair. For larger lists, a movie may recur across different suggestions; this is a suggestions list, not a disjoint tournament.

## Why there is a companion API

GitHub Pages serves static files. It cannot execute server code, read private runtime environment variables, or keep a key embedded into a JavaScript build secret. GitHub Actions secrets do **not** solve this if their values are baked into publicly downloadable assets.

The `server/` directory is a small dependency-free Node API that you run on an HTTPS-capable host, a VPS, a container server, or your own server behind a reverse proxy. GitHub Pages hosts only `public/`. API keys remain in the companion server's environment.

```text
Browser on GitHub Pages → your private-key companion API → TMDB / OpenAI
```

The API endpoint is publicly reachable; “private-key” describes where secrets are held, not a login requirement. Origin checks are defense in depth, not authentication. A persistent global request cap limits exposure for the anonymous public service.

## Connect the real services

### 1. Configure the companion server

Copy `.env.example` to `.env`, then set:

| Variable | What to supply |
| --- | --- |
| `OPENAI_API_KEY` | Your OpenAI project API key. |
| `TMDB_READ_TOKEN` | TMDB **API Read Access Token**, used as a Bearer token. This is separate from the shorter v3 API key. |
| `OPENAI_MODEL` | Defaults to `gpt-4.1-mini`. Change to a model your account supports that accepts Responses API strict Structured Outputs. |
| `ALLOWED_ORIGINS` | Comma-separated origins, e.g. `https://yourname.github.io,https://movies.example.com`. Do not include `/repository-name` or a trailing slash. |
| `MAX_DAILY_GENERATIONS` | Hard limit on attempted uncached OpenAI requests per UTC day; default `100`. Failed calls also count. |
| `PORT` | Default `4173`. |
| `DATA_DIR` | Persistent writable storage for pairing cache and daily counters. Default `.data`. |
| `TRUST_PROXY` | Default `0`. Set to `1` only behind a trusted proxy that overwrites `X-Forwarded-For` and prevents direct access. |

Get a TMDB token at https://www.themoviedb.org/settings/api. TMDB supplies the real movie search, identity validation, credits, release dates and posters without consuming OpenAI calls. Its API has attribution and usage terms; see https://developer.themoviedb.org/docs/faq.

Start with `npm start`, or use the included container:

```sh
docker compose up -d --build
```

Compose binds to `127.0.0.1:4173` by default. Put an HTTPS reverse proxy on the same host in front of it. A hosted Node service may instead inject environment variables directly and run `node server/index.mjs`. Persist `DATA_DIR` across deployments and run **one server process/replica**; the cache and counters are intentionally designed for one instance. For multiple instances, replace this store and in-flight coalescing with a shared transactional store/lock.

If using a reverse proxy, allow at least 100 seconds for responses, cap request bodies, and apply edge rate limiting. Forward all `/api/*` paths to this server. Configure TLS on that host. Do not expose a bare HTTP API to an HTTPS Pages site; browsers will block mixed content.

### 2. Set the public configuration

Edit `public/config.js`:

```js
window.DOUBLE_FEATURE_CONFIG = {
  apiBase: "https://your-api.example.com",
  demo: false
};
```

`apiBase` is the API origin with no `/api` suffix. For local same-origin testing with the companion server, use `apiBase: ""` and `demo: false` and keep `http://localhost:4173` in `ALLOWED_ORIGINS`.

**Never put keys in `public/config.js`, in any `public/` file, in browser storage, or in a GitHub Pages workflow.** Only the API URL and demo switch are public.

### 3. Publish the front end on GitHub Pages

1. Create a GitHub repository and upload this project's contents to its `main` branch. Include `.github/workflows/pages.yml`, but never `.env` or `.data`.
2. In the repository, open **Settings → Pages → Build and deployment → Source → GitHub Actions**.
3. Push to `main` or run **Deploy GitHub Pages** manually. The included workflow runs the checks/tests and uploads **only `public/`**.
4. GitHub provides the finished Pages URL in the workflow and repository Pages settings. Both `https://yourname.github.io/` and `https://yourname.github.io/repository-name/` work because local asset paths are relative.
5. Add that URL's **origin** to `ALLOWED_ORIGINS`, and ensure `public/config.js` points to your HTTPS companion server.

No repository or hosting account is bundled, and this package has not itself published a GitHub Pages site.

## OpenAI usage: the minimum required

| Action | OpenAI calls |
| --- | ---: |
| Typing / autocomplete / selecting / editing / choosing a type | 0 |
| Offline demo | 0 |
| New valid pairing request with eligible movies | 1 |
| All pairings, explanations, blurbs and watch order for that request | Included in that same 1 call |
| Repeated equivalent request within the shared cache lifetime | 0 |
| Simultaneous equivalent requests on this server | 1 total |
| Invalid input or no eligible candidates | 0 |

Selections are sorted for the cache key, so the same multiple-movie list in a different order reuses the result. Cache keys also include model, pairing type and prompt version. Successful answers are cached for 30 days, TMDB responses for 24 hours, with a bounded 2,500-entry persistent cache; entries can be evicted earlier when full. The open page also reuses generated results in memory. No automatic retries, per-card calls, extra summarization, or model-based autocomplete occur. If an answer fails validation, the user can retry explicitly, which may incur another call.

The server sends up to 24 verified candidates plus the selected film in one request, with `max_output_tokens: 2600`, structured output and `store: false`. A short model or smaller candidate list can reduce token costs further, but will affect quality. Set provider-side project spend controls as well as this app's request cap. The cap is a request count, not a dollar budget.

## Validation and factual grounding

- The browser accepts catalog selections, not arbitrary title text, as selected movies.
- The API independently validates IDs, count, duplicates, type, request size and JSON format. Changing browser code cannot bypass the multiple-movie rule.
- Selected movie records are fetched from TMDB before a paid request. Generated IDs must belong to the supplied candidate pool and obey the user's selected-film constraints.
- Actor uses verified shared cast, Director uses verified directing credits, and Era uses a shared **release decade**, not the period of the story. Top credited cast is used, so obscure cameos may be missed.
- Theme, Mood and Style are interpretive. The model gets overviews, genres, directors and cast, but does not browse the web. These explanations can still be imperfect; the app does not claim exhaustive discovery or guaranteed factual accuracy for generated prose.
- Adult-flagged catalog entries are excluded. This is not an age-rating or family-safety filter; ordinary catalog titles can still include mature themes.
- All external movie text and generated prose are rendered with `textContent`, never HTML. Poster URLs are restricted to TMDB or bundled assets. The page includes a Content Security Policy.
- Requests are limited to 60 searches/minute and 10 pairing submissions/10 minutes per connection address. There is also a maximum of four simultaneous distinct generation jobs and the persistent global daily cap.
- API keys are never sent to the browser or echoed into errors. Raw IPs and free-form searches are not intentionally logged; temporary salted address hashes provide rate limiting. The hosting/reverse-proxy platform may have its own access logs.
- Do not enable `TRUST_PROXY` on a directly reachable server. CORS alone cannot stop scripts or bots outside browsers.

## Checks

```sh
npm run check
npm test
```

The tests mock external services and incur no charges. They cover one-call behavior, simultaneous request coalescing, persistent cache reuse and daily caps, model refusal/errors, invalid and forged inputs, allowed-pair rules, verified shared credits, TMDB search caching, and offline demo constraints. Live credentials are required for an actual TMDB/OpenAI smoke test.

To check a deployment, visit `https://your-api.example.com/api/health`; `ready: true` means both keys are present, not that the provider has accepted them. Then search for a film on the live front end, select it, choose a mode, and generate a result. Confirm a repeat reuses the cache.

## Files

- `public/`: complete GitHub Pages site, public config, demo catalog and assets.
- `server/`: companion API, movie provider, validated generation and persistent store.
- `test/`: regression tests for paid-call and selection boundaries.
- `.github/workflows/pages.yml`: static-only Pages publication workflow.
- `.env.example`, `Dockerfile`, `compose.yaml`: server setup.
- `ASSET-CREDITS.md`: bundled poster and logo provenance.

Modern browsers are expected. Google Fonts is optional; local sans-serif fallbacks work if unavailable. In supported browsers, a read-only WebMCP tool exposes current selections without changing state or making paid calls.
