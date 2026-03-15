import express, { type Request, Response, NextFunction } from "express";
import { createServer } from "http";
import cors from "cors";
import cookieParser from "cookie-parser";
import { registerRoutes } from "./routes/autocoder";
import { initializeSLMSystem } from "./modules/slm-registry";
import fs from "fs";
import path from "path";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

const app = express();
const httpServer = createServer(app);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ extended: false, limit: "50mb" }));
app.use(cookieParser());

app.use((_req, res, next) => {
  res.setHeader("Cross-Origin-Opener-Policy", "same-origin");
  res.setHeader("Cross-Origin-Embedder-Policy", "require-corp");
  next();
});

app.use((req, res, next) => {
  const start = Date.now();
  const reqPath = req.path;
  res.on("finish", () => {
    const duration = Date.now() - start;
    if (reqPath.startsWith("/api")) {
      console.log(`${req.method} ${reqPath} ${res.statusCode} in ${duration}ms`);
    }
  });
  next();
});

fs.mkdirSync("./cache", { recursive: true });

(async () => {
  await registerRoutes(httpServer, app);

  app.get("/cache/:filename", (req, res) => {
    const filename = req.params.filename;
    if (!filename.endsWith(".json.gz") || filename.includes("/") || filename.includes("..")) {
      return res.status(404).json({ error: "Not found" });
    }
    const filePath = path.resolve("./cache", filename);
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: "No snapshot available" });
    }
    res.setHeader("Content-Type", "application/gzip");
    res.setHeader("Content-Encoding", "identity");
    res.sendFile(filePath, { root: "/" });
  });

  app.use((err: any, _req: Request, res: Response, next: NextFunction) => {
    const status = err.status || err.statusCode || 500;
    const message = err.message || "Internal Server Error";
    console.error("Internal Server Error:", err);
    if (res.headersSent) return next(err);
    return res.status(status).json({ message });
  });

  httpServer.listen({ port, host: "0.0.0.0", reusePort: true }, async () => {
    console.log(`Server listening on port ${port}`);

    console.log("[Startup] Per-project snapshots enabled (prewarm disabled)");

    const aiBaseUrl = process.env.AI_INTEGRATIONS_OPENAI_BASE_URL || process.env.OPENAI_BASE_URL;
    const aiApiKey = process.env.AI_INTEGRATIONS_OPENAI_API_KEY || process.env.OPENAI_API_KEY;
    if (aiBaseUrl && aiApiKey) {
      initializeSLMSystem({ endpoint: aiBaseUrl });
      console.log("[Startup] SLM system initialized with AI endpoint");
    } else {
      initializeSLMSystem();
      console.log("[Startup] SLM system initialized (no endpoint — rules-only mode)");
    }
  });
})();
