# Škoda Proxy — Deployment Guide (Linux)

How to run the Škoda proxy on a Linux host. The design is described in [skoda-proxy-spec.md](skoda-proxy-spec.md).

**Docker is not required.** The primary setup is Node.js + systemd behind the web server that serves the app. Apache, nginx and Caddy are all covered below. Docker is an optional alternative.

```
Browser ──HTTPS──▶ Apache / nginx / Caddy ──┬── /api/skoda/* ──http://127.0.0.1:8080/*──▶ skoda-proxy (Node, systemd) ──HTTPS──▶ MyŠkoda API
                   (serves the app)         └── everything else ──▶ the app's static files
```

The app always calls the proxy at `/api/skoda` on its own origin, e.g. `https://ev.example.com/api/skoda`. Nothing is configured in the app: on every load it checks `/api/skoda/healthz` and only shows the Škoda connection when the proxy answers. Deploy the app without the proxy and the Škoda connection is simply hidden.

## 1. Prerequisites

- **Node.js 24 LTS**, from your distro or NodeSource. Check with `node --version`.
- **The web server that serves the app**, with TLS: Apache 2.4.30+, nginx, or Caddy. The proxy is mounted on the same site, so it needs no DNS name or certificate of its own.
- **systemd 250+**, which is needed for `LoadCredential=`. Debian 12, Ubuntu 22.04+ and RHEL 9 all qualify.

## 2. Install the proxy

Build on any machine with the repo checked out:

```bash
npm ci
npm run proxy:build          # produces proxy/dist/index.js (single self-contained bundle)
```

Copy the build to the server:

```bash
sudo mkdir -p /opt/skoda-proxy
sudo cp -r proxy/dist /opt/skoda-proxy/
```

The bundle includes all its dependencies. The server only needs `node`, with no `npm install`.

## 3. Configure and run with systemd

### 3.1 Token secret

The token secret is the encryption key for vehicle tokens. Generate it with standard tooling:

```bash
sudo mkdir -p /etc/skoda-proxy
sudo sh -c 'umask 077; printf "{\"current\":\"k1\",\"keys\":{\"k1\":\"%s\"}}\n" "$(openssl rand -base64 32)" > /etc/skoda-proxy/token-secrets'
sudo chown root:root /etc/skoda-proxy/token-secrets
sudo chmod 600 /etc/skoda-proxy/token-secrets
```

Keep a backup of this file somewhere safe. If it is lost, every user has to re-link their cars, but no Škoda keys are compromised.

### 3.2 Environment

`/etc/skoda-proxy/env`:

```ini
HOST=127.0.0.1
PORT=8080
TOKEN_ISSUER=skoda-proxy
# Reverse proxy on the same host → trust loopback for X-Forwarded-For
TRUSTED_PROXIES=loopback
# Optional: seconds to cache vehicle responses (0 disables), and pino log level
#CACHE_TTL_SECONDS=60   (maximum 300)
#LOG_LEVEL=info
```

When `TOKEN_SECRETS_FILE` is not set, the proxy reads `$CREDENTIALS_DIRECTORY/token-secrets`. systemd provides that path through `LoadCredential=` below.

### 3.3 Unit file

`/etc/systemd/system/skoda-proxy.service`:

```ini
[Unit]
Description=Škoda API proxy for EV Charging Planner
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=/usr/bin/node /opt/skoda-proxy/dist/index.js
EnvironmentFile=/etc/skoda-proxy/env
LoadCredential=token-secrets:/etc/skoda-proxy/token-secrets
Restart=on-failure
RestartSec=5

# Sandboxing (standard systemd directives; see systemd.exec(5))
DynamicUser=yes
NoNewPrivileges=yes
ProtectSystem=strict
ProtectHome=yes
PrivateTmp=yes
PrivateDevices=yes
ProtectKernelTunables=yes
ProtectKernelModules=yes
ProtectKernelLogs=yes
ProtectControlGroups=yes
ProtectClock=yes
ProtectHostname=yes
ProtectProc=invisible
RestrictAddressFamilies=AF_INET AF_INET6 AF_UNIX
RestrictNamespaces=yes
RestrictRealtime=yes
RestrictSUIDSGID=yes
LockPersonality=yes
SystemCallArchitectures=native
SystemCallFilter=@system-service
CapabilityBoundingSet=
PrivateUsers=yes
UMask=0077
MemoryMax=256M
# Node's V8 JIT needs writable+executable memory, so MemoryDenyWriteExecute stays off.

[Install]
WantedBy=multi-user.target
```

Enable the service and check it:

```bash
sudo systemctl daemon-reload
sudo systemctl enable --now skoda-proxy
systemd-analyze security skoda-proxy     # exposure score; should be well under 2.0
curl -s http://127.0.0.1:8080/healthz
journalctl -u skoda-proxy -f             # pino JSON logs; secrets are redacted
```

## 4. Reverse proxy: Apache

### 4.1 Modules

Debian / Ubuntu:

```bash
sudo a2enmod proxy proxy_http headers
sudo systemctl restart apache2
```

RHEL / Rocky / Alma:

```bash
sudo dnf install httpd
# SELinux: allow Apache to connect to the local proxy port
sudo setsebool -P httpd_can_network_connect 1
```

### 4.2 Mount the proxy at `/api/skoda/`

Add the following inside the app's existing `<VirtualHost *:443>`:

```apache
# Reverse proxy only. NEVER enable forward proxying.
ProxyRequests Off

<Location "/api/skoda/">
    # The trailing slashes strip the /api/skoda prefix: /api/skoda/healthz → /healthz
    ProxyPass        "http://127.0.0.1:8080/" connectiontimeout=5 timeout=15
    ProxyPassReverse "http://127.0.0.1:8080/"
    # mod_proxy_http adds X-Forwarded-For / -Host / -Server automatically.
    RequestHeader set X-Forwarded-Proto "https"
    # Requests are tiny; reject anything large before it reaches Node
    LimitRequestBody 4096
</Location>
```

**The app's fallback route must not catch `/api/`.** A single-page app usually sends every unknown path to `index.html`. `FallbackResource /index.html` leaves proxied paths alone, but a mod_rewrite fallback needs an exception:

```apache
RewriteEngine On
RewriteCond %{REQUEST_URI} !^/api/
RewriteCond %{REQUEST_FILENAME} !-f
RewriteRule ^ /index.html [L]
```

Do not add CORS (`Access-Control-*`) headers for the proxy: the app and the proxy share an origin, so the browser never needs them. The default `combined` log format does not log the `Authorization` header; keep it that way.

Reload Apache:

```bash
sudo apachectl configtest
sudo systemctl reload apache2      # or httpd
```

## 5. Reverse proxy: nginx (alternative)

Add this to the app's existing `server` block:

```nginx
location /api/skoda/ {
    # The trailing slash on proxy_pass strips the /api/skoda prefix: /api/skoda/healthz → /healthz
    proxy_pass http://127.0.0.1:8080/;
    proxy_set_header Host              $host;
    proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto https;
    proxy_connect_timeout 5s;
    proxy_read_timeout    15s;
    client_max_body_size  4k;
}
```

nginx picks the longest matching prefix, so the app's usual `location / { try_files $uri /index.html; }` does not catch `/api/skoda/`. Don't put a fallback `try_files` at server level, where it would apply to every path.

## 6. Reverse proxy: Caddy (alternative)

```caddyfile
ev.example.com {
    # handle_path strips the /api/skoda prefix: /api/skoda/healthz → /healthz
    handle_path /api/skoda/* {
        request_body {
            max_size 4KB
        }
        reverse_proxy 127.0.0.1:8080
    }
    handle {
        root * /var/www/ev
        try_files {path} /index.html
        file_server
    }
}
```

Keep the app's `try_files` inside its own `handle` block. At site level Caddy runs `try_files` before `handle_path`, and it would rewrite `/api/skoda/*` to `index.html`. Caddy sets `X-Forwarded-For` / `X-Forwarded-Proto` itself.

## 7. Docker (optional)

Use this instead of §2–§3 if you prefer containers. The reverse proxy setup from §4–§6 stays the same.

```yaml
# docker-compose.yml
services:
  skoda-proxy:
    build: { context: ., dockerfile: proxy/Dockerfile }
    restart: unless-stopped
    ports: ["127.0.0.1:8080:8080"]
    read_only: true
    user: "65532:65532"
    cap_drop: [ALL]
    security_opt: ["no-new-privileges:true"]
    environment:
      HOST: 0.0.0.0
      PORT: 8080
      TOKEN_ISSUER: skoda-proxy
      # The host reverse proxy reaches the container through the network gateway, and only that address is trusted
      TRUSTED_PROXIES: 172.30.0.1
      TOKEN_SECRETS_FILE: /run/secrets/token-secrets
    secrets: [token-secrets]
    networks: [skoda-proxy]

networks:
  skoda-proxy:
    ipam:
      config:
        - subnet: 172.30.0.0/24
          gateway: 172.30.0.1

secrets:
  token-secrets:
    file: /etc/skoda-proxy/docker-token-secrets
```

Pick a subnet that is unused on your host and keep `TRUSTED_PROXIES` equal to its gateway. Trusting a whole range such as `uniquelocal` would let any other container on the host spoof `X-Forwarded-For`.

Build the image from the repository root with `docker build -f proxy/Dockerfile -t skoda-proxy .` (the compose file above does this for you). The image is distroless and runs as uid `65532`.

Compose bind-mounts file secrets with the host file's ownership and mode, so the `root:root 0600` file from §3.1 is unreadable inside the container. Keep a separate copy for Docker that only the container user can read. The systemd file stays `root`-only:

```bash
sudo install -o 65532 -g 65532 -m 400 /etc/skoda-proxy/token-secrets /etc/skoda-proxy/docker-token-secrets
```


## 8. The app: Content-Security-Policy

The app needs no build settings for the proxy. The same build works with or without one.

`npm run build` adds a Content-Security-Policy `<meta>` tag to `dist/index.html`. It allows scripts only from the app's own origin and limits `connect-src` to `'self' https://stromligning.dk`. `'self'` covers the proxy at `/api/skoda`.

A `<meta>` CSP cannot set `frame-ancestors`, so also send the policy as a header from the web server that serves the app. Use the same value as the meta tag (copy it from `dist/index.html`) and add `frame-ancestors 'none'`:

```apache
# Apache: in the app's <VirtualHost> (mod_headers)
Header always set Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' https://stromligning.dk; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'"
```

```nginx
# nginx: in the app's server block
add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' https://stromligning.dk; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'" always;
```

When both the header and the meta tag are present, the browser enforces both, so they must allow the same sources. `style-src 'unsafe-inline'` is needed because Fluent UI inserts its styles at runtime. Scripts stay restricted to the app's own files.

## 9. Verify the deployment

```bash
# Health → expect {"status":"ok"}. An HTML page means the app's fallback route catches /api/ (see §4.2–§6).
curl -s https://ev.example.com/api/skoda/healthz

# Another origin → expect no Access-Control-Allow-Origin header
curl -si -X OPTIONS https://ev.example.com/api/skoda/v1/vehicles/TMBXXXXXXXXXXXXXX \
  -H 'Origin: https://evil.example' -H 'Access-Control-Request-Method: GET'

# No token → expect 401
curl -si https://ev.example.com/api/skoda/v1/vehicles/TMBXXXXXXXXXXXXXX

# Forward-proxy abuse check → must NOT return example.org content
curl -si -x https://ev.example.com:443 http://example.org/
```

Then, in the app:
1. Reload it, open **Settings → App → Škoda Connection** and enable the proxy. The URL shown is `https://ev.example.com/api/skoda`.
2. Run **Test connection**.
3. Link each car, or add it with **Add Škoda car** in Settings → Cars.

## 10. Operations

### Rotating the token secret

1. Run `npm run proxy:secret`. It prints a new key with an id such as `k20261024-3fa9c1` (the date plus a random suffix, so two rotations never collide).
2. Merge the new key into the file and make it current. Keep the old key so existing tokens keep working:
   ```json
   {"current":"k20261024-3fa9c1","keys":{"k1":"<old>","k20261024-3fa9c1":"<new base64 32 bytes>"}}
   ```
3. `sudo systemctl restart skoda-proxy`. New tokens are issued with the new key.
4. Once the old tokens' Škoda keys have expired, remove `k1`. Removing `k1` immediately instead revokes every token issued with it, and users must re-link.

### Revoking access for one car

Delete the API key in the **MyŠkoda app**. Škoda then answers `401`, and the token stops working on its next request that reaches Škoda. Responses already cached for that key are still served until they expire, so revocation takes effect within `CACHE_TTL_SECONDS` (60 s by default, never more than 300 s).

### Updating

Rebuild, copy `proxy/dist` over `/opt/skoda-proxy/dist`, then run `sudo systemctl restart skoda-proxy`. The proxy stores no state, so there is nothing to migrate.

## 11. Troubleshooting

| Symptom | Likely cause |
|---|---|
| Apache returns `502`/`503` | The service isn't running (`systemctl status skoda-proxy`). On RHEL, SELinux may be blocking it: set `httpd_can_network_connect`. |
| Škoda Connection missing from Settings | `/api/skoda/healthz` doesn't answer with `{"status":"ok"}`. If it returns the app's HTML page, the fallback route catches `/api/` (see §4.2–§6). |
| Browser: CSP blocks `/api/skoda` | The server's CSP header lacks `connect-src 'self'`. |
| All users share one rate limit | `TRUSTED_PROXIES` isn't set, so every request appears to come from `127.0.0.1`. |
| `401 key-revoked` for a car | The Škoda key expired or was deleted in MyŠkoda. Re-link the car in the app. |
| Service fails at start with a config error | The proxy validates config at startup, and the journal shows which variable is invalid. |
