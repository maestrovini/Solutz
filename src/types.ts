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
  income?: number; // Renda Mensal
  hasFGTS?: boolean;
  maritalStatus?: 'Solteiro' | 'Casado' | 'Divorciado' | 'Viúvo' | 'União Estável';
  brokerId?: string;
  agencyId?: string;
  status?: 'Aprovado' | 'Condicionado' | 'Negado';
  statusDate?: string;
  createdAt: string;
}

export interface Bank {
  id?: string;
  name: string;
  logoUrl?: string;
  color?: string;
  simulatorUrl?: string;
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
  completed?: boolean;
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
  propertyId?: string;
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

export interface Property {
  id?: string;
  address: string;
  number?: string;
  complement?: string;
  neighborhood?: string; // Bairro
  city: string;
  state: string;
  zone?: string;
  registrationNumber?: string; // Matrícula
  additionalInfo?: string; // Informações
  price?: number; // Valor
  type: 'Casa' | 'Apartamento' | 'Terreno' | 'Comercial';
  createdAt: string;
  updatedAt: string;
}
