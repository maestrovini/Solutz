import { Participant, Client, Broker, Agency } from '../types';

export const resolveParticipantName = (
  p: Participant,
  clients: Client[],
  brokers: Broker[],
  agencies: Agency[]
): string => {
  if (!p) return 'N/A';
  
  if (p.type === 'buyer' || p.type === 'seller') {
    const client = clients.find(c => c.id === p.id);
    return client ? client.name : p.name;
  }
  
  if (p.type === 'broker') {
    const broker = brokers.find(b => b.id === p.id);
    return broker ? broker.name : p.name;
  }
  
  if (p.type === 'agency') {
    const agency = agencies.find(a => a.id === p.id);
    return agency ? agency.name : p.name;
  }
  
  return p.name || 'N/A';
};
