export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  role: 'admin' | 'user';
  agencyId?: string;
}

export interface Client {
  id?: string;
  name: string;
  email: string;
  phone: string;
  phone2?: string;
  cpf?: string;
  birthDate?: string;
  brokerId: string;
  createdAt: string;
}

export interface Bank {
  id?: string;
  name: string;
  logoUrl?: string;
  processTypes: ('MCMV' | 'SBPE' | 'Pró-Cotista' | 'Home Equity')[];
}

export interface Participant {
  id: string;
  type: 'buyer' | 'seller' | 'broker' | 'agency';
  name: string;
}

export interface StageHistory {
  stage: string;
  date: string;
}

export interface Notification {
  id: string;
  date: string;
  reason: string;
  createdAt: string;
}

export interface Process {
  id?: string;
  clientId: string;
  participants: Participant[];
  type: 'Aquisição à vista com FGTS' | 'Despachante' | 'Financiamento' | 'Home Equity';
  status: string;
  stage: string;
  stageHistory?: StageHistory[];
  notifications?: Notification[];
  bankId?: string;
  purchaseValue: number;
  financingValue?: number;
  financingType?: 'SBPE' | 'MCMV' | 'Pró-Cotista';
  value: number;
  brokerId: string;
  notes?: string;
  updatedAt: string;
}

export interface MarketData {
  id?: string;
  region: string;
  avgPrice: number;
  avgDaysOnMarket: number;
  interestRateTrend: number;
  date: string;
}

export interface Agency {
  id?: string;
  name: string;
  cnpj?: string;
  email: string;
  phone: string;
  address?: string;
  createdAt: string;
}

export interface Broker {
  id?: string;
  name: string;
  creci: string;
  email: string;
  phone: string;
  birthDate?: string;
  agencyId?: string;
  createdAt: string;
}
