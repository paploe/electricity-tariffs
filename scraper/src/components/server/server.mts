import koa from "koa";
import * as process from "node:process";

function getServer() {
  const app = new koa();
  app.on("error", (err, ctx) => {
    console.error("server error", err, ctx);
    ctx.throw(500, "server_error", {
      message: "An unexpected error occurred.",
    });
  });
  return app;
}

function initRouteHandlers(koaApp: koa<koa.DefaultState, koa.DefaultContext>) {
  koaApp.use(async (ctx, next) => {
    if (ctx.method === "GET" && ctx.path === "/scraper") {
      try {
        // Get query parameters
        const query = ctx.query;
        // Log query parameters to the console
        console.log(`The query parametes are: \n`, query);
        // Respond with the query parameters as JSON
      } catch (e) {
        console.error("Error executing scraper", e);
      }
    } else {
      await next();
    }
  });
  koaApp.use(async (ctx) => {
    console.log(`Got request on: ${new Date()}`, ctx);
    ctx.body = {
      message: "There is nothing here. Please consult the documentation.",
    };
  });
  return koaApp;
}

function runServer(koaApp: koa) {
  const host = process.env.HOST ?? "localhost";
  const port = process.env.PORT ? Number(process.env.PORT) : 3000;
  const baseUrl = `http://${host}:${port}`;
  const server = koaApp.listen(port, host, () => {
    console.log(`[ ready ] ${baseUrl}`);
  });
  console.log(`Connecting to http://${host}:${port}.`);
  return {
    app: koaApp,
    server,
    baseUrl,
  };
}

export { runServer, getServer, initRouteHandlers };
