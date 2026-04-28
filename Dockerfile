FROM node:20

WORKDIR /app

# Install build dependencies for sqlite3
RUN apt-get update && apt-get install -y python3 make g++

COPY server/package*.json ./
COPY server/ .
RUN rm -rf node_modules && npm install --build-from-source=sqlite3
COPY web-ui/dist ./dist

EXPOSE 3000

CMD ["node", "index.js"]
