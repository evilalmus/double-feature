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

## Hosting overview

The front end and back end can be hosted independently. Choose one front-end option, then configure the back end. The Unraid examples use a user-defined Docker bridge network named `g33kdock` and Nginx Proxy Manager (NPM) for HTTPS. Replace the network and example domains with your own values.

| Component | Purpose | Hosting choices |
| --- | --- | --- |
| Front end | Serves `public/`, including the movie picker and public API URL | GitHub Pages or an Unraid NGINX container |
| Back end | Holds API keys, queries TMDB/OpenAI, validates results and stores cache/usage counters | Unraid Node container built from the included `Dockerfile` |

For example, the front end can be `https://movies.example.com` or `https://yourname.github.io/double-feature/`, while the back end is `https://movies-api.example.com`. These domains are examples; substitute real DNS names that point to your reverse proxy. Public HTTPS traffic must reach your reverse proxy through your existing inbound routing. Expose the application through that proxy, not through the Unraid administration interface.

### Prepare the project on Unraid

Skip this preparation if you are not using Unraid. You do not need to install Node.js, npm, or a Docker Compose plugin on Unraid for the commands below.

1. Enable Docker in Unraid if it is not already enabled.
2. Extract the ZIP and copy the **contents of its `double-feature` folder** into `/mnt/user/appdata/double-feature/source`. The resulting paths must include `source/Dockerfile`, `source/package.json`, and `source/public/index.html`, without an extra nested `double-feature` directory.
3. Open Unraid's terminal. Check that the Docker network exists:

```sh
docker network inspect g33kdock
```

If that reports that the network does not exist, create it once:

```sh
docker network create g33kdock
```

The application containers and NPM must join this same user-defined bridge network to use the container-name upstreams below. This is a Docker bridge network, not a `br0` macvlan/ipvlan network with separate LAN addresses. If your proxy uses a different setup, use the documented host-port alternative for the front end or adapt the backend networking deliberately.

| Unraid path | Contents |
| --- | --- |
| `/mnt/user/appdata/double-feature/source` | Extracted project and Docker build context |
| `/mnt/user/appdata/double-feature/source/public` | Public front-end files only |
| `/mnt/user/appdata/double-feature/backend.env` | Private backend environment variables |
| `/mnt/user/appdata/double-feature/data` | Persistent pairing cache and daily request counters |

Keep the private environment file and data directory **outside `public/`**. Store this appdata on a suitable persistent pool/share and include it in your backups.

## Front end: configuration and hosting

### 1. Configure the browser's API address

Edit `public/config.js` in the extracted project, or `/mnt/user/appdata/double-feature/source/public/config.js` on Unraid:

```js
window.DOUBLE_FEATURE_CONFIG = {
  apiBase: "https://movies-api.example.com",
  demo: false
};
```

Use the back end's **browser-reachable HTTPS origin**, with no `/api` suffix or repository path. Do not use `http://double-feature-api:4173` here: that Docker name is for the reverse proxy, not the user's browser. The API is allowed to use HTTP inside the Docker network while the browser uses HTTPS through NPM.

Leave `demo: true` while trying the offline demo without API keys. Set it to `false` when the back end is ready. There is **no front-end compilation or npm build**: `public/` is already the complete static site.

**Never put API keys in `public/config.js`, in any `public/` file, in browser storage, or in a GitHub Pages workflow.** Only the API URL and demo switch are public. Changes to public configuration take effect after publishing/copying the file and refreshing the browser; a hard refresh may be needed to discard a cached copy.

### 2A. Host the front end on GitHub Pages

Choose this option to retain the original GitHub Pages deployment. The back end can still run on Unraid.

1. Create a GitHub repository and upload the project's contents to its `main` branch. Include `.github/workflows/pages.yml`, but never private environment files or runtime data.
2. In the repository, open **Settings → Pages → Build and deployment → Source → GitHub Actions**.
3. Push to `main` or run **Deploy GitHub Pages** manually. The included workflow runs the checks/tests and uploads **only `public/`**.
4. GitHub provides the finished Pages URL in the workflow and repository Pages settings. Both `https://yourname.github.io/` and `https://yourname.github.io/repository-name/` work because local asset paths are relative.
5. In the backend configuration below, include `https://yourname.github.io` in `ALLOWED_ORIGINS`, **without the repository path**. If you use a custom Pages domain, allow that origin instead (or both if both are in use).

No front-end container is needed on Unraid for this option. No GitHub repository or hosting account is bundled, and this package has not itself published a GitHub Pages site.

### 2B. Host the front end on Unraid

Choose this option to serve the site from Unraid in its own container. It uses the prebuilt NGINX unprivileged image, which listens on container port `8080`; no custom front-end image build is required. This container receives **no API keys**.

Ensure the public files are readable by the web server. These commands affect only the public website directory:

```sh
find /mnt/user/appdata/double-feature/source/public -type d -exec chmod 755 {} \;
find /mnt/user/appdata/double-feature/source/public -type f -exec chmod 644 {} \;
docker pull nginxinc/nginx-unprivileged:stable-alpine
docker run -d \
  --name double-feature-web \
  --network g33kdock \
  --restart unless-stopped \
  -p 8088:8080 \
  -v /mnt/user/appdata/double-feature/source/public:/usr/share/nginx/html:ro \
  nginxinc/nginx-unprivileged:stable-alpine
```

Open `http://UNRAID-LAN-IP:8088` to inspect the front end. Choose a different unused host port if `8088` is occupied; the container port remains `8080`. The image uses its own non-root account; the read-only public directory does not need UID `99`. Do not add `PUID`/`PGID` variables to this image.

For HTTPS, add this Proxy Host in NPM:

| NPM field | Value |
| --- | --- |
| Domain Names | `movies.example.com` |
| Scheme | `http` |
| Forward Hostname / IP | `double-feature-web` |
| Forward Port | `8080` |
| SSL | Select/request a valid certificate for the domain and enable Force SSL |

If NPM is not on `g33kdock`, it can instead forward to your Unraid LAN IP at host port `8088`, provided your network permits it. `127.0.0.1` inside the NPM container refers to NPM itself, not Unraid. Once NPM uses the shared Docker network, the `-p 8088:8080` mapping can be omitted when recreating the container if you no longer want direct LAN access.

Add `https://movies.example.com` to the backend's `ALLOWED_ORIGINS`. For live testing through `http://UNRAID-LAN-IP:8088`, also allow that exact LAN origin including its port. The front-end container serves only files; it does not forward `/api` requests, so keep `apiBase` set to the separate API origin.

#### Front-end Unraid Docker-tab alternative

Use **Docker → Add Container** instead of the `docker run` command if you want Unraid to save and manage a template. Choose one creation method, not both for the same container name.

| Setting | Value |
| --- | --- |
| Name | `double-feature-web` |
| Repository | `nginxinc/nginx-unprivileged:stable-alpine` |
| Network Type | `Custom: g33kdock` (or the matching user-defined network) |
| TCP port mapping | Host `8088` → Container `8080` |
| Path mapping | Host `/mnt/user/appdata/double-feature/source/public` → Container `/usr/share/nginx/html`, **Read Only** |
| Privileged | Off |

Apply the template and enable Autostart on the Docker page if desired. A container created only through the terminal does not automatically provide a saved Unraid user template.

### 3. Update the front end

For GitHub Pages, commit the updated files and let the workflow republish. For the Unraid container, update the files in the mounted `public/` directory and refresh the browser; no application image rebuild is needed. Keep your configured API URL when replacing `config.js` from a new archive. Updating the NGINX base image itself requires pulling the image and recreating the web container, or using Unraid's saved template update flow.

## Back end: build and host on Unraid

Complete this section whether the front end is on GitHub Pages or Unraid. The supplied Dockerfile packages the Node application; there is no TypeScript compilation or dependency installation. The API container also contains a copy of the static site for convenience, but the separate front-end setup above does not depend on that copy.

### 1. Create the private environment and persistent storage

For a new installation, copy the example environment file outside the source/build directory. If `backend.env` already exists, edit it instead of replacing it:

```sh
cp /mnt/user/appdata/double-feature/source/.env.example /mnt/user/appdata/double-feature/backend.env
chmod 600 /mnt/user/appdata/double-feature/backend.env
mkdir -p /mnt/user/appdata/double-feature/data
chown -R 99:100 /mnt/user/appdata/double-feature/data
chmod 750 /mnt/user/appdata/double-feature/data
```

Edit `backend.env` with your preferred text editor and set the following values. The Docker daemon reads this private file at container creation; it does not need to be mounted into the container.

| Variable | What to supply |
| --- | --- |
| `OPENAI_API_KEY` | Your OpenAI project API key. |
| `TMDB_READ_TOKEN` | TMDB **API Read Access Token**, used as a Bearer token. This is separate from the shorter v3 API key. |
| `OPENAI_MODEL` | Defaults to `gpt-4.1-mini`. Use a model your account supports that accepts Responses API strict Structured Outputs. |
| `ALLOWED_ORIGINS` | Exact front-end origins, comma-separated, e.g. `https://yourname.github.io,https://movies.example.com`. No repository path, trailing slash, or wildcard. Add a LAN origin only if testing through it. |
| `MAX_DAILY_GENERATIONS` | Hard limit on attempted uncached OpenAI requests per UTC day; default `100`. Failed calls count. |
| `PORT` | `4173` inside the API container. |
| `DATA_DIR` | **`/data`** for the Unraid bind mount below; change the example file's `.data` value. |
| `TRUST_PROXY` | Keep `0` initially. See the proxy note below before changing it. |

Get a TMDB token at [TMDB API settings](https://www.themoviedb.org/settings/api). TMDB supplies movie search, identity validation, credits, release dates and posters without consuming OpenAI calls. See its [attribution and usage requirements](https://developer.themoviedb.org/docs/faq).

### 2. Build the backend image

Run from the extracted project directory, where the included `Dockerfile` is located:

```sh
cd /mnt/user/appdata/double-feature/source
docker build --pull -t double-feature-api:local .
```

This builds an image locally on Unraid. `double-feature-api:local` is a local tag, not an image published to Docker Hub. There is no need to install Node/npm on the Unraid host. The existing `.dockerignore` excludes standard `.env` files; keeping `backend.env` outside the build context additionally prevents that differently named secret file from entering a build.

### 3. Run the backend container

```sh
docker run -d \
  --name double-feature-api \
  --network g33kdock \
  --restart unless-stopped \
  --user 99:100 \
  --env-file /mnt/user/appdata/double-feature/backend.env \
  -v /mnt/user/appdata/double-feature/data:/data \
  double-feature-api:local
```

The `--user 99:100` override runs the API as Unraid's usual `nobody:users` IDs. The `/data` bind mount must be writable by those IDs. This image does not interpret `PUID`/`PGID` variables, so use the Docker user override. Leave Privileged mode off.

No host port is published in this example: NPM reaches `double-feature-api:4173` over `g33kdock`. To keep this layout, place NPM on that network too. The app needs outbound access to TMDB and OpenAI over HTTPS.

Check startup and the health endpoint without exposing a host port:

```sh
docker logs --tail 50 double-feature-api
docker exec double-feature-api node -e 'fetch("http://127.0.0.1:4173/api/health").then(r=>r.json()).then(console.log)'
```

`ready: true` means both keys are present, not that either provider has accepted them. A real search/generation is still required to validate the credentials.

#### Backend Unraid Docker-tab alternative

After building the local image, you can use **Docker → Add Container** instead of `docker run` to save a template:

| Setting | Value |
| --- | --- |
| Name | `double-feature-api` |
| Repository | `double-feature-api:local` |
| Network Type | `Custom: g33kdock` |
| Extra Parameters (Advanced View) | `--user=99:100 --env-file=/mnt/user/appdata/double-feature/backend.env` |
| Path mapping | Host `/mnt/user/appdata/double-feature/data` → Container `/data`, **Read/Write** |
| Port mapping | None when NPM uses the same Docker network |
| Privileged | Off |

Do not enable a forced registry pull for this local image. If a management tool insists on pulling it, use the terminal command instead. Rebuild locally for application updates; a registry-based auto-updater cannot build this project's source. Enable Autostart in Unraid if using its template management.

### 4. Publish the backend through Nginx Proxy Manager

Create the API Proxy Host separately from the front-end Proxy Host:

| NPM field | Value |
| --- | --- |
| Domain Names | `movies-api.example.com` |
| Scheme | `http` |
| Forward Hostname / IP | `double-feature-api` |
| Forward Port | `4173` |
| SSL | Select/request a valid certificate for the API domain and enable Force SSL |

Forward the URL path unchanged, including `/api/search`, `/api/pairings`, and `/api/health`. In NPM's Advanced configuration, allow enough time for a generation:

```nginx
proxy_read_timeout 100s;
proxy_send_timeout 100s;
```

Ensure any additional upstream proxy/tunnel has a compatible timeout. Do not add a second set of CORS response headers in NPM: the Node service already returns the allowed origin. The static front end does not provide credentials for a separate proxy login, so an API access list requiring HTTP Basic Authentication would block the current browser flow.

With `TRUST_PROXY=0`, clients arriving through the same reverse proxy share the API's per-address request bucket. This conservative default works, but a busy public site may need per-client limiting at the proxy. Set `TRUST_PROXY=1` only after configuring a trusted proxy to **overwrite** `X-Forwarded-For` with a verified client address and ensuring untrusted clients cannot reach the API directly. The application reads the first forwarded address; merely appending to a client-supplied header is not sufficient. The persistent global daily cap applies either way.

### 5. Verify the front end and back end together

1. Open `https://movies-api.example.com/api/health`; expect `{"ready":true}`.
2. Open the chosen front-end URL. Confirm `config.js` has the API HTTPS origin and `demo: false`.
3. Search for a movie, select it, lock it in and generate pairings. This performs a real OpenAI request if uncached.
4. Repeat the same request. The app/server should reuse the cached answer. In browser developer tools, a server cache hit returns `cached: true`; an in-page cache hit may make no network request at all.
5. Add another film, lock the list, and confirm only **You choose** is enabled and all results use those selected films.

### 6. Update, restart and back up the backend

A restart reuses the existing container environment and image. If you change `backend.env` or rebuild the image, **recreate** the container to apply the changes. With a saved Unraid template, use its edit/apply recreation flow after rebuilding. With the terminal setup:

```sh
cd /mnt/user/appdata/double-feature/source
docker build --pull -t double-feature-api:local .
docker stop double-feature-api
docker rm double-feature-api
```

Then run the same `docker run` command from step 3. These commands remove only this API container; its host-mounted `data` directory remains. Keep the existing environment file when updating source files from another ZIP.

Back up `backend.env` securely and back up the `data` directory, preferably while the API is stopped for a consistent copy. Retain the source or a repository checkout so you can rebuild the local image. Deleting the data directory loses cached results and resets the app's persisted daily usage counter. Run **one backend process/replica**; the on-disk store and in-flight request coalescing are designed for one instance. Multiple instances require a shared transactional store and lock.

The bundled `compose.yaml` is a separate generic deployment option. It uses a named volume and a loopback-bound host port, and does **not** reproduce the Unraid paths/network/user configuration above. Do not start it alongside these instructions under the assumption it manages the same API. A containerized NPM cannot reach another container through NPM's own `127.0.0.1` address.

### Unraid troubleshooting

| Symptom | Check |
| --- | --- |
| API exits with `EACCES` or cannot read/write its cache | `DATA_DIR=/data`, the bind mount exists, and the directory/files are owned by `99:100`. |
| Front end loads but stays in the sample catalog | Set `demo: false` in the served `public/config.js` and refresh. |
| CORS or “website not allowed” error | `ALLOWED_ORIGINS` matches the browser's scheme, hostname and port exactly; omit repository paths. Recreate the API container after editing its environment file. |
| HTTPS page cannot contact API | `apiBase` uses public HTTPS, the certificate is valid, and it is not a Docker-only hostname or private URL inaccessible to visitors. |
| NPM returns 502 | Both containers share the bridge network; use API port `4173` or web container port `8080`, not the web host port `8088` when using container names. |
| API rate limit affects several visitors at once | With `TRUST_PROXY=0`, NPM clients share a bucket. Review the proxy trust note rather than blindly enabling forwarded-header trust. |
| API reports “not configured” or `ready: false` | Environment values were set on the backend, and the container was recreated after changing them. |
| Unraid cannot pull `double-feature-api:local` | Build it on this Unraid server first and avoid forced pulls; it is a locally built image. |
| An update appears ineffective | Rebuild/recreate the backend for server code changes; update the mounted `public/` files or republish Pages for front-end changes. |

### Deployment references

- [Unraid: managing and customizing containers](https://docs.unraid.net/unraid-os/using-unraid-to/run-docker-containers/managing-and-customizing-containers/)
- [Docker: running containers, user overrides and mounts](https://docs.docker.com/engine/containers/run/)
- [NGINX unprivileged image and its port configuration](https://github.com/nginx/docker-nginx-unprivileged)
- [Nginx Proxy Manager: shared Docker networks](https://nginxproxymanager.com/advanced-config/)

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
