import express, { type Express, type Request, type Response, type NextFunction } from "express";
import cors from "cors";
import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";
import { pinoHttp } from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use("/api", router);

// Serve static frontend assets from public directory (if built)
const currentDir =
  typeof __dirname !== "undefined"
    ? __dirname
    : path.dirname(fileURLToPath(import.meta.url));
const publicPath = path.join(currentDir, "public");

if (fs.existsSync(publicPath)) {
  app.use(express.static(publicPath));
  app.get("*", (req: Request, res: Response, next: NextFunction) => {
    if (req.path.startsWith("/api")) {
      return next();
    }
    const indexPath = path.join(publicPath, "index.html");
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      next();
    }
  });
}

// Global error handler
app.use((err: any, _req: Request, res: Response, _next: NextFunction) => {
  logger.error({ err }, "Unhandled request error");
  res.status(500).json({
    error: err.message || "Internal Server Error",
  });
});

export default app;

// Listen only when a PORT is provided (local dev / standalone). Vercel uses the
// default export above.
const rawPort = process.env["PORT"];

if (rawPort) {
  const port = Number(rawPort);

  if (!Number.isNaN(port) && port > 0) {
    app.listen(port, (err) => {
      if (err) {
        logger.error({ err }, "Error listening on port");
        process.exit(1);
      }

      logger.info({ port }, "Server listening");
    });
  }
}
