import * as fsPromises from "fs/promises";
import * as fs from "fs";
import * as path from "path";
import axios from "axios";
import pLimit from "p-limit";
import { searchFile } from "../openai/openai.mjs";
import { mergeJsonFiles } from "../util/util.mjs";
import process from "node:process";
import { GraphQLClient, gql } from 'graphql-request';

const cwd = process.cwd();
console.log("The current working directory is", cwd);
async function downloadPDF(outputPath: fs.PathLike, url: string) {
  try {
    // Fetch the binary data (PDF) from the URL
    const response = await axios.get(url, { responseType: "stream" }); // Get as a stream

    // Ensure directory exists using fs.mkdirSync with recursive option
    if (typeof outputPath === "string") {
      fs.mkdirSync(path.dirname(outputPath), { recursive: true });
    }
    // Create a write stream to the file
    const writer = fs.createWriteStream(outputPath);

    // Pipe the response data into the file stream
    response.data.pipe(writer);

    // Return a Promise that resolves when the writing is done
    return new Promise((resolve, reject) => {
      writer.on("finish", resolve); // Resolve when the writing is complete
      writer.on("error", reject); // Reject if there's an error
    });
  } catch (error) {
    console.error("Error downloading the PDF:", error);
    throw error;
  }
}
async function scrapePDF(
  operatorId: number,
  year: number,
  databaseDir: string,
) {
  let pdfDownloadURL = "";
  // Define the path to save the PDF
  const pdfDownloadURLFilePath = path.resolve(
    `${databaseDir}/pdf-links/${year}`,
    `operator_${operatorId}_Tarifblatt_${year}_link.txt`,
  );
  const pdfFilePath = path.resolve(
    `${databaseDir}/pdf/${year}`,
    `operator_${operatorId}_Tarifblatt_${year}.pdf`,
  );
  const errorFilePath = path.resolve(
    `${databaseDir}/pdf-errors/${year}`,
    `operator_${operatorId}_error_Tarifblatt_${year}.json`,
  );
  if (fs.existsSync(pdfFilePath)) {
    console.log(`PDF file already exists ${pdfFilePath}`, {
      pdfFilePath,
    });

    axios.post('http://backend:8000/set_status/', { scrap_file: true });
    axios.post('http://backend:8000/set_status/', { download_file: true });

    return {
      pdfDownloadURLFilePath,
      pdfDownloadURL,
      pdfFilePath,
    };
  }

  try {

    const endpoint = 'https://www.strompreis.elcom.admin.ch/api/graphql';

    const graphQLClient = new GraphQLClient(endpoint, {});

    const query = gql`
      query OperatorDocuments($id: String!, $locale: String!) {
          operator(id: $id, locale: $locale) {
              geverDocuments {
                  url
                  year
              }
          }
      }
    `;

    const variables = {
      locale: 'de',
      id: String(operatorId)
    };

    interface Data {
      operator: {
        geverDocuments: [{
          year: string,
          url: string,
        }]
      }
    }

    const data = await graphQLClient.request(query, variables) as Data;
    const pdfDownloadURL_BASE = 'https://www.strompreis.elcom.admin.ch'
    const pdfDownloadURL_REL = data.operator.geverDocuments.filter((doc: any) => doc.year === String(2024))[0]["url"];
    pdfDownloadURL = pdfDownloadURL_BASE + pdfDownloadURL_REL

    axios.post('http://backend:8000/set_status/', { scrap_file: true });

    if (!pdfDownloadURL) {
      throw new Error(
        `PDF link with text 'Tarifblatt ${year} (PDF-Datei)' not found`,
      );
    }
    // Ensure directory exists using fs.mkdirSync with recursive option
    fs.mkdirSync(path.dirname(pdfDownloadURLFilePath), { recursive: true });
    await fsPromises.writeFile(pdfDownloadURLFilePath, pdfDownloadURL);

    console.log(`PDF URL saved successfully to ${pdfDownloadURLFilePath}`, {
      pdfDownloadURL,
    });

    axios.post('http://backend:8000/set_status/', { download_file: true });

    // Also save the PDF file to the disk
    await downloadPDF(pdfFilePath, pdfDownloadURL);

    console.log(`PDF file saved successfully to ${pdfFilePath}`);
    return {
      pdfDownloadURLFilePath,
      pdfDownloadURL,
      pdfFilePath,
    };
  } catch (error) {
    console.error(`Error occurred: `, error);
    // Ensure directory exists using fs.mkdirSync with recursive option
    fs.mkdirSync(path.dirname(errorFilePath), { recursive: true });
    await fsPromises.writeFile(
      errorFilePath,
      JSON.stringify(error, Object.getOwnPropertyNames(error)),
    );
    throw error;
  }
}

async function scrapePDFBatch(
  operatorIdArray: any[],
  year: number,
  maxConcurrent = 1,
  databaseDir: string,
) {
  const limit = pLimit(maxConcurrent);
  const limitInput = operatorIdArray.map((operatorId) => {
    return limit(() => {
      console.log(`activeCount: ${limit.activeCount}`);
      console.log(`pendingCount: ${limit.pendingCount}`);
      return scrapePDF(operatorId, year, databaseDir).catch((e) => {
        console.error("scrapePDFBatch error", e);
      });
    });
  });
  return Promise.all(limitInput);
}

async function processNetworkOperator(
  elcomNumber: number,
  promptFilePath: string,
  outputFile: string,
  databaseDir: string,
  outputDir: string,
  schemaDir: string,
) {
  console.log(
    `Processing network operator ${elcomNumber} with prompt ${promptFilePath}`,
  );
  const databaseDirPath = path.resolve(databaseDir);
  const outputDirPath = path.resolve(outputDir);
  const schemaDirPath = path.resolve(schemaDir);

  const networkOperators = [elcomNumber];
  for (const networkOperator of networkOperators) {
    try {
      console.log(
        `Downloading PDF for network operator ${networkOperator} to ${databaseDirPath}`,
      );
      const res = await scrapePDF(networkOperator, 2024, databaseDir);
      console.log(`Prompt OpenAI with the PDF and save the raw output`, res);

      const prompt = fs.readFileSync(
        path.resolve(`${promptFilePath}`).toString(),
        "utf8",
      );
      const inputFile = path.resolve(
        `${databaseDirPath}/pdf/2024/operator_${networkOperator}_Tarifblatt_2024.pdf`,
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

      axios.post('http://backend:8000/set_status/', { extract_data: true });

      const outputFilePath = path.resolve(
        `${outputFile.replaceAll("{{elcomNumber}}", elcomNumber.toString())}`,
      );
      // Ensure directory exists using fs.mkdirSync with recursive option
      fs.mkdirSync(path.dirname(outputFilePath), { recursive: true });
      await fsPromises.writeFile(
        outputFilePath,
        JSON.stringify(resFileSearch, null, 4),
      );

      console.log(
        `Harmonizing PDF for network operator ${networkOperator} using partial JSON schemas...`,
      );
      const textInputPath = path.resolve(
        `${outputDirPath}/${networkOperator}/harmonized_${networkOperator}.json`,
      );
      const textInputString = fs.readFileSync(textInputPath, "utf8");

      const splits = [1, 2, 3, 4, 5, 6];

      for (const split of splits) {
        console.log(
          `Harmonizing PDF for network operator ${networkOperator} using partial JSON schemas... split ${split}`,
        );

        const harmonize_data_label = `harmonize_data_${split}`;
        axios.post('http://backend:8000/set_status/', { [harmonize_data_label]: true });

        const JSONSchemaPath = path.resolve(
          `${schemaDirPath}/split-schema/split-schema-part-${split}.json`,
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

        const outputSplitFilePath = path.resolve(
          `${outputDirPath}/${networkOperator}/harmonized_split_${split}_raw.txt`,
        );
        // Ensure directory exists using fs.mkdirSync with recursive option
        fs.mkdirSync(path.dirname(outputSplitFilePath), { recursive: true });
        await fsPromises.writeFile(
          outputSplitFilePath,
          JSON.stringify(resFileSearch, null, 4),
        );
        const outputSplitFilePathParsed = path.resolve(
          `${outputDirPath}/${networkOperator}/harmonized_split_${split}_parsed.json`,
        );
        // Ensure directory exists using fs.mkdirSync with recursive option
        fs.mkdirSync(path.dirname(outputSplitFilePathParsed), {
          recursive: true,
        });
        const jsonObject = JSON.parse(
          (resFileSearch as { text: any }).text.value,
        );
        await fsPromises.writeFile(
          outputSplitFilePathParsed,
          JSON.stringify(jsonObject, null, 4),
        );

      }
      console.log(`Merging all split files: ${splits.toString()}`);
      const objectsToMerge = [];
      for (const split of splits) {
        const partialObjectPath = path.resolve(
          `${outputDirPath}/${networkOperator}/harmonized_split_${split}_parsed.json`,
        );
        const partialObjectString = fs.readFileSync(partialObjectPath, "utf8");
        const partialObject = JSON.parse(partialObjectString);
        objectsToMerge.push(partialObject);
      }
      const resMerge = mergeJsonFiles(objectsToMerge);
      const outputMergedFilePath = path.resolve(
        `${outputFile.replaceAll("{{elcomNumber}}", networkOperator.toString())}`,
      );
      // Ensure directory exists using fs.mkdirSync with recursive option
      fs.mkdirSync(path.dirname(outputMergedFilePath), { recursive: true });
      await fsPromises.writeFile(
        outputMergedFilePath,
        JSON.stringify(resMerge, null, 4),
      );

      axios.post('http://backend:8000/set_status/', { finalize_data: true });

      return { outputMergedFilePath, res: resMerge };
    } catch (e) {
      console.error(`error while processing operator ${elcomNumber}`, e);
    }
  }
}
export { scrapePDF, scrapePDFBatch, processNetworkOperator };
