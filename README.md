# Swiss Electricity Tariff Harmonization Project

This is the EnergyHackdays monorepo for challange [Watts & Bots: Energizing Swiss Tariff Transparency with AI](https://hack.energy.opendata.ch/project/123).

This project focuses on creating a solution for harmonizing the complex and fragmented electricity tariffs from over 600 local electricity providers across Switzerland. Each provider offers unique products with varying prices and conditions, making it difficult for customers and businesses to compare tariffs accurately. Using AI, specifically OpenAI’s language models, the project automates the extraction, structuring, and validation of electricity tariff data from unstructured sources like PDFs, which are available on the Elcom website.

### Key Objectives
- **Scraping**: Gather electricity tariff data from PDFs on the Elcom website using a custom puppeteer scraper. This data includes detailed breakdowns of tariffs for different municipalities, providers, and customer types.
- **Data Harmonization**: Convert unstructured tariff information into a predefined, structured JSON schema, ensuring it is consistent and ready for further analysis or application.
- **AI-Powered Processing**: Leverage OpenAI models to assist in interpreting and extracting tariff components, streamlining the process of converting PDFs into usable data.
- **Validation and Analysis**: Use a Python-based solution to validate that the harmonized data complies with the predefined schema.

### Project Structure
- **Scraper Module**: Gathers raw tariff data and processes it through prompts that guide AI in interpreting different pricing components.
- **Schema Module**: Defines the structure for harmonized tariff data, ensuring it meets compliance and standardization for use in financial models and energy applications.
- **Validation and Analysis Module**: The Python-based module performs validation of the processed data against the schema and conducts detailed tariff analysis. This includes calculating average yearly tariffs, minimum and maximum prices, and integrating additional costs like municipal fees or grid surcharges to provide deeper insights.
````bash
.
├── constants
│   └── elcom-numbers
│       └── elcom-numbers.json
│       └── # Contains a JSON file with the mapping or configuration of ELCOM numbers, which may represent different electricity providers or tariff groups.
├── coverage-analyzer
│   └── # Contains a simple Node.js script that analyzes how many output.json files and valid and within the elcom range.
├── database
│   └── .gitkeep
│       └── # This directory holds assets such as PDFs or intermediary data related to the scraping process.
├── elcom-calculator
│   ├── data
│   │   └── hourly_verbrauch_h4.csv
│   │   └── # This data folder holds a CSV file, which could contain hourly consumption data (Verbrauch in German) that is used in tariff calculation or analysis.
│   ├── requirements.txt
│   └── run.py
│       └── # This module is the core of the calculator, built in Python. It includes scripts for running tariff calculations and analysis using Docker. It includes helper functions, dependencies, and an example in Jupyter notebook (`test.ipynb`).
├── output
│   ├── test
│   │   └── # Contains the output results from running the harmonization process on different ELCOM numbers. Each subfolder (e.g., `1`, `19`, `21`) represents a separate network operator or scenario. These contain JSON files representing harmonized tariff data and raw data at different stages.
│   ├── analysis_21.json
│   ├── analysis_25.json
│   └── output.json
│       └── # The analysis files represent processed results from the `elcom-calculator`, containing the final analyzed tariff data for a specific network operator (like `21` or `25`).
├── prompts
│   ├── simple-1.txt
│   ├── simple-2.txt
│   └── simple-3.txt
│       └── # These files contain different prompts for guiding the AI in generating or interpreting data from the PDFs.
├── schema
│   ├── split-schema
│   │   ├── split-schema-part-*.json
│       └── # These JSON files define different parts of the schema used to structure the harmonized data.
│   └── openai-complete.json
│       └── # Complete schema defining the format and structure that the final harmonized data should adhere to, ensuring compliance with predefined requirements.
├── scraper
│   ├── src
│   │   └── # This is the core scraper module, written in TypeScript. It contains components for scraping PDF files, validating schemas, and interacting with OpenAI for extracting and structuring tariff data.
│   └── # This part of the repository is set up for scraping, testing, and validating electricity tariff data. It includes necessary configuration files for Docker, environment variables, and TypeScript compilation.

````

## Hacking quickstart

### Prerequisites

#### Install docker

````bash
curl -fsSL https://get.docker.com -o get-docker.sh
sudo sh ./get-docker.sh --dry-run
# continue with the following command only if docker is not installed
# sudo sh ./get-docker.sh
````

#### Install node.js

````bash
# installs nvm (Node Version Manager)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.0/install.sh | bash

# download and install Node.js (you may need to restart the terminal)
nvm install 20

# verifies the right Node.js version is in the environment
node -v # should print `v20.17.0`

# verifies the right npm version is in the environment
npm -v # should print `10.8.2`
````

Before running the project, copy the ``scraper/.env.sample`` to ``scraper/.env``.

````bash
cp scraper/.env.sample scraper/.env
````

If you want to run the scraper without docker, you need to provide the correct path to your Chrome or Chromium browser
executable in the `scraper/.env` file.
Follow the instructions below to find the path on your system:

#### **Windows**

1. **Find Chrome Executable Path**:
    - Open the Start Menu and search for **"Google Chrome"**.
    - Right-click on the Chrome icon and choose **"Open file location"**.
    - In the file location window, right-click on the **Google Chrome** shortcut and again choose **"Open file location"**.
    - This will take you to the folder where Chrome is installed. The default path is usually:
      ```plaintext
      C:\Program Files\Google\Chrome\Application\chrome.exe
      ```
    - Copy the full path to `chrome.exe` and paste it into your `.env` file like this:
      ```plaintext
      CHROME_PATH="C:/Program Files/Google/Chrome/Application/chrome.exe"
      ```

2. **Alternative: Use File Explorer**:
    - Navigate to `C:\Program Files\Google\Chrome\Application\` or `C:\Program Files (x86)\Google\Chrome\Application\`.
    - Find `chrome.exe` in that folder, right-click, and choose **"Copy as Path"** to get the full executable path.

#### **macOS**

1. **Find Chrome Executable Path**:
    - Open **Finder**.
    - Navigate to the **Applications** folder.
    - Find **Google Chrome.app**, right-click it, and select **"Show Package Contents"**.
    - Navigate to `Contents/MacOS/` inside the Chrome app package.
    - The path to Chrome’s executable is typically:
      ```plaintext
      /Applications/Google Chrome.app/Contents/MacOS/Google Chrome
      ```
    - Copy this path and paste it into your `.env` file like this:
      ```plaintext
      CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
      ```

#### **Linux**

1. **Find Chrome or Chromium Executable Path**:
    - Open a terminal.
    - Type the following command to locate Chrome or Chromium on your system:
      ```bash
      which google-chrome
      ```
      or for Chromium:
      ```bash
      which chromium-browser
      ```
    - This will give you the path to the browser executable, such as:
      ```plaintext
      /usr/bin/google-chrome
      ```
      or
      ```plaintext
      /usr/bin/chromium-browser
      ```
    - Copy the output and paste it into your `.env` file like this:
      ```plaintext
      CHROME_PATH="/usr/bin/google-chrome"
      ```

#### **Verifying the Browser Path**
- To ensure that Puppeteer can find the browser, test the path by running the following command:
  - **Windows**:
    ```powershell
    (Get-Item "C:\Program Files\Google\Chrome\Application\chrome.exe").VersionInfo
    ```
  - **macOS**:
    ```bash
    /Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome --version
    ```
  - **Linux**:
    ```bash
    /usr/bin/google-chrome --version
    ```
  
  If the browser version is printed, the path is correct.

---

### Example `.env` File Configuration

```plaintext
HOST=0.0.0.0
PORT=3050
OPENAI_API_KEY=<to-replace>
CHROME_PATH="/usr/bin/google-chrome"

# Windows example
CHROME_PATH="C:/Program Files/Google/Chrome/Application/chrome.exe"
# macOS example
# CHROME_PATH="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
# Linux example
# CHROME_PATH="/usr/bin/google-chrome"
```

## scraper

Install and build the scraper
````bash
cd scraper
npm i
npm run compile
cd ..
````
Run the scraper with docker
````bash
docker run -it --rm -v $(pwd):/usr/src/app -w /usr/src/app --user $(id -u):$(id -g) ghcr.io/puppeteer/puppeteer:23.2.2 node --env-file=./scraper/.env ./scraper/dist/src/single-run.js --schema-dir ./schema --output-dir ./output --database-dir ./database --elcom-numbers-json=[21] --prompt-file=./prompts/simple-3.txt --output-file=./output/{{elcomNumber}}/harmonized_{{elcomNumber}}.json
# docker run -it --rm -v $(pwd):/usr/src/app -w /usr/src/app --user $(id -u):$(id -g) ghcr.io/puppeteer/puppeteer:23.2.2 node --env-file=./scraper/.env ./scraper/dist/src/single-run.js --schema-dir ./schema --output-dir ./output --database-dir ./database --elcom-numbers-json=[486] --prompt-file=./prompts/simple-3.txt --output-file=./output/{{elcomNumber}}/harmonized_{{elcomNumber}}.json
````
After we have a ``output/test/21/final-output.json`` file, we analyze it.

## elcom-calculator

````bash
docker run -v "$(pwd)/":/usr/src/app --user $(id -u):$(id -g) -it --rm --name elcom-calculator elcom-calculator python3 ./elcom-calculator/run.py --input ./output/21/harmonized_21.json --output ./output/21/analysis_21.json
# docker run -v "$(pwd)/":/usr/src/app --user $(id -u):$(id -g) -it --rm --name elcom-calculator elcom-calculator python3 ./elcom-calculator/run.py --input ./output/486/harmonized_486.json --output ./output/486/analysis_486.json
````
We can analyze how many outputs we generated and how many of them are valid and withing the elcom range.

````bash
docker run -v "$(pwd)/":/usr/src/app --user $(id -u):$(id -g) -it --rm --name elcom-calculator elcom-calculator python3 ./elcom-calculator/run_validation.py --input_json ./output/21/analysis_21.json --input_elcom ./elcom-calculator/data/sample_elcom_tarife.csv --output_json ./output/21/validation_21.json
# docker run -v "$(pwd)/":/usr/src/app --user $(id -u):$(id -g) -it --rm --name elcom-calculator elcom-calculator python3 ./elcom-calculator/run_validation.py --input_json ./output/486/analysis_486.json --input_elcom ./elcom-calculator/data/sample_elcom_tarife.csv --output_json ./output/486/validation_486.json
````

## coverage-analyzer
Install and build the coverage-analyzer
````bash
cd coverage-analyzer
npm i
cd ..
````
````bash
docker run -it --rm -v $(pwd):/usr/src/app -w /usr/src/app --user root node:20.16.0-bullseye node coverage-analyzer/src/index.js --directory=./output --pattern="validation_\\d+\\.json"
````

## [wip] Batch processing
````bash
nohup bash ./process_all.sh > scraping_output.txt 2>&1 &
tail -f scraping_output.txt

nohup bash ./calculate_all.sh > calculation_output.txt 2>&1 &
tail -f calculation_output.txt

nohup bash ./validate_all.sh > validation_output.txt 2>&1 &
tail -f validation_output.txt
````