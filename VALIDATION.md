# Validation record

Verified on September 25, 2026.

- `npm run check`: passed JavaScript syntax checks.
- `npm test`: all 18 tests passed. External services were mocked; no paid requests were made.
- Browser: autocomplete suggestions appeared, Arrow Down + Enter added a movie, selection locking enabled pairing types, and Director produced cards with film metadata, explanations, blurbs and watch order.
- Browser: adding a second film disabled Actor and the other specific categories, kept You choose enabled, and returned exactly one pairing using only those two selected films.
- Responsive check: rendered in a 390px-wide iframe viewport, verified the stacked layout, selected Inception and generated five sample pairings. This checked the CSS layout, not physical-device behavior.
- Real HTTP integration test: private source/environment paths are not served; disallowed origins, missing origin, invalid input, oversized requests and malformed JSON are rejected. Allowed-origin preflight succeeds. Missing API credentials return a controlled error.
- Bundled HTML asset references were checked and resolve. Public files contain no private environment assignments.
- The optional read-only WebMCP registration is feature-detected. The test browser did not expose `document.modelContext`, so runtime WebMCP validation was unavailable; normal browser interaction does not depend on it.

## Still requires deployment credentials

Real TMDB autocomplete, real OpenAI generation, your host's HTTPS/CORS configuration, and a GitHub Pages publication must be smoke-tested with your accounts and environment variables. The bundled default is a clearly labeled offline demo, not a live AI result. The API integration was tested against mocked responses rather than billed requests.
