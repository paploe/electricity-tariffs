#!/bin/bash

# Read the JSON file and extract the list of operator (elcom numbers)
numbers=$(jq -r '.elcomNumbers[]' ./constants/elcom-numbers/elcom-numbers.json)

# Iterate over each operator
for number in $numbers; do
    echo "Running calculation on elcom number $number"
    # Run the docker command and check if it succeeds
    docker run -v "$(pwd)/":/usr/src/app --user $(id -u):$(id -g) --rm --name elcom-calculator elcom-calculator python3 ./elcom-calculator/run.py --input ./output/$number/harmonized_$number.json --output ./output/$number/analysis_$number.json

    # If docker command fails, skip to the next number
    if [ $? -ne 0 ]; then
        echo "Error running calculation on elcom number $number, skipping to the next one..."
        continue
    fi
done
