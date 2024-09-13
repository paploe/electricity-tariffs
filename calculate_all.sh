#!/bin/bash

# Read the JSON file and extract the list of operator (elcom numbers)
numbers=$(jq -r '.elcomNumbers[]' ./constants/elcom-numbers/elcom-numbers.json)

# Iterate over each operator
for number in $numbers; do
    echo "Running docker with file: $number"
    # Run the docker command and check if it succeeds
    docker run --rm -v $(pwd):/usr/src/app -w /usr/src/app --user $(id -u):$(id -g) ghcr.io/puppeteer/puppeteer:23.2.2 node --env-file=./scraper/.env ./scraper/dist/src/single-run.js --schema-dir ./schema --output-dir ./output --database-dir ./database --elcom-numbers-json="[$number]" --prompt-file=./prompts/final.txt --output-file=./output/$number/harmonized_$number.json

    # If docker command fails, skip to the next number
    if [ $? -ne 0 ]; then
        echo "Docker command failed for number $number, skipping to the next one..."
        continue
    fi
done
