import { getServer, runServer } from "../src/components/server/server.mjs";

import { beforeAll, afterAll, describe, test, expect } from "vitest";
import { processNetworkOperator } from "../src/components/scraper/scraper.mjs";

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
      const networkOperators = [20];
      for (const networkOperator of networkOperators) {
        const res = await processNetworkOperator(
          networkOperator,
          "simple-3.txt",
          "res_harmonized_complete.json",
        );
        expect(res).toBeDefined();
      }
    },
    { timeout: 60 * 60 * 1000 },
  );
});
