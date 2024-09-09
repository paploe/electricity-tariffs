# Swiss Electricity Tariffs 

This is the EnergyHackdays monorepo for challange [todo-challange-url](todo-challange-url).

Edit here: [https://ascii-tree-generator.com/](https://ascii-tree-generator.com/)
````txt
electricity-tariffs/
├─ database/<---A folder that holds all the downloaded assedts
├─ scraper/<--- Scrapes the PDF files, saves them in the database enriched by OpenAI knowledge.
├─ elcom-calculator/<--- Pure python function that takes a structured input and returns one.
````

## Running the Price Analysis:
To run the Elcom analysis from terminal giving as input the sample JSON, use:
````bash
docker build -t elcom-calculator -f ./elcom-calculator/Dockerfile . --progress=plain --no-cache
docker run -it --rm --name elcom-calculator elcom-calculator ../schema/sample-complete.json
# python elcom-calculator/run.py schema/sample-complete.json 
docker run -it --rm --name elcom-calculator -v "$PWD":/usr/src/myapp -w /usr/src/myapp python:3 python ./elcom-calculator/run.py ./schema/sample-complete.json
````
