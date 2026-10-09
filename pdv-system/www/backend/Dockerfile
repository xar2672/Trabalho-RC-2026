FROM node:22-bookworm-slim

RUN npm install -g pm2

WORKDIR /pdv/src/web

COPY src/web/package*.json ./
RUN npm install

WORKDIR /pdv
COPY . .

WORKDIR /pdv/src/

EXPOSE 3000

CMD ["pm2-runtime", "start", "ecosystem.config.js"]