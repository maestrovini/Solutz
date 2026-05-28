export interface UserProfile {
  id?: string;
  uid: string;
  username: string;
  password?: string;
  email?: string;
  displayName: string;
  role: 'admin' | 'user';
  agencyId?: string;
}

export interface ApprovedBank {
  bankId: string;
  approvedValue: number;
  expirationDate: string;
}

export interface Client {
  id?: string;
  name: string;
  email: string;
  phone: string;
  phone2?: string;
  cpf?: string;
  pis?: string;
  birthDate?: string;
  income?: number; // Renda Mensal
  incomeReferenceMonth?: string; // Mês de Referência (mm/aaaa)
  hasFGTS?: boolean;
  maritalStatus?: 'Solteiro' | 'Casado' | 'Divorciado' | 'Viúvo' | 'União Estável';
  brokerId?: string;
  agencyId?: string;
  status?: 'Aprovado' | 'Condicionado' | 'Negado' | 'Vencido';
  approvedBanks?: ApprovedBank[];
  createdAt: string;
}

export interface Bank {
  id?: string;
  name: string;
  logoUrl?: string;
  color?: string;
  simulatorUrl?: string;
  processTypes: ('MCMV' | 'SBPE' | 'Pró-Cotista' | 'Home Equity')[];
  productTypes?: string[];
}

export interface Participant {
  id: string;
  type: 'buyer' | 'seller' | 'broker' | 'agency' | 'proxy';
  name: string;
  representsIds?: string[];
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
  isAssistedPurchase?: boolean;
  assistedPurchaseValue?: number;
  hasDispatcher?: boolean;
  dispatcherValue?: number;
  isDispatcherPaid?: boolean;
  dispatcherPaymentDate?: string;
  hasIQ?: boolean;
  iqBankId?: string;
  iqDebtValue?: number;
  value: number;
  agency?: string;
  signatureType?: 'Digital' | 'Física';
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
  cep?: string; // CEP
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

export interface Product {
  id?: string;
  clientId: string; // Cliente que contratou
  name: string; // Descrição do produto vendido (ex: "Consórcio R$ 200k", "Seguro Habitacional")
  bankId: string; // ID do Banco associado
  category: string;
  value: number; // Valor do Produto / Venda / Crédito
  interestRate?: string; // Taxa contratada ou Taxa de Adm
  termMonths?: number; // Prazo contratado em meses
  commissionPercent?: number; // % de comissão
  commissionValue?: number; // R$ de comissão
  status: 'Em andamento' | 'Finalizado' | 'Cancelado';
  stage: 'Simulação' | 'Análise Cliente' | 'Contratado';
  brokerId?: string; // Corretor que vendeu/indicou
  expirationDate?: string; // Data de vencimento
  notes?: string; // Observações / Detalhes
  createdAt: string;
  updatedAt: string;
}

