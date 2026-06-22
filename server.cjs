var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_express = __toESM(require("express"), 1);
var import_vite = require("vite");
var import_path = __toESM(require("path"), 1);
var import_fs = __toESM(require("fs"), 1);
var import_config = require("dotenv/config");
var import_web_push = __toESM(require("web-push"), 1);
var app = (0, import_express.default)();
var PORT = 3e3;
app.use(import_express.default.json());
var vapidKeys;
var keysPath = import_path.default.join(process.cwd(), "vapid-keys.json");
try {
  if (import_fs.default.existsSync(keysPath)) {
    vapidKeys = JSON.parse(import_fs.default.readFileSync(keysPath, "utf8"));
  } else {
    vapidKeys = import_web_push.default.generateVAPIDKeys();
    import_fs.default.writeFileSync(keysPath, JSON.stringify(vapidKeys), "utf8");
  }
} catch (e) {
  console.log("[PUSH SERVICE] Error caching VAPID keys, using dynamic fallback:", e);
  vapidKeys = import_web_push.default.generateVAPIDKeys();
}
try {
  import_web_push.default.setVapidDetails(
    "mailto:suporte@solutz.com.br",
    vapidKeys.publicKey,
    vapidKeys.privateKey
  );
  console.log("[PUSH SERVICE] VAPID details set successfully.");
} catch (err) {
  console.error("[PUSH SERVICE] Error setting VAPID details:", err);
}
app.get("/api/push/public-key", (req, res) => {
  res.json({ publicKey: vapidKeys.publicKey });
});
app.post("/api/push/send", async (req, res) => {
  const { subscription, title, body, url } = req.body;
  if (!subscription) {
    return res.status(400).json({ error: "Subscription data is required" });
  }
  const payload = JSON.stringify({
    title: title || "Solutz",
    body: body || "Nova mensagem recebida!",
    url: url || "/"
  });
  try {
    await import_web_push.default.sendNotification(subscription, payload);
    res.json({ success: true });
  } catch (err) {
    console.error("[PUSH SERVICE] Error dispatching push:", err);
    res.status(err.statusCode || 500).json({
      error: "Failed to send notification",
      details: err.message,
      gone: err.statusCode === 410 || err.statusCode === 404
    });
  }
});
app.post("/api/push/send-multiple", async (req, res) => {
  const { subscriptions, title, body, url } = req.body;
  if (!subscriptions || !Array.isArray(subscriptions)) {
    return res.status(400).json({ error: "Subscriptions array is required" });
  }
  const payload = JSON.stringify({
    title: title || "Solutz",
    body: body || "Nova atualiza\xE7\xE3o no sistema!",
    url: url || "/"
  });
  const results = await Promise.allSettled(
    subscriptions.map(async (sub) => {
      const rawSub = sub.subscription || sub;
      if (rawSub && rawSub.endpoint) {
        await import_web_push.default.sendNotification(rawSub, payload);
      }
    })
  );
  const successes = results.filter((r) => r.status === "fulfilled").length;
  const failures = results.filter((r) => r.status === "rejected").length;
  res.json({
    success: true,
    total: subscriptions.length,
    successes,
    failures
  });
});
async function startServer() {
  const distPath = import_path.default.join(process.cwd(), "dist");
  const hasBuild = import_fs.default.existsSync(import_path.default.join(distPath, "index.html"));
  const rawNodeEnv = process.env.NODE_ENV;
  const isProd = rawNodeEnv === "production" && hasBuild;
  console.log(`[SOLUTZ SERVER INITIALIZATION]`);
  console.log(`- NODE_ENV: "${rawNodeEnv}"`);
  console.log(`- dist/index.html exists: ${hasBuild}`);
  console.log(`- Resolved Mode: ${isProd ? "PRODUCTION" : "DEVELOPMENT / VITE MIDDLEWARE"}`);
  if (!isProd) {
    console.log("Starting server in DEVELOPMENT / VITE MIDDLEWARE mode...");
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
    app.use("*", async (req, res, next) => {
      const url = req.originalUrl;
      if (url.includes(".") || url.startsWith("/api/")) {
        return next();
      }
      try {
        const htmlPath = import_path.default.resolve(process.cwd(), "index.html");
        let template = import_fs.default.readFileSync(htmlPath, "utf-8");
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ "Content-Type": "text/html" }).end(template);
      } catch (e) {
        next(e);
      }
    });
  } else {
    console.log("Starting server in PRODUCTION static mode...");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
