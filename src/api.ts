import { UserProfile, Client, Process, Bank, MarketData } from './types';

const API_BASE = '/api';

export const api = {
  async getData() {
    const res = await fetch(`${API_BASE}/data`);
    return res.json();
  },
  async create(collection: string, data: any) {
    const res = await fetch(`${API_BASE}/${collection}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  async update(collection: string, id: string, data: any) {
    const res = await fetch(`${API_BASE}/${collection}/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    return res.json();
  },
  async delete(collection: string, id: string) {
    await fetch(`${API_BASE}/${collection}/${id}`, { method: 'DELETE' });
  }
};
