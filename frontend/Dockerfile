FROM node:22-alpine

WORKDIR /app
ENV NG_CLI_ANALYTICS=false
RUN corepack enable

COPY package.json pnpm-lock.yaml pnpm-workspace.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .

EXPOSE 4200

CMD ["sh", "-c", "node src/scripts/set-env.mjs && pnpm exec ng serve --host 0.0.0.0 --port 4200 --poll 2000"]
