# Use Node.js 18 as base image (as per Part 2)
FROM node:18

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy all project files
COPY . .

# Expose port 3000
EXPOSE 3000

# Set environment to production
ENV NODE_ENV=production

# Command to run the application
CMD ["node", "main.js"]
