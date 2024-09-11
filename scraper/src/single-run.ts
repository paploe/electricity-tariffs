import packageJson from "../package.json" with { type: "json" };

import { processNetworkOperator } from "./components/scraper/scraper.mjs";

console.log(
  `Started Swiss Electricity Tariffs v${packageJson.version} in single run mode.`,
);

import yargs from "yargs";
import { hideBin } from "yargs/helpers";

// Define a type for the parsed argv object
const argv = yargs(hideBin(process.argv))
  .option("elcom-numbers-json", {
    type: "string",
    demandOption: true,
    describe:
      "Path to the JSON file or JSON string containing network operators. E.g. --elcom-numbers-json=[525,19]",
  })
  .option("prompt-file", {
    type: "string",
    demandOption: true,
    describe:
      "Name of the prompt file to use for each operator. E.g --prompt-file-name=simple-3.txt",
  })
  .option("output-file", {
    type: "string",
    demandOption: true,
    describe:
      "Name of the output file name. E.g --output-file-name=final-output.json",
  })
  .option("database-dir", {
    type: "string",
    demandOption: true,
    describe: "Path to the pdf database directory",
  })
  .option("output-dir", {
    type: "string",
    demandOption: true,
    describe: "Path to the pdf output directory",
  })
  .option("schema-dir", {
    type: "string",
    demandOption: true,
    describe: "Path to the schema directory",
  })
  .parseSync(); // Use parseSync() instead of .argv to ensure no Promise

// Parse the JSON input from the argument
const networkOperators = JSON.parse(argv["elcom-numbers-json"]); // Use hyphenated version for consistency
const promptFilePath = argv["prompt-file"];
const outputFile = argv["output-file"];
const databaseDir = argv["database-dir"];
const outputDir = argv["output-dir"];
const schemaDir = argv["schema-dir"];

(async () => {
  for (const networkOperator of networkOperators) {
    try {
      const res = await processNetworkOperator(
        networkOperator,
        promptFilePath,
        outputFile,
        databaseDir,
        outputDir,
        schemaDir,
      ).catch((e) => {
        console.error(
          "Could not retrieve network operator. Proceeding to the next operator.",
          e,
        );
        return null;
      });
      console.log(
        `Finished Swiss Electricity Tariffs for elcom number ${networkOperator}.`,
        res,
      );
    } catch (e) {
      console.error(
        `processNetworkOperator error on network operator ${networkOperator}.`,
        e,
      );
    }
  }

  console.log(
    `Exit Swiss Electricity Tariffs v${packageJson.version} in single run mode.`,
  );
})();
