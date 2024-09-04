import { getServer, runServer } from "../src/components/server/server.mjs";
/* TODO discover why the json import doesn't work */
// import elcomNumbersJSON from "../../constants/elcom-numbers/elcom-numbers.json";
import {elcomNumbers} from "../../constants/elcom-numbers/elcom-numbers.mjs"

import { beforeAll, afterAll, describe, test, expect } from "vitest";
import {
  scrapePDF,
  scrapePDFBatch,
} from "../src/components/scraper/scraper.mjs";

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
  test(
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
  test(
    "Doesn't crash on a non existent operator id.",
    async () => {
      const res = await scrapePDF(-1, 2024);
      const { pdfDownloadURL } = res;
      expect(pdfDownloadURL).toBeUndefined();
    },
    { timeout: 100 * 1000 },
  );
  test.only(
    "Scrapes PDFs in batch by giving a network operator IDs.",
    async () => {
      console.log(
        "elcomNumbers:",
        JSON.stringify(elcomNumbers),
      );
      const operatorIdArray = elcomNumbers.elcomNumbers.splice(0, 10);
      console.log("operatorIdArray:", JSON.stringify(operatorIdArray));
      const res = await scrapePDFBatch(operatorIdArray, 2023, 10);
      expect(res.length).to.equal(operatorIdArray.length);
    },
    { timeout: 100 * 1000 },
  );
});
