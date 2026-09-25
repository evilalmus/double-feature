FROM node:22-alpine
WORKDIR /app
COPY package.json ./
COPY public ./public
COPY server ./server
RUN mkdir /app/.data && chown node:node /app/.data
USER node
ENV PORT=4173 DATA_DIR=/app/.data
EXPOSE 4173
CMD ["node", "server/index.mjs"]
