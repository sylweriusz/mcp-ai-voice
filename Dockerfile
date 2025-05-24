# Node.js runtime
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./
COPY tsconfig.json ./

# Install all dependencies (including dev dependencies for build)
RUN npm ci

# Copy source code
COPY src/ ./src/

# Build the TypeScript
RUN npm run build

# Remove dev dependencies to keep image lean
RUN npm prune --production

# Expose port for health checks (if needed)
EXPOSE 3000

# Start the MCP server
CMD ["node", "dist/index.js"]