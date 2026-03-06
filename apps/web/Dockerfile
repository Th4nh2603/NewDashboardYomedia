FROM node:22-alpine AS builder

WORKDIR /app

RUN corepack enable && corepack prepare pnpm@10.26.1 --activate

# Copy web package manifest and install deps
COPY package.json pnpm-lock.yaml* ./

RUN pnpm install --prod=false --dangerously-allow-all-builds

# Copy web source code (context = apps/web)
COPY . ./

# Build Vite app (output to dist)
RUN pnpm run build

# ---------- Runtime image using nginx ----------
FROM nginx:1.27-alpine AS runner

WORKDIR /usr/share/nginx/html

COPY --from=builder /app/dist ./

EXPOSE 80

CMD ["nginx", "-g", "daemon off;"]

