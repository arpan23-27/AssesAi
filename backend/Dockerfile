FROM node:20-alpine

WORKDIR /app

# Install production dependencies first for better layer caching.
COPY package*.json ./
RUN npm ci --omit=dev

# Application source (includes migrations and seeds under src/).
COPY src/ ./src/

EXPOSE 3000

CMD ["node", "src/server.js"]
