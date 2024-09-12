#!/bin/bash

# Read the JSON file and extract the list of operator (elcom numbers)
numbers=$(jq -r '.elcomNumbers[]' ./constants/elcom-numbers/elcom-numbers.json)

# Iterate over each operator
for number in $numbers; do
    echo "Running docker with file: $number"
    docker run -it --rm -v $(pwd):/usr/src/app -w /usr/src/app --user $(id -u):$(id -g) ghcr.io/puppeteer/puppeteer:23.2.2 node --env-file=./scraper/.env ./scraper/dist/src/single-run.js --schema-dir ./schema --output-dir ./output --database-dir ./database --elcom-numbers-json="[$number]" --prompt-file=./prompts/simple-3.txt --output-file=./output/{{elcomNumber}}/harmonized_{{elcomNumber}}.json
done