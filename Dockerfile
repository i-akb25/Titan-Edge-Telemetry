# Use official Node.js image as the base
FROM node:20-bullseye

# Install Python 3 for the simulation script
RUN apt-get update && apt-get install -y python3 && rm -rf /var/lib/apt/lists/*

# Set the working directory inside the container
WORKDIR /app

# Copy dependency files and install Node modules
COPY package*.json ./
RUN npm install

# Copy all remaining source code
COPY . .

# Expose the API port
EXPOSE 5000

# Start the Node server
CMD ["node", "server.js"]