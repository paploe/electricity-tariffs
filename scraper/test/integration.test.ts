import { getServer, runServer } from "../src/components/server/server.mjs";
import elcomNumbersJSON from "../../constants/elcom-numbers/elcom-numbers.json";

import { beforeAll, afterAll, describe, test, expect } from "vitest";
import {
  scrapePDF,
  scrapePDFBatch,
} from "../src/components/scraper/scraper.mjs";
import {ask, searchFile} from "../src/components/openai/openai.mjs";
import * as path from "node:path";
import fs from "fs";

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

describe("Scraper", () => {
  test.skip(
    "Scrapes a single PDF by giving a network operator ID.",
    async () => {
      const res = await scrapePDF(525, 2024);
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
      const res = await scrapePDF(-1, 2024);
      const { pdfDownloadURL } = res;
      expect(pdfDownloadURL).toBeUndefined();
    },
    { timeout: 100 * 1000 },
  );
  test.skip(
    "Scrapes 2023 PDFs in batch by giving a network operator IDs.",
    async () => {
      const operatorIdArray = elcomNumbersJSON.elcomNumbers;
      const res = await scrapePDFBatch(operatorIdArray, 2023, 10);
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
      const res = await scrapePDFBatch(operatorIdArray, 2024, 1);
      expect(res).toBeDefined();
    },
    { timeout: elcomNumbersJSON.elcomNumbers.length * 20 * 1000 },
  );
  test.skip(
      "Can interact with OpenAI",
      async ()=>{
          const res = await ask({
              model: "gpt-4o-mini",
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
  )
    test(
        "Can interact with OpenAI uploading files",
        async ()=>{
            const res = await searchFile(
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
                        days: 2
                    }
                },
                {
                    file: fs.createReadStream(
                        path.resolve(`${__dirname}/../../database/pdf/2024/operator_6_Tarifblatt_2024.pdf`)
                    ),
                    purpose: "assistants",
                },
                "What is the name of this nework operator? Wie teuer ist der Grundpreis pro Zähler?"
            );
            console.log("OpenAi response (with file): ", JSON.stringify(res));
            expect((res as { text: any }).text).toBeDefined();
            expect((res as { citations: any }).citations).toBeDefined();
        },
        { timeout: 15000 },
    )
});
