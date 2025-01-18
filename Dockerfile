# Use the official Node.js LTS (Long Term Support) image as a base
FROM node:lts

# Set the working directory in the container
WORKDIR /usr/src/app

# Invalidate the cache
ARG CACHEBUST=1

ENV GENERATE_SOURCEMAP false

# Copy package.json and package-lock.json into the working directory
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application into the working directory
COPY . .

# Command to run the application
CMD ["npm", "run", "start"]
