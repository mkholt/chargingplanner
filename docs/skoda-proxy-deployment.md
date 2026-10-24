# Škoda Proxy — Deployment Guide (Linux)

How to run the Škoda proxy on a Linux host. The design is described in [skoda-proxy-spec.md](skoda-proxy-spec.md).

**Docker is not required.** The primary setup is Node.js + systemd behind a reverse proxy. Apache, nginx and Caddy are all covered below. Docker is an optional alternative.

```
Browser ──HTTPS──▶ Apache / nginx / Caddy ──http://127.0.0.1:8080──▶ skoda-proxy (Node, systemd) ──HTTPS──▶ MyŠkoda API
```

## 1. Prerequisites

- **Node.js 24 LTS**, from your distro or NodeSource. Check with `node --version`.
- **A reverse proxy** with TLS: Apache 2.4.30+, nginx, or Caddy.
- **A DNS name** for the proxy, e.g. `skoda-proxy.example.com`. Alternatively, serve it under a subpath of an existing site (see §4.3).
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
# Origin(s) where the EV Charging Planner app is served (scheme + host + port, no path)
ALLOWED_ORIGINS=https://ev.example.com
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
sudo a2enmod proxy proxy_http ssl headers http2 md
sudo systemctl restart apache2
```

RHEL / Rocky / Alma:

```bash
sudo dnf install httpd mod_ssl mod_md
# SELinux: allow Apache to connect to the local proxy port
sudo setsebool -P httpd_can_network_connect 1
```

### 4.2 Dedicated subdomain (recommended)

`/etc/apache2/sites-available/skoda-proxy.conf` on Debian/Ubuntu, or `/etc/httpd/conf.d/skoda-proxy.conf` on RHEL:

```apache
# --- TLS certificate via mod_md (Apache's built-in ACME / Let's Encrypt client) ---
MDomain skoda-proxy.example.com
MDCertificateAgreement accepted
MDContactEmail admin@example.com

<VirtualHost *:80>
    ServerName skoda-proxy.example.com
    # mod_md answers ACME challenges itself; everything else goes to HTTPS
    RedirectMatch permanent ^/(?!\.well-known/acme-challenge/)(.*)$ https://skoda-proxy.example.com/$1
</VirtualHost>

<VirtualHost *:443>
    ServerName skoda-proxy.example.com
    Protocols h2 http/1.1

    SSLEngine on
    # TLS settings: follow the Mozilla SSL Configuration Generator, "intermediate" profile
    # https://ssl-config.mozilla.org/#server=apache
    SSLProtocol -all +TLSv1.2 +TLSv1.3
    SSLHonorCipherOrder off
    SSLSessionTickets off

    # Reverse proxy only. NEVER enable forward proxying.
    ProxyRequests Off
    ProxyPreserveHost On
    ProxyPass        / http://127.0.0.1:8080/ connectiontimeout=5 timeout=15
    ProxyPassReverse / http://127.0.0.1:8080/
    # mod_proxy_http adds X-Forwarded-For / -Host / -Server automatically.
    RequestHeader set X-Forwarded-Proto "https"

    # Requests are tiny; reject anything large before it reaches Node
    LimitRequestBody 4096

    # Do NOT add CORS (Access-Control-*) or HSTS headers here:
    # the proxy app sets them, and duplicate headers break browsers.

    ErrorLog  ${APACHE_LOG_DIR}/skoda-proxy-error.log
    # Default "combined" format does not log the Authorization header - keep it that way.
    CustomLog ${APACHE_LOG_DIR}/skoda-proxy-access.log combined
</VirtualHost>
```

On RHEL, replace `${APACHE_LOG_DIR}` with `logs`.

Enable the site and reload:

```bash
sudo a2ensite skoda-proxy          # Debian/Ubuntu only
sudo apachectl configtest
sudo systemctl reload apache2      # or httpd
# mod_md fetches the certificate in the background and logs:
#   "The Managed Domain skoda-proxy.example.com has been setup and changes will be activated on next (graceful) server restart."
sudo systemctl reload apache2      # activates the new certificate
```

If you prefer **certbot** over mod_md, remove the three `MD*` lines and run `sudo certbot --apache -d skoda-proxy.example.com`.

### 4.3 Subpath on an existing site

Use this when the proxy should live at `https://example.com/skoda-proxy/`, for example on the same vhost that serves the app. Add the following inside the existing `<VirtualHost *:443>`:

```apache
ProxyRequests Off

<Location "/skoda-proxy/">
    ProxyPass        "http://127.0.0.1:8080/" connectiontimeout=5 timeout=15
    ProxyPassReverse "http://127.0.0.1:8080/"
    RequestHeader set X-Forwarded-Proto "https"
    LimitRequestBody 4096
</Location>
```

Then:
- **In the app**, build it with `VITE_SKODA_PROXY_URL=https://example.com/skoda-proxy` (see §8).
- **Health check:** `https://example.com/skoda-proxy/healthz`.
- **CORS:** if the app is served from the same origin (`https://example.com`), the browser makes same-origin requests and CORS doesn't apply. Still set `ALLOWED_ORIGINS=https://example.com`.

## 5. Reverse proxy: nginx (alternative)

```nginx
server {
    listen 80;
    server_name skoda-proxy.example.com;
    location /.well-known/acme-challenge/ { root /var/www/certbot; }
    location / { return 301 https://$host$request_uri; }
}

server {
    listen 443 ssl;
    http2 on;
    server_name skoda-proxy.example.com;

    ssl_certificate     /etc/letsencrypt/live/skoda-proxy.example.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/skoda-proxy.example.com/privkey.pem;
    ssl_protocols TLSv1.2 TLSv1.3;   # see https://ssl-config.mozilla.org/#server=nginx

    client_max_body_size 4k;

    location / {
        proxy_pass http://127.0.0.1:8080;
        proxy_set_header Host              $host;
        proxy_set_header X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto https;
        proxy_connect_timeout 5s;
        proxy_read_timeout    15s;
        # No CORS/HSTS headers here - the proxy app sets them.
    }
}
```

Get the certificate with `sudo certbot --nginx -d skoda-proxy.example.com`.

## 6. Reverse proxy: Caddy (alternative)

```caddyfile
skoda-proxy.example.com {
    request_body {
        max_size 4KB
    }
    reverse_proxy 127.0.0.1:8080
}
```

Caddy obtains and renews the certificate automatically and sets `X-Forwarded-For` / `X-Forwarded-Proto` itself.

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
      ALLOWED_ORIGINS: https://ev.example.com
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

## 8. The app: build settings and Content-Security-Policy

The app connects to the proxy straight from the browser. The proxy URL is set when the app is built. Users can turn the Škoda connection on and off, but can't change the URL:

```bash
# .env.production: without it, the Škoda connection is hidden in the app
VITE_SKODA_PROXY_URL=https://skoda-proxy.example.com
```

The repo's `ci.yml` and `release.yml` workflows read it from the GitHub Actions **variable** `SKODA_PROXY_URL` (Settings → Secrets and variables → Actions → Variables). It is a variable, not a secret, because the URL is public anyway: it is in the built app and its CSP. Without it, the released app has no Škoda connection. The proxy's own settings and token secrets stay on the proxy host and never go into GitHub.

`npm run build` adds a Content-Security-Policy `<meta>` tag to `dist/index.html`. It allows scripts only from the app's own origin and limits `connect-src` to the price API and the proxy:

| Build | `connect-src` |
|---|---|
| `VITE_SKODA_PROXY_URL` set | `'self' https://stromligning.dk https://skoda-proxy.example.com` |
| Not set | `'self' https://stromligning.dk`. The Škoda connection is hidden. |

A `<meta>` CSP cannot set `frame-ancestors`, so also send the policy as a header from the web server that serves the app. Use the same value as the meta tag (copy it from `dist/index.html`) and add `frame-ancestors 'none'`:

```apache
# Apache: in the app's <VirtualHost> (mod_headers)
Header always set Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' https://stromligning.dk https://skoda-proxy.example.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'"
```

```nginx
# nginx: in the app's server block
add_header Content-Security-Policy "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self' https://stromligning.dk https://skoda-proxy.example.com; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'" always;
```

When both the header and the meta tag are present, the browser enforces both, so they must allow the same sources. `style-src 'unsafe-inline'` is needed because Fluent UI inserts its styles at runtime. Scripts stay restricted to the app's own files.

## 9. Verify the deployment

```bash
# Health
curl -s https://skoda-proxy.example.com/healthz

# CORS preflight from the app origin → expect 204 with Access-Control-Allow-Origin: https://ev.example.com
curl -si -X OPTIONS https://skoda-proxy.example.com/v1/vehicles/TMBXXXXXXXXXXXXXX \
  -H 'Origin: https://ev.example.com' \
  -H 'Access-Control-Request-Method: GET' \
  -H 'Access-Control-Request-Headers: authorization'

# Unknown origin → expect no Access-Control-Allow-Origin header
curl -si -X OPTIONS https://skoda-proxy.example.com/v1/vehicles/TMBXXXXXXXXXXXXXX \
  -H 'Origin: https://evil.example' -H 'Access-Control-Request-Method: GET'

# No token → expect 401
curl -si https://skoda-proxy.example.com/v1/vehicles/TMBXXXXXXXXXXXXXX

# Forward-proxy abuse check → must NOT return example.org content
curl -si -x https://skoda-proxy.example.com:443 http://example.org/
```

Then, in the app:
1. Open **Settings → App → Škoda Connection** and enable the proxy. Check that the URL shown is the one you deployed.
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
| Browser: "CORS header missing" | The app origin isn't in `ALLOWED_ORIGINS`. Scheme, host and port must match exactly, with no trailing slash. |
| Browser: "multiple values in Access-Control-Allow-Origin" | CORS headers were also added in Apache/nginx. Remove them. |
| All users share one rate limit | `TRUSTED_PROXIES` isn't set, so every request appears to come from `127.0.0.1`. |
| `401 key-revoked` for a car | The Škoda key expired or was deleted in MyŠkoda. Re-link the car in the app. |
| Service fails at start with a config error | The proxy validates config at startup, and the journal shows which variable is invalid. |
