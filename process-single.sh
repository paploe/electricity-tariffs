#!/bin/bash

# Check if an argument was provided
if [ -z "$1" ]; then
  echo "Usage: $0 <elcom-number>"
  exit 1
fi

# Store the first argument (21 or any other number) in a variable
ELCOM_NUMBER=$1

# Run the Docker container with the argument
docker run -it --rm -v $(pwd):/usr/src/app -w /usr/src/app --user $(id -u):$(id -g) \
  ghcr.io/puppeteer/puppeteer:23.2.2 node --env-file=scraper/.env \
  scraper/dist/src/single-run.js --database-dir=./database \
  --elcom-numbers-json=[$ELCOM_NUMBER] \
  --prompt-file-name=simple-3.txt --output-file-name=harmonized_$ELCOM_NUMBER.json
