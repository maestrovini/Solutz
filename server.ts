import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs';
import 'dotenv/config';
import webpush from 'web-push';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '25mb' }));
app.use(express.urlencoded({ extended: true, limit: '25mb' }));

// Endpoint to receive and save the authentic logo directly to public/
app.post('/api/upload-logo', (req, res) => {
  try {
    const { dataUrl } = req.body;
    if (!dataUrl) {
      return res.status(400).json({ error: 'dataUrl is required' });
    }
    const base64Data = dataUrl.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    
    const publicDir = path.join(process.cwd(), 'public');
    if (!fs.existsSync(publicDir)) {
      fs.mkdirSync(publicDir, { recursive: true });
    }
    
    fs.writeFileSync(path.join(publicDir, 'logo.png'), buffer);
    fs.writeFileSync(path.join(publicDir, 'logo.jpg'), buffer);
    fs.writeFileSync(path.join(publicDir, 'logo-icon.png'), buffer);
    
    res.json({ success: true, timestamp: Date.now() });
  } catch (error) {
    console.error('[LOGO] Error saving logo:', error);
    res.status(500).json({ error: 'Failed to save logo' });
  }
});

// Stable VAPID Keys setup for Push Notifications
let vapidKeys: { publicKey: string; privateKey: string };
const keysPath = path.join(process.cwd(), 'vapid-keys.json');

try {
  if (fs.existsSync(keysPath)) {
    vapidKeys = JSON.parse(fs.readFileSync(keysPath, 'utf8'));
  } else {
    vapidKeys = webpush.generateVAPIDKeys();
    fs.writeFileSync(keysPath, JSON.stringify(vapidKeys), 'utf8');
  }
} catch (e) {
  console.log('[PUSH SERVICE] Error caching VAPID keys, using dynamic fallback:', e);
  vapidKeys = webpush.generateVAPIDKeys();
}

try {
  webpush.setVapidDetails(
    'mailto:suporte@solutz.com.br',
    vapidKeys.publicKey,
    vapidKeys.privateKey
  );
  console.log('[PUSH SERVICE] VAPID details set successfully.');
} catch (err) {
  console.error('[PUSH SERVICE] Error setting VAPID details:', err);
}

// GET Web Push Public Key for client subscription
app.get('/api/push/public-key', (req, res) => {
  res.json({ publicKey: vapidKeys.publicKey });
});

// POST Send push notification to a single subscriber
app.post('/api/push/send', async (req, res) => {
  const { subscription, title, body, url } = req.body;

  if (!subscription) {
    return res.status(400).json({ error: 'Subscription data is required' });
  }

  const payload = JSON.stringify({
    title: title || 'Solutz',
    body: body || 'Nova mensagem recebida!',
    url: url || '/'
  });

  try {
    await webpush.sendNotification(subscription, payload);
    res.json({ success: true });
  } catch (err: any) {
    console.error('[PUSH SERVICE] Error dispatching push:', err);
    res.status(err.statusCode || 500).json({
      error: 'Failed to send notification',
      details: err.message,
      gone: err.statusCode === 410 || err.statusCode === 404
    });
  }
});

// POST Send push notifications to multiple subscribers
app.post('/api/push/send-multiple', async (req, res) => {
  const { subscriptions, title, body, url } = req.body;

  if (!subscriptions || !Array.isArray(subscriptions)) {
    return res.status(400).json({ error: 'Subscriptions array is required' });
  }

  const payload = JSON.stringify({
    title: title || 'Solutz',
    body: body || 'Nova atualização no sistema!',
    url: url || '/'
  });

  const results = await Promise.allSettled(
    subscriptions.map(async (sub) => {
      // Support both raw subscriptions or saved Firestore subscription document entities
      const rawSub = sub.subscription || sub;
      if (rawSub && rawSub.endpoint) {
        await webpush.sendNotification(rawSub, payload);
      }
    })
  );

  const successes = results.filter(r => r.status === 'fulfilled').length;
  const failures = results.filter(r => r.status === 'rejected').length;

  res.json({
    success: true,
    total: subscriptions.length,
    successes,
    failures
  });
});

// PWA Manifest and Service Worker routes with exact required MIME types
app.get(['/manifest.json', '/manifest.webmanifest'], (req, res) => {
  res.setHeader('Content-Type', 'application/manifest+json; charset=utf-8');
  res.setHeader('Cache-Control', 'public, max-age=3600');
  res.sendFile(path.join(process.cwd(), 'public', 'manifest.json'));
});

app.get('/sw.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
  res.setHeader('Service-Worker-Allowed', '/');
  res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
  res.sendFile(path.join(process.cwd(), 'public', 'sw.js'));
});

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
