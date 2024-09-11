# Use the specified version of Puppeteer as the base image
FROM ghcr.io/puppeteer/puppeteer:21.1.0

# Set environment variable to prevent Puppeteer from downloading Chrome
ENV PUPPETEER_SKIP_CHROMIUM_DOWNLOAD=true

# Set the working directory inside the container
WORKDIR /usr/src/app

# Copy package.json and package-lock.json to the working directory
COPY package*.json ./

# Install app dependencies
RUN npm ci

# Copy the rest of the application to the working directory
COPY . .

# Command to run the app
CMD ["npm", "start"]