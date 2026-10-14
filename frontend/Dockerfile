FROM node:24-bookworm-slim

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

EXPOSE 5173

# --host lets the dev server accept connections from outside the container.
CMD ["npm", "run", "dev", "--", "--host", "0.0.0.0"]
