#!/bin/bash

# Function to handle errors
handle_error() {
    echo "Error occurred in script at line: $1"
    exit 1
}

# Trap errors and call handle_error function
trap 'handle_error $LINENO' ERR

# Check if jq is installed
if ! command -v jq &> /dev/null; then
    echo "jq is not installed. Please install jq to proceed."
    exit 1
fi

# Check if the JSON file exists
if [ ! -f ./constants/elcom-numbers/elcom-numbers.json ]; then
    echo "JSON file not found: ./constants/elcom-numbers/elcom-numbers.json"
    exit 1
fi

# Read the JSON file and extract the list of operator (elcom numbers)
numbers=$(jq -r '.elcomNumbers[]' ./constants/elcom-numbers/elcom-numbers.json)

# Iterate over each operator
for number in $numbers; do
    {
        echo "Running docker with file: $number"
        docker run -it --rm -v $(pwd):/usr/src/app -w /usr/src/app --user $(id -u):$(id -g) ghcr.io/puppeteer/puppeteer:23.2.2 node --env-file=./scraper/.env ./scraper/dist/src/single-run.js --schema-dir ./schema --output-dir ./output --database-dir ./database --elcom-numbers-json="[$number]" --prompt-file=./prompts/simple-3.txt --output-file=./output/{{elcomNumber}}/harmonized_{{elcomNumber}}.json
    } || {
        echo "Error occurred while running docker with file: $number"
    }
done