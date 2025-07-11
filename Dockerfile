# Use ARG to define the node version
ARG NODE_VERSION=22
ARG NODE_ENV=production

# Use the Node.js version specified by NODE_VERSION
FROM node:${NODE_VERSION}-alpine AS builder

RUN npm i -g pnpm@9

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package.json ./
COPY pnpm-lock.yaml ./

# Install dependencies
RUN pnpm install --frozen-lockfile

# Copy the rest of the application code
COPY . .

# Build the application
RUN pnpm run build

FROM node:${NODE_VERSION}-alpine AS mock-warden-worker

WORKDIR /app

COPY --from=builder /app/node_modules /app/node_modules
COPY --from=builder /app/dist /app/dist
COPY --from=builder /app/views /app/views

# Expose the port the app runs on
EXPOSE 3000

# Start the application
CMD ["node", "dist/index.js"]
