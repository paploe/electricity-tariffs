FROM docker.io/node:lts-alpine

# Set the working directory in the container
WORKDIR /app

COPY . .

RUN chown -R node:node /app

RUN echo "Listing all the files in the current dir:\n"
RUN ls -lah

RUN touch .env

USER node

# Install dependencies
RUN npm i
RUN npm run lint
RUN npm run prettify
RUN npm run compile

# Expose the port the app runs on
EXPOSE 8100

# Define the command to run your app
CMD ["npm", "run", "start"]
