# Škoda API Proxy — Specification

Status: Draft v3 · 2026-10-24

Decisions:
- **Multiple vehicles.** Each car has its own VIN and Škoda API key. A Škoda key is always bound to exactly one VIN.
- **Self-hosted on Linux.** Plain Node.js + systemd is the primary install. Docker is optional.
- **Read-only.** No remote control.
- **Lives in this repo** under `proxy/`.
- **Each token grants access only to the single VIN it holds.**
- **No hand-rolled security.** Every security function comes from an established library or standard.
- **Backend: TypeScript (Node.js 24 LTS + Hono).**

## 1. Background

Findings from the MyŠkoda Public API (`https://public.api.connect.skoda-auto.cz`, OpenAPI 1.1.0):

| Finding | Consequence |
|---|---|
| Auth is a static `X-API-Key` header. The car owner creates and revokes it in the MyŠkoda app. Each key is bound to a single vehicle (VIN) and expires (`X-API-Key-Expires-At`). | The key can also control the car remotely, so the browser must never be able to read it. |
| A CORS preflight returns `401` with no `Access-Control-Allow-*` headers. | The PWA cannot call the API directly, so a server-side hop is required. |
| Requests are rate limited (`RateLimit-*` headers, `429` + `Retry-After`). | Cache reads and pass the rate-limit headers through. |
| The API has 12 endpoints: 1 read and 11 remote-control writes. | We expose the single read and nothing else. |

## 2. Core design: sealed vehicle tokens (JWE)

When a car is linked, the proxy **encrypts the Škoda key and its VIN into a token** and gives that token to the browser.

- **Format.** The token is a standard JWE ([RFC 7516](https://www.rfc-editor.org/rfc/rfc7516)) carrying JWT claims ([RFC 7519](https://www.rfc-editor.org/rfc/rfc7519)).
- **Library.** Tokens are created and checked with [`jose`](https://github.com/panva/jose). It is a widely used, dependency-free and spec-compliant JOSE implementation; Auth.js, among others, uses it.
- **Algorithm.** `alg: "dir"` with `enc: "A256GCM"`, using a 256-bit server secret. The browser cannot read or modify the contents. Any change fails the GCM authentication check inside `jose`.

**Claims:**

| Claim | Value |
|---|---|
| `vin` | The single VIN this token may read. It is checked against Škoda when the token is issued. |
| `key` | The Škoda API key. |
| `exp` | The Škoda key's expiry, taken from `X-API-Key-Expires-At`. |
| `iat`, `iss`, `aud` | Standard claims. `jwtDecrypt` checks `iss`, `aud` and `exp`, with a 60 s clock tolerance. |
| header `kid` | Identifies which server secret was used, so secrets can be rotated. |

**What this gives us:**
- **Each token is locked to its VIN by cryptography.** The VIN sits inside an authenticated, encrypted token. A request for any other VIN is rejected with `403` before Škoda is contacted.
- **No key store, no database and no state on disk.** There are no files to back up or protect, and no custom crypto or storage code.
- **Revocation uses the existing Škoda mechanism.** Deleting the key in the MyŠkoda app kills the token immediately. Rotating the server secret kills all tokens at once.
- **Tokens expire with the Škoda key.** No separate expiry has to be tracked.

### 2.1 Multiple cars

A Škoda key is bound to exactly one car. This gives a strict one-to-one chain:

**car profile → VIN → Škoda key → token**

- Linking a car in the car editor creates its token. The app stores the token on that car's profile.
- When the app queries a car, it uses that car's token automatically. Users never see or handle tokens.
- Adding another car means linking it in the same way. Existing tokens are not affected.
- When a key expires or is revoked, only that one car shows *Re-link*.

The proxy is **stateless and has no concept of users**. It doesn't track tokens or know that two tokens come from the same browser. Each request carries exactly one token, and that token's `vin` claim alone decides access. Keeping tokens together per user is purely a frontend concern: they live on the car profiles in browser storage.

The tokens are **encrypted**, not just signed. The browser can store and send a token, but it can't read the Škoda key inside it. Only the proxy, which holds the server secret, can decrypt it.

**Trade-off:** the token is a bearer credential stored in the browser, as any web session is. Whoever holds it can read that car's data through this proxy until the Škoda key is revoked or expires. They cannot read the Škoda key itself and cannot use the token against Škoda directly. To limit the risk, the frontend gets a strict CSP (see §7) and tokens are left out of the sync export unless the user opts in.

**Alternative considered: OIDC.** Proxy users would log in through an identity provider such as Authelia, Authentik, Keycloak or Pocket ID, using `oauth4webapi` in the PWA. The proxy would verify JWTs with `jose` and store keys per `sub`. This is the right choice if an identity provider already runs on the host. Otherwise it means running an IdP and still needing encrypted key storage, so it is not the default.

## 3. Proxy API

| Route | Auth | Purpose |
|---|---|---|
| `GET /healthz` | — | Liveness check. Makes no upstream call. |
| `POST /v1/tokens` | — (rate limited) | Body: `{ apiKey, vin }`. Details below. |
| `GET /v1/vehicles/{vin}` | `Authorization: Bearer <JWE>` ([RFC 6750](https://www.rfc-editor.org/rfc/rfc6750)) | Calls upstream `GET /api/v1/vehicles/{vin}?include=info,charging`. |

**`POST /v1/tokens`:**
- `apiKey` must be 1–512 printable ASCII characters (anything else cannot be sent as an HTTP header), otherwise the proxy returns `400` without calling Škoda.
- The proxy calls upstream `GET /api/v1/vehicles/{vin}?include=info` with the supplied key.
- If Škoda answers `401`, `403` or `404`, or reports the key as already expired, the proxy returns `422` and no token.
- Rate limited to 5/min per client and, counting only valid requests, 30/min across all clients, so the proxy cannot be used to test keys in bulk.
- Otherwise it returns `{ token, vin, expiresAt }`.
- The Škoda key is never stored or logged.

**`GET /v1/vehicles/{vin}`:**
- The path VIN must equal the token's `vin` claim, otherwise the proxy returns `403`.
- A client may narrow `include` to a subset of `info,charging` but never widen it.
- The proxy returns the JSON body plus the `RateLimit-*`, `Retry-After` and `X-API-Key-Expires-At` headers. Every other upstream header is stripped.
- Responses served from the cache carry only `X-API-Key-Expires-At`, because the rate-limit headers describe an upstream call that was not made.
- Rate limited to 60/min per client before the token is checked, and 30/min per token.

Any other route returns `404`. Errors use `application/problem+json` ([RFC 9457](https://www.rfc-editor.org/rfc/rfc9457)), the same format Škoda uses.

**Error mapping:**

| Situation | Proxy response |
|---|---|
| Invalid or expired token | `401` |
| Upstream `401` (key revoked) | `401` with `type: key-revoked`. The UI prompts the user to re-link. |
| Upstream `403` | `403` with `type: vehicle-access-denied` |
| Upstream `404` | `404` with `type: vehicle-not-found` |
| Upstream `429` | `429` with Škoda's `RateLimit-*` and `Retry-After` (`60` if Škoda sends none) |
| Upstream `5xx` or timeout | `502` |

## 4. Security building blocks (libraries, not custom code)

| Concern | Solution |
|---|---|
| Token encryption, integrity, expiry, `iss`/`aud` checks | `jose` (`EncryptJWT` / `jwtDecrypt`) |
| Server secret rotation | `jose` key selection by `kid`. Config holds the current secret plus older ones that are still accepted. |
| Request validation (VIN `^[A-HJ-NPR-Z0-9]{17}$`, body shape, `include` values) | `zod` + `@hono/zod-validator` |
| Bearer header parsing | Hono `bearerAuth` middleware with `verifyToken`, which calls `jwtDecrypt` |
| No CORS: the app calls the proxy on its own origin, so no cross-origin request is ever allowed | Browser same-origin policy; the proxy sends no `Access-Control-*` headers |
| Security headers (HSTS without `includeSubDomains`, since the proxy is served on the app's domain, which may have other sites on subdomains; `nosniff`, no-referrer, …) | `hono/secure-headers` |
| Body size limit (2 KB) | `hono/body-limit` |
| Upstream timeout (10 s), no redirects | `AbortSignal.timeout`, `redirect: 'error'` on fetch, inside the `openapi-fetch` client |
| Rate limiting: `POST /v1/tokens` 5/min per client and 30/min globally; reads 60/min per client and 30/min per token | `hono-rate-limiter` |
| Real client IP behind Apache, nginx or Caddy (`X-Forwarded-For`), trusting only the configured `TRUSTED_PROXIES`. IPv6 clients are grouped by `/64`, since one host usually controls a whole `/64`. | `proxy-addr` (the library Express uses), `ipaddr.js` |
| Structured logging: the route template (never the raw path), the masked validated VIN, status and duration. Never headers or bodies; `authorization`, `apiKey` and `x-api-key` are redacted as a safety net. | `pino` with `redact` |
| Response cache (per Škoda key, VIN and `include`; only filled after authorization) | `lru-cache` with `ttl` |
| TLS | Reverse proxy with automatic certificates: Caddy, or nginx + certbot |
| Secret delivery | systemd `LoadCredential=` (or a `0600` env file for Docker) |
| Process sandboxing | systemd hardening directives (§8) |
| Dependency vulnerabilities | `npm audit` in CI and Dependabot/Renovate |

**SSRF / open-relay protection:**
- The upstream base URL is a hard-coded constant, and the path is rebuilt from the validated VIN.
- No part of a request can influence the target host or the path shape.

## 5. Configuration

| Variable | Example | Notes |
|---|---|---|
| `HOST` | `127.0.0.1` | |
| `PORT` | `8080` | |
| `TOKEN_ISSUER` | `skoda-proxy` | |
| `TRUSTED_PROXIES` | `loopback` | `proxy-addr` syntax. Leave unset if no reverse proxy is used. |
| `TOKEN_SECRETS_FILE` | `$CREDENTIALS_DIRECTORY/token-secrets` | JSON `{ "current": "<kid>", "keys": { "<kid>": "<base64 32 bytes>" } }` |
| `CACHE_TTL_SECONDS` | `60` | Vehicle responses are cached per Škoda key, VIN and `include`. `0` disables the cache; maximum `300`, which bounds how long a revoked key can still read cached data. |
| `LOG_LEVEL` | `info` | pino level: `fatal`, `error`, `warn`, `info`, `debug`, `trace` or `silent`. |

- Config is parsed with `zod` at startup, and the proxy refuses to start on invalid config.
- `npm run proxy:secret` prints a new 32-byte secret (`crypto.randomBytes`).

## 6. Repository layout

```
proxy/
  package.json          # hono, @hono/node-server, jose, zod, @hono/zod-validator,
                        # hono-rate-limiter, proxy-addr, pino, lru-cache, openapi-fetch
  tsconfig.json         # standalone Node config; alias to ../src/types/skoda.d.ts
  src/
    index.ts            # @hono/node-server bootstrap
    app.ts              # middleware chain, /healthz, routes (exported for tests)
    config.ts           # zod-validated env/credentials
    clientIp.ts         # proxy-addr client IP, IPv6 /64 grouping
    env.ts              # Hono context typing
    logger.ts           # pino with redaction
    middleware.ts       # rate limiting and validation answering with problems
    problem.ts          # RFC 9457 responses
    schemas.ts          # VIN and include schemas
    tokens.ts           # thin wrapper over jose EncryptJWT/jwtDecrypt
    upstream.ts         # openapi-fetch client typed with generated Škoda paths
    routes/tokens.ts
    routes/vehicles.ts
  test/                 # Vitest: app.request() + MSW for upstream
  scripts/secret.ts
  Dockerfile            # optional
docs/
  skoda-proxy-spec.md
  skoda-proxy-deployment.md   # systemd, Apache, nginx, Caddy, Docker samples
```

**Build**
- `proxy:build` bundles the proxy with esbuild into `proxy/dist/index.js`.
- The bundle includes all dependencies, so the host only needs Node 24. No `npm install` or build tooling is required on the server.

**Shared types**
- The proxy reuses the generated `src/types/skoda.d.ts`, so `npm run codegen:api` keeps the proxy and the frontend in sync.

**Root integration**
- New root scripts: `proxy:dev`, `proxy:test`, `proxy:build`, `proxy:secret`.
- `npm run test` (and therefore `build`) also runs the proxy tests.
- ESLint covers `proxy/` with Node globals.

## 7. Frontend changes

**Global settings (`SkodaSection`)**
- New settings section, `src/components/settings/SkodaSection.tsx`, added to the barrel and `SettingsPane`.
- The proxy is always at `/api/skoda` on the app's own origin (`SKODA_PROXY_PATH`). Nothing is configured at build time, and users can't change it, so a link or a sync code can't point the app at another server. In dev, Vite forwards `/api/skoda` to the proxy on `localhost:8080`.
- On every load `SkodaProxyContext` checks `/api/skoda/healthz`. The Škoda UI is only shown when it answers `{"status":"ok"}`; without a proxy the web server's fallback route answers with the app page instead. Once the user has turned the connection on, the UI stays available even if the check fails (e.g. offline). The answer is kept in the persisted query cache until the next check.
- Toggle: *Use Škoda proxy*. Off by default. The proxy URL is shown read-only when it's on.
- *Test connection* button, which calls `/healthz`.
- The toggle is persisted in `SkodaProxyContext` via `useLocalStorage(LS_KEYS.SKODA_PROXY, { enabled: false })`.

**Per car (`CarsContext`, car editor)**
- New optional fields: `skoda: { vin, expiresAt, proxyUrl, token? }`. `proxyUrl` is the proxy that issued the token. A token from another proxy is never sent to the configured one; the car shows as needing a new link.
- *Link to Škoda*:
  - The user enters this car's VIN and Škoda API key.
  - The app calls `POST /v1/tokens` and stores the returned token and expiry on the car.
  - The key field is cleared once the token is issued (it stays after an error, so the user can retry), and the key is never persisted.
- Status display:
  - Linked, with expiry.
  - Expires within 14 days, shown as a warning.
  - Expired or revoked, with a re-link prompt.
- *Add Škoda car* (Settings → Cars): the user enters a VIN and API key. The app issues a token, reads the car's name with it, and opens the car form with the name filled in. Battery size and charging power aren't available from the Škoda API, so the user fills those in. The token is only stored when the car is saved; if the user cancels, the issued token is simply never used. If the car's name can't be read, the token is kept and the name is left empty. If the token can't be stored, the car isn't added.
- *Unlink* removes `skoda` from the car. The status text should tell users to also delete the key in the MyŠkoda app to fully revoke access.

**Data**
- New API client `src/api/skodaApi.ts`. Responses are checked before use: an issued token must be for the requested VIN and have an expiry, and vehicle data must be for the requested VIN. Anything else is an `invalid-response` error. Its `baseUrl` is the proxy URL, `https://<app origin>/api/skoda`.
- New hook `useSkodaVehicleQuery(car)`:
  - Uses TanStack Query with a `staleTime` of 60 s.
  - Is disabled when the proxy is off or the car isn't linked.
- When the selected car is linked, the input form pre-fills start % from the current state of charge and target % from the charge limit, once per selected car. Later refreshes don't overwrite what the user typed. If the car is already at its charge limit, the form says so while the vehicle data is shown.

**Sync and PWA**
- **Sync links** (`#sync=…`) are read on load and when the hash changes in an open tab. The hash is removed from the address bar and history right away, also when it can't be imported.
- **Sync/QR export:** the VIN, expiry and proxy URL are included. The token is excluded by default, and a plain token is never exported or imported. See *Sync with Škoda access* in §7.1 for the opt-in.
- **Imported sync data is size-limited** before it is parsed: at most 20,000 characters encoded, 64 KB decompressed and 50 cars. If the data doesn't fit in a QR code, the app says so and offers the link or code instead.
- **PWA:** no Workbox runtime cache for proxy URLs, and the service worker's navigation fallback skips `/api/`.
- **CSP:** add a strict Content-Security-Policy to `index.html` and the host config: `default-src 'self'`, `connect-src` limited to `'self'` (which covers the proxy) and stromligning.dk, and no inline scripts. This reduces XSS token theft.

**When the proxy is off:** no Škoda UI is shown and no requests are made.

### 7.1 Optional: password-protected token storage

By default, tokens are stored in plain form on the car profiles in `localStorage`. The user can turn on **Protect Škoda access with a password** in the Škoda settings section. It is off by default. The settings text should explain when to use it:

- **Shared or family computer:** recommended.
- **Personal phone with screen lock:** optional. The device lock already guards the browser profile.

**Building blocks (no custom crypto).** Browsers don't offer web pages a password-protected vault. The standard building blocks are the Web Crypto API and the JOSE standards, so the app reuses `jose`, the same library the proxy uses:

| Concern | Solution |
|---|---|
| Password-based encryption | JWE with `alg: "PBES2-HS512+A256KW"` and `enc: "A256GCM"` ([RFC 7518 §4.8](https://www.rfc-editor.org/rfc/rfc7518#section-4.8)), via `jose` `CompactEncrypt` / `compactDecrypt`. |
| Key derivation | PBKDF2-HMAC-SHA512, done by the browser's native Web Crypto API. Uses `p2c` = 210,000 iterations, OWASP's 2023+ recommendation for PBKDF2-SHA512, and a random salt (`p2s`) per encryption, generated by `jose`. Decryption must pass `maxPBES2Count: 210_000`, because `jose` rejects more than 10,000 iterations by default as a DoS guard. Because of the iteration count, unlocking takes about 0.2–0.5 s on a phone. |
| Wrong password / tampering | Detected by AES key unwrapping and the GCM authentication tag. `compactDecrypt` throws, and the UI shows "Wrong password". |
| Randomness | `crypto.getRandomValues`, via `jose` |

**Storage model**
- When protection is on, tokens are removed from the car profiles and stored in one vault, `LS_KEYS.SKODA_VAULT`, using `useLocalStorage`.
- The vault is a single compact-JWE string. Its plaintext is `{ [carId]: { vin, token } }`.
- The car profiles keep only the non-secret `vin` and `expiresAt`, so the link status and expiry warnings still show while the vault is locked.
- Decrypted tokens exist **only in memory** in `SkodaVaultContext`. They are never written back to storage.
- While the vault is unlocked, the password is kept in memory as well, so that linking, unlinking, adding a car and importing access don't ask for it again. It is cleared together with the tokens on every lock, manual or automatic. This is a deliberate trade-off: an attacker who can read the page's memory while it is unlocked can already read the tokens, which is what the password protects.
- All changes to the vault run one after another, each starting from the latest stored vault. Where a new token goes (vault or car profile) is decided when it is stored, not when the request that issued it started. A plain token that appears on a car while protection is on, e.g. stored by another tab, is moved into the vault on the next unlock.
- If the password was changed in another tab, the next change in this tab fails to decrypt the vault. The vault then locks, and the user unlocks it with the new password.

**Behaviour**

| Action | Behaviour |
|---|---|
| Turn on | The user chooses a password: at least 10 characters, entered twice. The plain tokens are moved into the vault and deleted from the car profiles. |
| Unlock | Asked for lazily, the first time Škoda data is needed (a linked car is selected), with a *Skip* option. Until the vault is unlocked, the planner works as if the car weren't linked. |
| Auto-lock | Clears the in-memory tokens after 15 minutes of inactivity, after the tab has been hidden for 15 minutes, and on manual *Lock*. The timeout is configurable: 5, 15, 60 minutes, or *until tab is closed*. |
| Link, re-link, unlink or add a car | Needs the vault to be unlocked: the form asks for the password first if it is locked. The API key is only sent after that. Locking while the form is open discards it, including a token issued for a car that isn't added yet. |
| Change password | Asks for the current and the new password, then decrypts and re-encrypts the vault. |
| Import Škoda access | Needs the vault to be unlocked, like linking. |
| Turn off | Requires the password. The tokens move back to plain storage on the car profiles. |
| Forgot password | *Reset vault* deletes it, and the user re-links their cars with their Škoda keys. Nothing can be recovered on the server, and nothing is compromised. |
| Sync/QR export with *Include Škoda access* | See *Sync with Škoda access* below. If the vault is locked, the export asks to unlock it first. |

**Sync with Škoda access**
- Ticking *Include Škoda access* generates a random **export code** of 24 characters (120 bits from `crypto.getRandomValues`, written in Crockford base32 as 6 groups of 4). It is hidden behind a *Show export code* button, so that it isn't on screen together with the QR code, e.g. in a screenshot. A new code is hidden again.
- Each car's `{ vin, token }` is sealed as its own PBES2 JWE with the export code as the password, with the same `jose` algorithms as the vault. The sync data only carries the sealed token, so the link or QR code alone gives no access.
- Export codes use `p2c` = 10,000. A random 120-bit code can't be guessed, so slow key derivation adds nothing for it. This is also `jose`'s default limit, so the importing device opens it with `maxPBES2Count: 10_000` and a crafted export with a huge iteration count is rejected instead of keeping the browser busy.
- While the access is being sealed, or if sealing fails or the vault must be unlocked first, the sync link, QR code and text code are hidden. An export without the access the user asked for can't be shared by mistake.
- The importing device asks for the export code. If protection is on there, its vault must be unlocked first. The code is typed in, so case, spaces and dashes don't matter, and I, L and O are read as 1, 1 and 0.
- A sealed token only opens for the VIN it was sealed with. A wrong code, or a token moved to another car, is rejected as a wrong export code.
- The user can skip this step. The cars are then imported without access, and show as needing a new link.
- Send the code a different way than the link, or read it out, so that someone who sees one doesn't also get the other.

**What it protects against, and what it doesn't**
- **It protects against:** someone else reading the stored tokens from the browser profile, e.g. on a shared computer, from a copied profile or disk, or with dev tools while the vault is locked. Offline brute force is slowed by PBKDF2, but a weak password is still guessable. That is why there is a minimum length.
- **It doesn't protect against:** XSS, malicious extensions or a compromised device *while the vault is unlocked*. The CSP from §7 and the auto-lock are the defences there.
- **Revoking access is unchanged:** delete the key in the MyŠkoda app.

## 8. Deployment (Linux, no Docker required)

The step-by-step guide and config samples are in [skoda-proxy-deployment.md](skoda-proxy-deployment.md).

| Component | Primary option | Alternatives |
|---|---|---|
| Runtime | Node 24 LTS + systemd unit with sandboxing directives | Docker (optional) |
| Reverse proxy / TLS | The app's web server: Apache (`mod_proxy_http`) | nginx, Caddy |
| Mounting | `/api/skoda/` on the app's own site, with the prefix stripped before the proxy | None. The app only looks for the proxy there. |

**Rules for every reverse proxy:**
- Forward-proxy mode must be off. In Apache this means `ProxyRequests Off`.
- Forward the `Authorization` header unchanged.
- The app's fallback route (`index.html` for unknown paths) must not catch `/api/`.
- Don't add CORS headers for `/api/skoda/`.
- Set `X-Forwarded-For` and set `TRUSTED_PROXIES` to match.

## 9. Testing

**Proxy**
- Token round-trip.
- Tampered, expired, wrong-`aud` and unknown-`kid` tokens are rejected. These tests check our `jose` configuration, not `jose` itself.
- A VIN outside the token gives `403`, and Škoda is never called.
- `include` cannot be widened.
- Issuance fails if the key isn't valid for the VIN upstream, or has already expired.
- No CORS headers for other origins, rate limits (including IPv6 `/64` grouping and the global issuance cap), header stripping, and error mapping.
- The cache is separate per Škoda key, and cache hits do not replay rate-limit headers.
- Upstream redirects are never followed.
- Captured `pino` output never contains the key, the token or a full VIN, even for malformed paths.

**Frontend**
- MSW handlers for `/v1/tokens` and `/v1/vehicles/{vin}`.
- Unit tests for `SkodaProxyContext`, `skodaApi` and the link/unlink flow.
- Vault:
  - Encrypt and decrypt round-trip.
  - A wrong password is rejected.
  - A tampered vault is rejected.
  - With protection on, no plain token is left in `localStorage` (check every key).
  - Auto-lock clears the in-memory tokens. Use fake timers.
  - Change password, and turning protection off, both work.
  - Vault changes that run at the same time don't overwrite each other, and locking during an unlock keeps the vault locked.
  - While unlocked, changes don't need the password again; after a lock they fail until the vault is unlocked.
  - Linking while locked sends no request. A car added from a lookup isn't kept if its token can't be stored.
  - A plain token on a car is moved into the unlocked vault.
- Export codes: format, normalisation, round-trip, rejection of a wrong code or another VIN, and `p2c` = 10,000 with higher counts refused.
- Export state: nothing included until opted in, a new code each time, waiting for unlock, and a sealing failure.
- Sync data: size limits, plain tokens dropped, and import with an export code into a protected and an unprotected device.

**E2E**
- Link a car and check that the state of charge is pre-filled.
- With the proxy disabled, check that no proxy requests are made.
- Check that the sync export excludes the token unless the user opts in, and that importing with the export code restores access.
- Add a car from its VIN and API key, and check that its name is filled in from Škoda.
- With the vault locked, adding a car asks to unlock first and then not again.
- The About dialog shows the installed version.
- Turn on password protection, reload, unlock, and check the data loads. A wrong password shows an error. *Lock* hides the Škoda data again.

## 10. Future work (out of scope)

- Remote-control writes and automatic start in the cheapest charging window. This needs server-side scheduling, so the design would move to a key store or OIDC.
- A `jti` denylist, if revoking a single token without touching the Škoda key becomes necessary.
- **Passkey unlock** for the vault using the WebAuthn `prf` extension (Face ID, fingerprint or device PIN instead of a password). It is supported in current Chrome, Safari and Android browsers, but not yet everywhere. It would derive the vault key from the passkey and could sit alongside password unlock.
