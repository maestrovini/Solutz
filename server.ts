import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import 'dotenv/config';

const app = express();
const PORT = 3000;

app.use(express.json());

async function startServer() {
  const distPath = path.join(process.cwd(), 'dist');
  const hasBuild = fs.existsSync(path.join(distPath, 'index.html'));
  
  // Explicitly check current mode
  const rawNodeEnv = process.env.NODE_ENV;
  const isProd = rawNodeEnv === 'production' && hasBuild;

  console.log(`[SOLUTZ SERVER INITIALIZATION]`);
  console.log(`- NODE_ENV: "${rawNodeEnv}"`);
  console.log(`- dist/index.html exists: ${hasBuild}`);
  console.log(`- Resolved Mode: ${isProd ? 'PRODUCTION' : 'DEVELOPMENT / VITE MIDDLEWARE'}`);

  if (!isProd) {
    console.log('Starting server in DEVELOPMENT / VITE MIDDLEWARE mode...');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    // In 'spa' mode, Vite's middleware automatically handles serving and transforming index.html,
    // so we don't need a manual wildcard listener that intercepts and corrupts static asset paths.
    app.use(vite.middlewares);

    // Custom SPA fallback handling for Vite middleware mode to properly serve index.html on root/routes
    app.use('*', async (req, res, next) => {
      const url = req.originalUrl;
      // Skip static assets, APIs, or files with an extension
      if (url.includes('.') || url.startsWith('/api/')) {
        return next();
      }
      try {
        const htmlPath = path.resolve(process.cwd(), 'index.html');
        let template = fs.readFileSync(htmlPath, 'utf-8');
        template = await vite.transformIndexHtml(url, template);
        res.status(200).set({ 'Content-Type': 'text/html' }).end(template);
      } catch (e) {
        next(e);
      }
    });
  } else {
    console.log('Starting server in PRODUCTION static mode...');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
