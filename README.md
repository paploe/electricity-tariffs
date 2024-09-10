# Swiss Electricity Tariffs 

This is the EnergyHackdays monorepo for challange [todo-challange-url](todo-challange-url).

Edit here: [https://ascii-tree-generator.com/](https://ascii-tree-generator.com/)
````txt
electricity-tariffs/
├─ database/<---A folder that holds all the downloaded assedts
├─ scraper/<--- Scrapes the PDF files, saves them in the database enriched by OpenAI knowledge.
├─ elcom-calculator/<--- Pure python function that takes a structured input and returns one.
````

## Hacking session

### Goals

The goal of this hackathon is the harmonization of tariff data. We want to be able to convert unstructured PDF of
network operators into a predefined JSON-schema, so that we can build services on top of structured data.

The main idea:
1. Scrape the tariff-PDF and store it on ``database/pdf/2024/operator_21_Tarifblatt_2024.pdf``
2. Make some OpenAI magic based on the modifiable prompt `prompts/simple-3.txt` an store the results on ``output/test/21/final-output.json.json``
3. Validate the harmonized data with a python script

### Challanges

1. Run the scraping for a larger subset of all elcom numbers
1. Make sure that every ``output/test/<elcom-nr>/final-output.json.json`` is schema compliant to `schema/openai-complete.json`
2. Run the price analysis script below and validate the minimum and maximum prices of its output

## Hacking quickstart

### Process a single network operator
````bash
cd scraper
npm i
mv .env.sample .env # replace the env variables from the sample
npm run compile
# run compiled script
node --env-file=.env dist/src/single-run.js --elcom-numbers-json=[21] --prompt-file-name=simple-3.txt --output-file-name=final-output.json
# run in test mode
# npx vitest --run --testNamePattern=^ ?Combined workflows  ./test/pipeline.test.ts
````
After we have a ``output/test/21/final-output.json`` file, we analyze it.

````bash
cd elcom-calculator
docker build -t elcom-calculator -f Dockerfile . --progress=plain
# python elcom-calculator/run.py schema/sample-complete.json 
docker run -v "$(pwd)/../output":/usr/src/app/output -it --rm --name elcom-calculator elcom-calculator python3 run.py --input ./output/test/21/final-output.json --output ./output/analysis_21.json
````


