# Optional container image for the Škoda proxy. Build from the repository root:
#   docker build -f proxy/Dockerfile -t skoda-proxy .
# The proxy shares the generated Škoda API types in src/types with the app.

FROM node:24-bookworm-slim AS build
WORKDIR /repo
COPY package.json package-lock.json ./
COPY proxy/package.json proxy/
RUN npm ci --workspace proxy --include-workspace-root=false --ignore-scripts
COPY src/types/skoda.d.ts src/types/
COPY proxy/ proxy/
RUN npm run build --workspace proxy

# Distroless: no shell or package manager; runs as uid 65532
FROM gcr.io/distroless/nodejs24-debian12:nonroot
WORKDIR /app
COPY --from=build /repo/proxy/dist/index.js ./
ENV NODE_ENV=production HOST=0.0.0.0 PORT=8080
EXPOSE 8080
CMD ["index.js"]
