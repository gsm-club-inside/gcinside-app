FROM node:20-bookworm

ENV NEXT_TELEMETRY_DISABLED=1 \
    HUSKY=0 \
    DATABASE_URL=postgresql://gcinside:gcinside@postgres:5432/gcinside \
    DIRECT_URL=postgresql://gcinside:gcinside@postgres:5432/gcinside

WORKDIR /app

COPY package.json package-lock.json ./
COPY prisma.config.ts ./
COPY prisma ./prisma
RUN npm ci --no-audit --no-fund --include=dev

RUN npx prisma generate

COPY . .
RUN npm run build

ENV NODE_ENV=production

EXPOSE 3000

HEALTHCHECK --interval=30s --timeout=5s --retries=5 \
  CMD node -e "fetch('http://127.0.0.1:3000/').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"

CMD ["sh", "-c", "npx prisma migrate deploy && npm run start"]
