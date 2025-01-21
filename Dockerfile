# Use ARG to define the node version
ARG NODE_VERSION=18
ARG NODE_ENV=production
ARG PORT=3000

# Use the Node.js version specified by NODE_VERSION
FROM node:${NODE_VERSION}-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm ci

# Copy the rest of the application code
COPY . .

# Build the application
RUN npm run build

# Expose the port the app runs on
EXPOSE $PORT

# Start the application
CMD ["npm", "start"]
