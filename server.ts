import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import fs from 'fs/promises';

const app = express();
const PORT = 3000;
const DATA_FILE = path.join(process.cwd(), 'data.json');

app.use(express.json());

// Initial data structure
const initialData = {
  users: [
    { uid: 'admin-1', email: 'vinicius.lopes@msn.com', displayName: 'Vinícius Lopes', role: 'admin' }
  ],
  clients: [
    { id: 'c1', name: 'João Silva', email: 'joao@email.com', phone: '(11) 98888-7777', brokerId: 'b1', createdAt: new Date().toISOString() }
  ],
  processes: [
    { 
      id: 'p1', 
      clientId: 'c1', 
      participants: [
        { id: 'a1', type: 'agency', name: 'Solutz Imóveis' },
        { id: 'b1', type: 'broker', name: 'Ricardo Santos' }
      ],
      type: 'Financiamento',
      status: 'Em andamento',
      stage: 'Aprovado',
      bankId: '1',
      purchaseValue: 500000,
      financingValue: 400000,
      value: 400000,
      brokerId: 'b1',
      updatedAt: new Date().toISOString()
    }
  ],
  agencies: [
    { id: 'a1', name: 'Solutz Imóveis', cnpj: '12.345.678/0001-90', email: 'contato@solutz.com', phone: '(11) 3333-4444', createdAt: new Date().toISOString() }
  ],
  brokers: [
    { id: 'b1', name: 'Ricardo Santos', creci: '12345-F', email: 'ricardo@solutz.com', phone: '(11) 97777-6666', agencyId: 'a1', createdAt: new Date().toISOString() }
  ],
  banks: [
    { id: '1', name: 'Caixa Econômica', processTypes: ['MCMV', 'SBPE', 'Pró-Cotista'], logoUrl: 'https://logodownload.org/wp-content/uploads/2014/05/caixa-logo-1.png' },
    { id: '2', name: 'Itaú', processTypes: ['SBPE', 'Home Equity'], logoUrl: 'https://logodownload.org/wp-content/uploads/2014/05/itau-logo-1.png' },
    { id: '3', name: 'Santander', processTypes: ['SBPE', 'Home Equity'], logoUrl: 'https://logodownload.org/wp-content/uploads/2014/05/santander-logo-1.png' }
  ],
  market_data: []
};

async function readData() {
  try {
    const content = await fs.readFile(DATA_FILE, 'utf-8');
    return JSON.parse(content);
  } catch {
    await fs.writeFile(DATA_FILE, JSON.stringify(initialData, null, 2));
    return initialData;
  }
}

async function writeData(data: any) {
  await fs.writeFile(DATA_FILE, JSON.stringify(data, null, 2));
}

// API Routes
app.get('/api/data', async (req, res) => {
  const data = await readData();
  res.json(data);
});

app.post('/api/:collection', async (req, res) => {
  const { collection } = req.params;
  const data = await readData();
  const newItem = { ...req.body, id: Math.random().toString(36).substr(2, 9) };
  
  if (data[collection]) {
    data[collection].push(newItem);
    await writeData(data);
    res.status(201).json(newItem);
  } else {
    res.status(404).send('Collection not found');
  }
});

app.put('/api/:collection/:id', async (req, res) => {
  const { collection, id } = req.params;
  const data = await readData();
  
  if (data[collection]) {
    const index = data[collection].findIndex((item: any) => item.id === id);
    if (index !== -1) {
      data[collection][index] = { ...data[collection][index], ...req.body };
      await writeData(data);
      res.json(data[collection][index]);
    } else {
      res.status(404).send('Item not found');
    }
  } else {
    res.status(404).send('Collection not found');
  }
});

app.delete('/api/:collection/:id', async (req, res) => {
  const { collection, id } = req.params;
  const data = await readData();
  
  if (data[collection]) {
    data[collection] = data[collection].filter((item: any) => item.id !== id);
    await writeData(data);
    res.status(204).send();
  } else {
    res.status(404).send('Collection not found');
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
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
