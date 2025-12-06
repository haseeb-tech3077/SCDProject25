# Multi-stage build for Node.js Backend

FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files first
COPY package*.json ./

# Install dependencies

RUN npm install --production

# Copy the rest of the application
COPY . .

# Create backups directory
RUN mkdir -p /app/backups

# Expose the port your application uses
EXPOSE 3000

# Set NODE_ENV to production
ENV NODE_ENV=production

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD node -e "require('http').get('http://localhost:3000/health', (r) => {process.exit(r.statusCode === 200 ? 0 : 1)})" || exit 1

# Start the application
CMD ["node", "main.js"]
