import { getServer, runServer } from "../src/components/server/server.mjs";

import { beforeAll, afterAll, describe, test, expect } from "vitest";
import {
  scrapePDF,
} from "../src/components/scraper/scraper.mjs";
import path from "node:path";
import fs from "fs";
import {searchFile} from "../src/components/openai/openai.mjs";
import fsPromises from "fs/promises";
import {mergeJsonFiles} from "../src/components/util/util.mjs";

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

describe("Combined workflows", () => {
  test(
    "Workflow: Download PDF --> Extract info by prompt --> Harmonize by split schemas --> merge JSON",
    async () => {
        const networkOperators = [290];
        for(const networkOperator of networkOperators) {
            console.log(`Downloading PDF for network operator ${networkOperator}`);
            const res = await scrapePDF(networkOperator, 2024);
            console.log(`Prompt OpenAI with the PDF and save the raw output`, res);

            const testSubfolder = networkOperator;
            const prompt = fs.readFileSync(
                path.resolve(`${__dirname}/../../prompts/simple-1.txt`).toString(),
                "utf8",
            );
            const inputFile = path.resolve(
                `${__dirname}/../../database/pdf/2024/operator_${networkOperator}_Tarifblatt_2024.pdf`,
            );
            const resFileSearch = await searchFile(
                {
                    name: "Electricity Tariff Analyst Assistant",
                    instructions:
                        "You are an expert analyst in electricity tariffs. Use you the provided files as a base to answer questions about electricity tarffs. Your output will be a JSON string without anything else.",
                    model: "gpt-4o-mini",
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
                "OpenAI's response to the PDF search: ",
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


            console.log(`Harmonizing PDF for network operator ${networkOperator} using partial JSON schemas...`);
            const textInputPath = path.resolve(
                `${__dirname}/../../output/test/${testSubfolder}/res_harmonized_1_raw.json`,
            );
            const textInputString = fs.readFileSync(textInputPath, "utf8");

            const splits = [1, 2, 3, 4, 5, 6];

            for (const split of splits) {
                console.log(`Harmonizing PDF for network operator ${networkOperator} using partial JSON schemas... split ${split}`);
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

                const outputSplitFilePath = path.resolve(
                    `${__dirname}/../../output/test/${testSubfolder}/res_harmonized_1_split_${split}_json_raw.json`,
                );
                // Ensure directory exists using fs.mkdirSync with recursive option
                fs.mkdirSync(path.dirname(outputSplitFilePath), { recursive: true });
                await fsPromises.writeFile(
                    outputSplitFilePath,
                    JSON.stringify(resFileSearch, null, 4),
                );
                const outputSplitFilePathParsed = path.resolve(
                    `${__dirname}/../../output/test/${testSubfolder}/res_harmonized_1_split_${split}_json_parsed.json`,
                );
                // Ensure directory exists using fs.mkdirSync with recursive option
                fs.mkdirSync(path.dirname(outputSplitFilePathParsed), { recursive: true });
                const jsonObject = JSON.parse(
                    (resFileSearch as { text: any }).text.value,
                );
                await fsPromises.writeFile(
                    outputSplitFilePathParsed,
                    JSON.stringify(jsonObject, null, 4),
                );
                expect((resFileSearch as { text: any }).text).toBeDefined();
                expect((resFileSearch as { citations: any }).citations).toBeDefined();
            }
            console.log(`Merging all split files: ${splits.toString()}`);
            const objectsToMerge = [];
            for (const split of splits) {
                const partialObjectPath = path.resolve(
                    `${__dirname}/../../output/test/${testSubfolder}/res_harmonized_1_split_${split}_json_parsed.json`,
                );
                const partialObjectString = fs.readFileSync(partialObjectPath, "utf8");
                const partialObject = JSON.parse(partialObjectString);
                objectsToMerge.push(partialObject);
            }
            const resMerge = mergeJsonFiles(objectsToMerge);
            expect(resMerge).toBeDefined();
            const outputMergedFilePath = path.resolve(
                `${__dirname}/../../output/test/${testSubfolder}/res_harmonized_complete.json`,
            );
            // Ensure directory exists using fs.mkdirSync with recursive option
            fs.mkdirSync(path.dirname(outputMergedFilePath), { recursive: true });
            await fsPromises.writeFile(outputMergedFilePath, JSON.stringify(resMerge, null, 4));
        }
    },
    { timeout: 60 * 60 * 1000 },
  );
});