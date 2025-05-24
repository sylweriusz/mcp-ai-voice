# Node.js runtime
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy built application
COPY dist/ ./dist/

# Expose port for health checks (if needed)
EXPOSE 3000

# Start the MCP server
CMD ["node", "dist/index.js"]