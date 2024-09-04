import packageJson from "../package.json" with { type: "json" };

import {
  getServer,
  runServer,
  initRouteHandlers,
} from "./components/server/server.mjs";
import process from "node:process";

console.log(`Started Swiss Electricity Tariffs v${packageJson.version}`);
console.log("Loaded environment variables: ", {
  envs: Object.keys(process.env)
    .filter((key) => ["HOST", "PORT"].includes(key))
    .sort()
    .reduce((acc, curr) => {
      return {
        ...acc,
        [curr]: (process.env[curr] || "")
          .toString()
          .split("")
          .map(() => "*")
          .slice(0, 10)
          .join(""),
      };
    }, {}),
});

if (!process.env.HOST || !process.env.PORT) {
  throw new Error(
    "Missing one or more required environment variables: HOST, PORT",
  );
}

let app = getServer();
app = initRouteHandlers(app);
({ app } = runServer(app));
