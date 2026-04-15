import { Client, Broker, Agency, Participant } from '../types';

export const getParticipantName = (
  participant: Participant,
  clients: Client[],
  brokers: Broker[],
  agencies: Agency[]
): string => {
  if (participant.type === 'buyer' || participant.type === 'seller') {
    return clients.find(c => c.id === participant.id)?.name || participant.name;
  }
  if (participant.type === 'broker') {
    return brokers.find(b => b.id === participant.id)?.name || participant.name;
  }
  if (participant.type === 'agency') {
    return agencies.find(a => a.id === participant.id)?.name || participant.name;
  }
  return participant.name;
};
