#!/bin/bash

# Read the JSON file and extract the list of operator (elcom numbers)
numbers=$(jq -r '.elcomNumbers[]' ./constants/elcom-numbers/elcom-numbers.json)

# Iterate over each operator
for number in $numbers; do
    echo "Running validation on elcom number $number"
    # Run the docker command and check if it succeeds
    docker run -v "$(pwd)/":/usr/src/app --user $(id -u):$(id -g) --rm --name elcom-calculator elcom-calculator python3 ./elcom-calculator/run_validation.py --input_json ./output/$number/analysis_$number.json --input_elcom ./tmp/elcom_min_max_H4_tarife_2024.csv --output_json ./output/$number/validation_$number.json

    # If docker command fails, skip to the next number
    if [ $? -ne 0 ]; then
        echo "Error running validation on elcom number $number, skipping to the next one..."
        continue
    fi
done
