import { getServer, runServer } from "../src/components/server/server.mjs";
import elcomNumbersJSON from "../../constants/elcom-numbers/elcom-numbers.json";

import { beforeAll, afterAll, describe, test, expect } from "vitest";
import {
  scrapePDF,
  scrapePDFBatch,
} from "../src/components/scraper/scraper.mjs";
import { ask, searchFile } from "../src/components/openai/openai.mjs";
import * as path from "node:path";
import fs from "fs";
import fsPromises from "fs/promises";
import { mergeJsonFiles } from "../src/components/util/util.mjs";
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Get the __filename equivalent
// @ts-ignore
const __filename = fileURLToPath(import.meta.url);

// Get the __dirname equivalent
const __dirname = dirname(__filename);

let app: any;
let server: { close: () => void };

beforeAll(() => {
  app = getServer();
  // Destructure and reassign app and server
  ({ app, server } = runServer(app));
});

afterAll(() => {
  server.close();
  console.log("Server closed.");
});

const databaseDir = path.resolve(`${__dirname}/../../database`).toString();

describe.skip("Scraper", () => {
  test.skip(
    "Scrapes a single PDF by giving a network operator ID.",
    async () => {
      const res = await scrapePDF(525, 2024, databaseDir);
      const { pdfDownloadURLFilePath, pdfDownloadURL, pdfFilePath } = res;
      expect(pdfDownloadURLFilePath).toBeDefined();
      expect(pdfDownloadURL).toBeDefined();
      expect(pdfFilePath).toBeDefined();
    },
    { timeout: 100 * 1000 },
  );
  test.skip(
    "Doesn't crash on a non existent operator id.",
    async () => {
      const res = await scrapePDF(-1, 2024, databaseDir);
      const { pdfDownloadURL } = res;
      expect(pdfDownloadURL).toBeUndefined();
    },
    { timeout: 100 * 1000 },
  );
  test.skip(
    "Scrapes 2023 PDFs in batch by giving a network operator IDs.",
    async () => {
      const operatorIdArray = elcomNumbersJSON.elcomNumbers;
      const res = await scrapePDFBatch(operatorIdArray, 2023, 10, databaseDir);
      expect(res.length).to.equal(operatorIdArray.length);
    },
    { timeout: 100 * 1000 },
  );
  test.skip(
    "Scrapes 2024 PDFs in batch by giving a network operator IDs.",
    async () => {
      // resuming
      /*const lastScannedOperatorIndex =
              elcomNumbersJSON.elcomNumbers.indexOf(410);*/
      const operatorIdArray = elcomNumbersJSON.elcomNumbers.slice(
        0,
        elcomNumbersJSON.elcomNumbers.length,
      );
      const res = await scrapePDFBatch(operatorIdArray, 2024, 1, databaseDir);
      expect(res).toBeDefined();
    },
    { timeout: elcomNumbersJSON.elcomNumbers.length * 20 * 1000 },
  );
});

describe.skip("OpenAI", () => {
  test.skip(
    "Can interact with OpenAI",
    async () => {
      const res = await ask({
        model: "gpt-4o",
        messages: [
          { role: "system", content: "You are a helpful assistant." },
          {
            role: "user",
            content: "Write a haiku about recursion in programming.",
          },
        ],
      });
      console.log("OpenAi response: ", res.choices[0].message);
      expect(res.choices[0].message).toBeDefined();
    },
    { timeout: 5000 },
  );
  test.skip(
    "Can interact with OpenAI uploading files",
    async () => {
      const res = await searchFile(
        {
          name: "Electricity Tariff Analyst Assistant",
          instructions:
            'You are an expert analyst in electricity tariffs. Use you the provided files as a base to answer questions about electricity tarffs. Always give a JSON output like {"jsonDownloadURL": "the url to download the generated file"}',
          model: "gpt-4o",
          tools: [{ type: "file_search" }],
          response_format: { type: "json_object" },
        },
        [
          // path.resolve(`${__dirname}/../../database/pdf/2024/operator_3_Tarifblatt_2024.pdf`),
          // path.resolve(`${__dirname}/../../database/pdf/2024/operator_5_Tarifblatt_2024.pdf`),
          // path.resolve(`${__dirname}/../../database/pdf/2024/operator_6_Tarifblatt_2024.pdf`)
        ],
        {
          name: "Electricity Tariffs 2024",
          // Manage the costs with a shorer expiry: https://platform.openai.com/docs/assistants/tools/file-search
          expires_after: {
            anchor: "last_active_at",
            days: 2,
          },
        },
        [
          {
            file: fs.createReadStream(
              path.resolve(
                `${__dirname}/../../database/pdf/2024/operator_6_Tarifblatt_2024.pdf`,
              ),
            ),
            purpose: "assistants",
          },
          {
            file: fs.createReadStream(
              path.resolve(
                `${__dirname}/../../database/pdf/2024/operator_7_Tarifblatt_2024.pdf`,
              ),
            ),
            purpose: "assistants",
          },
        ],
        "What are the names of this two network operators?",
      );
      console.log("OpenAi response (with file): ", JSON.stringify(res));
      expect((res as { text: any }).text).toBeDefined();
      expect((res as { citations: any }).citations).toBeDefined();
    },
    { timeout: 15000 },
  );
  test.skip(
    "Can harmonize a PDF according to a JSON schema (all splits) and a previous query result (operator_3_Tarifblatt_2024)",
    async () => {
      const testSubfolder = "2";
      const textInputPath = path.resolve(
        `${__dirname}/../../output/test/${testSubfolder}/res_harmonized_1_raw.json`,
      );
      const textInputString = fs.readFileSync(textInputPath, "utf8");

      const splits = [1, 2, 3, 4, 5, 6];
      const inputFile = path.resolve(
        `${__dirname}/../../database/pdf/2024/operator_3_Tarifblatt_2024.pdf`,
      );
      for (const split of splits) {
        const JSONSchemaPath = path.resolve(
          `${__dirname}/../../schema/split-schema/split-schema-part-${split}.json`,
        );
        const JSONSchemaString = fs.readFileSync(JSONSchemaPath, "utf8");
        const JSONSchema = JSON.parse(JSONSchemaString);

        const resFileSearch = await searchFile(
          {
            name: "Electricity Tariff Analyst Assistant",
            instructions:
              "You are an expert analyst in electricity tariffs. Use you the provided files as a base to answer questions about electricity tarffs.",
            // model: "gpt-4o-2024-08-06",
            model: "gpt-4o-mini",
            tools: [],
            // issue: https://community.openai.com/t/structured-outputs-dont-currently-work-with-file-search-tool-in-assistants-api/900538
            // issue: https://community.openai.com/t/assistants-api-why-is-json-mode-not-available-when-using-file-search-code-interpreter/743449/7
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "tariff_response",
                schema: JSONSchema,
                strict: true,
              },
            },
          },
          [inputFile],
          {
            name: "Electricity Tariffs 2024",
            // Manage the costs with a shorer expiry: https://platform.openai.com/docs/assistants/tools/file-search
            expires_after: {
              anchor: "last_active_at",
              days: 2,
            },
          },
          [
            {
              file: fs.createReadStream(inputFile),
              purpose: "assistants",
            },
          ],
          `Convert this snippet to JSON: \n ${textInputString}`,
        );
        console.log(
          "OpenAi response (file search): ",
          JSON.stringify(resFileSearch),
        );
        expect(resFileSearch).toBeDefined();

        const outputFilePath = path.resolve(
          `${__dirname}/../../output/test/${testSubfolder}/res_harmonized_1_split_${split}_json_raw.json`,
        );
        // Ensure directory exists using fs.mkdirSync with recursive option
        fs.mkdirSync(path.dirname(outputFilePath), { recursive: true });
        await fsPromises.writeFile(
          outputFilePath,
          JSON.stringify(resFileSearch, null, 4),
        );
        const outputFilePathParsed = path.resolve(
          `${__dirname}/../../output/test/${testSubfolder}/res_harmonized_1_split_${split}_json_parsed.json`,
        );
        // Ensure directory exists using fs.mkdirSync with recursive option
        fs.mkdirSync(path.dirname(outputFilePathParsed), { recursive: true });
        const jsonObject = JSON.parse(
          (resFileSearch as { text: any }).text.value,
        );
        await fsPromises.writeFile(
          outputFilePathParsed,
          JSON.stringify(jsonObject, null, 4),
        );
        expect((resFileSearch as { text: any }).text).toBeDefined();
        expect((resFileSearch as { citations: any }).citations).toBeDefined();
      }
    },
    { timeout: 5 * 60 * 1000 },
  );
  test.skip(
    "Can harmonize a PDF according to a JSON schema (all splits) and a previous query result (operator_10_Tarifblatt_2024)",
    async () => {
      const testSubfolder = "2";
      const textInputPath = path.resolve(
        `${__dirname}/../../output/test/${testSubfolder}/res_harmonized_1_raw.json`,
      );
      const textInputString = fs.readFileSync(textInputPath, "utf8");

      const splits = [1, 2, 3, 4, 5, 6];
      const inputFile = path.resolve(
        `${__dirname}/../../database/pdf/2024/operator_10_Tarifblatt_2024.pdf`,
      );
      for (const split of splits) {
        const JSONSchemaPath = path.resolve(
          `${__dirname}/../../schema/split-schema/split-schema-part-${split}.json`,
        );
        const JSONSchemaString = fs.readFileSync(JSONSchemaPath, "utf8");
        const JSONSchema = JSON.parse(JSONSchemaString);

        const resFileSearch = await searchFile(
          {
            name: "Electricity Tariff Analyst Assistant",
            instructions:
              "You are an expert analyst in electricity tariffs. Use you the provided files as a base to answer questions about electricity tarffs.",
            // model: "gpt-4o-2024-08-06",
            model: "gpt-4o-mini",
            tools: [],
            // issue: https://community.openai.com/t/structured-outputs-dont-currently-work-with-file-search-tool-in-assistants-api/900538
            // issue: https://community.openai.com/t/assistants-api-why-is-json-mode-not-available-when-using-file-search-code-interpreter/743449/7
            response_format: {
              type: "json_schema",
              json_schema: {
                name: "tariff_response",
                schema: JSONSchema,
                strict: true,
              },
            },
          },
          [inputFile],
          {
            name: "Electricity Tariffs 2024",
            // Manage the costs with a shorer expiry: https://platform.openai.com/docs/assistants/tools/file-search
            expires_after: {
              anchor: "last_active_at",
              days: 2,
            },
          },
          [
            {
              file: fs.createReadStream(inputFile),
              purpose: "assistants",
            },
          ],
          `Convert this snippet to JSON: \n ${textInputString}`,
        );
        console.log(
          "OpenAi response (file search): ",
          JSON.stringify(resFileSearch),
        );
        expect(resFileSearch).toBeDefined();

        const outputFilePath = path.resolve(
          `${__dirname}/../../output/test/${testSubfolder}/res_harmonized_1_split_${split}_json_raw.json`,
        );
        // Ensure directory exists using fs.mkdirSync with recursive option
        fs.mkdirSync(path.dirname(outputFilePath), { recursive: true });
        await fsPromises.writeFile(
          outputFilePath,
          JSON.stringify(resFileSearch, null, 4),
        );
        const outputFilePathParsed = path.resolve(
          `${__dirname}/../../output/test/${testSubfolder}/res_harmonized_1_split_${split}_json_parsed.json`,
        );
        // Ensure directory exists using fs.mkdirSync with recursive option
        fs.mkdirSync(path.dirname(outputFilePathParsed), { recursive: true });
        const jsonObject = JSON.parse(
          (resFileSearch as { text: any }).text.value,
        );
        await fsPromises.writeFile(
          outputFilePathParsed,
          JSON.stringify(jsonObject, null, 4),
        );
        expect((resFileSearch as { text: any }).text).toBeDefined();
        expect((resFileSearch as { citations: any }).citations).toBeDefined();
      }
    },
    { timeout: 5 * 60 * 1000 * { splits: 6 }.splits },
  );
  test.skip(
    "Can search a PDF file and save a raw text output (operator_3_Tarifblatt_2024)",
    async () => {
      const testSubfolder = "1";
      const prompt = fs.readFileSync(
        path.resolve(`${__dirname}/../../prompts/simple-1.txt`).toString(),
        "utf8",
      );
      // const JSONSchemaPath = path.resolve(`${__dirname}/../../schema/split-schema/split-schema-part-1.json`);
      // const JSONSchemaString = fs.readFileSync(JSONSchemaPath, 'utf8');
      // const JSONSchema = JSON.parse(JSONSchemaString);
      const inputFile = path.resolve(
        `${__dirname}/../../database/pdf/2024/operator_3_Tarifblatt_2024.pdf`,
      );
      const resFileSearch = await searchFile(
        {
          name: "Electricity Tariff Analyst Assistant",
          instructions:
            "You are an expert analyst in electricity tariffs. Use you the provided files as a base to answer questions about electricity tarffs. Your output will be a JSON string without anything else.",
          model: "gpt-4o-2024-08-06",
          tools: [
            {
              type: "file_search",
            },
          ],
          // issue: https://community.openai.com/t/structured-outputs-dont-currently-work-with-file-search-tool-in-assistants-api/900538
          // issue: https://community.openai.com/t/assistants-api-why-is-json-mode-not-available-when-using-file-search-code-interpreter/743449/7
        },
        [inputFile],
        {
          name: "Electricity Tariffs 2024",
          // Manage the costs with a shorer expiry: https://platform.openai.com/docs/assistants/tools/file-search
          expires_after: {
            anchor: "last_active_at",
            days: 2,
          },
        },
        [
          {
            file: fs.createReadStream(inputFile),
            purpose: "assistants",
          },
        ],
        prompt,
      );
      console.log(
        "OpenAi response (file search): ",
        JSON.stringify(resFileSearch),
      );
      expect(resFileSearch).toBeDefined();

      const outputFilePath = path.resolve(
        `${__dirname}/../../output/test/${testSubfolder}/res_harmonized_1_raw.json`,
      );
      // Ensure directory exists using fs.mkdirSync with recursive option
      fs.mkdirSync(path.dirname(outputFilePath), { recursive: true });
      await fsPromises.writeFile(
        outputFilePath,
        JSON.stringify(resFileSearch, null, 4),
      );
      expect((resFileSearch as { text: any }).text).toBeDefined();
      expect((resFileSearch as { citations: any }).citations).toBeDefined();
    },
    { timeout: 5 * 60 * 1000 },
  );
  test.skip(
    "Can search a PDF file and save a raw text output (operator_10_Tarifblatt_2024)",
    async () => {
      const testSubfolder = "2";
      const prompt = fs.readFileSync(
        path.resolve(`${__dirname}/../../prompts/simple-1.txt`).toString(),
        "utf8",
      );
      // const JSONSchemaPath = path.resolve(`${__dirname}/../../schema/split-schema/split-schema-part-1.json`);
      // const JSONSchemaString = fs.readFileSync(JSONSchemaPath, 'utf8');
      // const JSONSchema = JSON.parse(JSONSchemaString);
      const inputFile = path.resolve(
        `${__dirname}/../../database/pdf/2024/operator_10_Tarifblatt_2024.pdf`,
      );
      const resFileSearch = await searchFile(
        {
          name: "Electricity Tariff Analyst Assistant",
          instructions:
            "You are an expert analyst in electricity tariffs. Use you the provided files as a base to answer questions about electricity tarffs. Your output will be a JSON string without anything else.",
          model: "gpt-4o-2024-08-06",
          tools: [
            {
              type: "file_search",
            },
          ],
          // issue: https://community.openai.com/t/structured-outputs-dont-currently-work-with-file-search-tool-in-assistants-api/900538
          // issue: https://community.openai.com/t/assistants-api-why-is-json-mode-not-available-when-using-file-search-code-interpreter/743449/7
        },
        [inputFile],
        {
          name: "Electricity Tariffs 2024",
          // Manage the costs with a shorer expiry: https://platform.openai.com/docs/assistants/tools/file-search
          expires_after: {
            anchor: "last_active_at",
            days: 2,
          },
        },
        [
          {
            file: fs.createReadStream(inputFile),
            purpose: "assistants",
          },
        ],
        prompt,
      );
      console.log(
        "OpenAi response (file search): ",
        JSON.stringify(resFileSearch),
      );
      expect(resFileSearch).toBeDefined();

      const outputFilePath = path.resolve(
        `${__dirname}/../../output/test/${testSubfolder}/res_harmonized_1_raw.json`,
      );
      // Ensure directory exists using fs.mkdirSync with recursive option
      fs.mkdirSync(path.dirname(outputFilePath), { recursive: true });
      await fsPromises.writeFile(
        outputFilePath,
        JSON.stringify(resFileSearch, null, 4),
      );
      expect((resFileSearch as { text: any }).text).toBeDefined();
      expect((resFileSearch as { citations: any }).citations).toBeDefined();
    },
    { timeout: 5 * 60 * 1000 },
  );
});

describe.only("Utils", () => {
  test.only(
    "Can merge multiple json files",
    async () => {
      const splits = [1, 2, 3, 4, 5, 6];
      const objectsToMerge = [];
      const testSubfolder = "525";
      for (const split of splits) {
        const partialObjectPath = path.resolve(
          `${__dirname}/../../output/test/${testSubfolder}/res_harmonized_1_split_${split}_json_parsed.json`,
        );
        const partialObjectString = fs.readFileSync(partialObjectPath, "utf8");
        const partialObject = JSON.parse(partialObjectString);
        objectsToMerge.push(partialObject);
      }
      const res = mergeJsonFiles(objectsToMerge);
      expect(res).toBeDefined();
      const outputFilePath = path.resolve(
        `${__dirname}/../../output/test/${testSubfolder}/res_harmonized_complete.json`,
      );
      // Ensure directory exists using fs.mkdirSync with recursive option
      fs.mkdirSync(path.dirname(outputFilePath), { recursive: true });
      await fsPromises.writeFile(outputFilePath, JSON.stringify(res, null, 4));
    },
    { timeout: 5 * 60 * 1000 },
  );
});
