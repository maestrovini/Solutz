import { api } from '../api';
import { Client, Process, Agency, Broker, Participant, ApprovedBank } from '../types';

/**
 * Checks if a given date string is strictly in the past (expired).
 * Supports YYYY-MM-DD, DD/MM/YYYY or ISO strings.
 */
export function isDateExpired(dateStr?: string): boolean {
  if (!dateStr || !dateStr.trim()) return false;
  let normalized = dateStr.trim();
  
  if (normalized.includes('/')) {
    const parts = normalized.split('/');
    if (parts.length === 3) {
      if (parts[0].length === 4) {
        // YYYY/MM/DD
        normalized = `${parts[0]}-${parts[1].padStart(2, '0')}-${parts[2].padStart(2, '0')}`;
      } else {
        // DD/MM/YYYY
        normalized = `${parts[2]}-${parts[1].padStart(2, '0')}-${parts[0].padStart(2, '0')}`;
      }
    }
  } else if (normalized.includes('T')) {
    normalized = normalized.split('T')[0];
  }

  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  
  return normalized < todayStr;
}

/**
 * Returns all non-expired approved banks for a client.
 */
export function getValidApprovedBanks(client: Client): ApprovedBank[] {
  if (!client.approvedBanks || client.approvedBanks.length === 0) return [];
  return client.approvedBanks.filter(b => !isDateExpired(b.expirationDate));
}

/**
 * Checks if a client currently has any process (active or completed, not cancelled).
 */
export function hasActiveProcess(clientId: string, processes: Process[]): boolean {
  return processes.some(p => {
    const isClient = p.clientId === clientId || p.participants?.some(part => part.id === clientId);
    if (!isClient) return false;
    return p.status !== 'Cancelado';
  });
}

/**
 * Creates a new process in "Aprovado" stage for an approved client.
 */
export async function createProcessForApprovedClient(
  client: Client, 
  agencies: Agency[] = [], 
  brokers: Broker[] = [],
  existingProcesses?: Process[]
): Promise<Process | null> {
  if (!client || !client.id) return null;

  // Safeguard: Ensure client does not already have an active/completed process
  let listToCheck = existingProcesses;
  if (!listToCheck) {
    try {
      listToCheck = (await api.list('processes')) as Process[] || [];
    } catch {
      listToCheck = [];
    }
  }
  if (hasActiveProcess(client.id, listToCheck)) {
    console.warn(`[createProcessForApprovedClient] Cliente ${client.name} (${client.id}) já possui processo.`);
    return null;
  }

  const validBanks = getValidApprovedBanks(client);
  const bankToUse = validBanks[0] || client.approvedBanks?.[0];
  if (!bankToUse) return null;

  const initialFinancingValue = bankToUse.approvedValue || 0;
  const initialBankId = bankToUse.bankId || '';
  let initialExpirationDate: string = '';
  if (bankToUse.expirationDate) {
    initialExpirationDate = bankToUse.expirationDate.includes('/')
      ? bankToUse.expirationDate.split('/').reverse().join('-')
      : bankToUse.expirationDate;
  }

  const initialParticipants: Participant[] = [
    {
      id: client.id,
      name: client.name || '',
      type: 'buyer'
    }
  ];

  if (client.brokerId) {
    const broker = brokers.find(b => b.id === client.brokerId);
    if (broker) {
      initialParticipants.push({
        id: broker.id || client.brokerId,
        type: 'broker',
        name: broker.name || ''
      });
    }
  }

  let agencyName = '';
  if (client.agencyId) {
    const agencyObj = agencies.find(a => a.id === client.agencyId);
    if (agencyObj) {
      agencyName = agencyObj.name || '';
      initialParticipants.push({
        id: agencyObj.id || client.agencyId,
        type: 'agency',
        name: agencyObj.name || ''
      });
    }
  }

  const todayStr = new Date().toISOString().split('T')[0];
  const now = new Date().toISOString();

  const processData: Omit<Process, 'id'> = {
    clientId: client.id,
    participants: initialParticipants,
    type: 'Financiamento',
    status: 'Em andamento',
    stage: 'Aprovado',
    stageHistory: [
      {
        stage: 'Aprovado',
        date: now
      }
    ],
    notifications: [],
    bankId: initialBankId,
    propertyId: '',
    purchaseValue: 0,
    financingValue: initialFinancingValue,
    financingType: 'SBPE',
    isAssistedPurchase: false,
    assistedPurchaseValue: 0,
    hasDispatcher: false,
    dispatcherValue: 0,
    isDispatcherPaid: false,
    dispatcherPaymentDate: todayStr,
    commissionValue: 0,
    isCommissionPaid: false,
    commissionPaymentDate: todayStr,
    isSellerPaid: false,
    hasIQ: false,
    iqBankId: '',
    iqDebtValue: 0,
    value: initialFinancingValue,
    agency: agencyName,
    brokerId: client.brokerId || '',
    commercialUserId: client.commercialUserId || '',
    notes: '',
    signatureType: '' as any,
    approvalExpirationDate: initialExpirationDate,
    source: 'manual',
    updatedAt: now
  };

  try {
    const res = await api.create('processes', processData);
    console.log(`[createProcessForApprovedClient] Processo criado automaticamente para cliente ${client.name} (${client.id}):`, res.id);

    // If client status was empty, update it to Aprovado
    if (!client.status) {
      try {
        await api.update('clients', client.id, {
          status: 'Aprovado',
          updatedAt: now
        });
        client.status = 'Aprovado';
      } catch (err) {
        console.error(`Erro ao atualizar status do cliente ${client.id}:`, err);
      }
    }

    return { ...processData, id: res.id } as Process;
  } catch (err) {
    console.error(`Erro ao criar processo automático para cliente ${client.id}:`, err);
    return null;
  }
}

/**
 * Checks and deletes processes in "Aprovado" stage that have expired approvals.
 */
export async function cleanupExpiredApprovedProcesses(
  processes: Process[], 
  clients: Client[]
): Promise<string[]> {
  const deletedIds: string[] = [];
  const clientMap = new Map<string, Client>(clients.map(c => [c.id || '', c]));

  for (const process of processes) {
    // Only check processes that are in stage 'Aprovado'
    if (process.stage !== 'Aprovado' || !process.id) continue;

    let isExpired = false;

    // 1. Direct expiration on process
    if (process.approvalExpirationDate && isDateExpired(process.approvalExpirationDate)) {
      isExpired = true;
    }

    // 2. Client bank approval expiration check
    if (!isExpired && process.clientId) {
      const client = clientMap.get(process.clientId);
      if (client && client.approvedBanks && client.approvedBanks.length > 0) {
        // If bank matches
        const matchingBank = process.bankId 
          ? client.approvedBanks.find(b => b.bankId === process.bankId) 
          : client.approvedBanks[0];

        if (matchingBank?.expirationDate && isDateExpired(matchingBank.expirationDate)) {
          isExpired = true;
        } else {
          // If all client approved banks are expired
          const hasAnyValid = client.approvedBanks.some(b => !isDateExpired(b.expirationDate));
          if (!hasAnyValid && client.approvedBanks.some(b => !!b.expirationDate)) {
            isExpired = true;
          }
        }
      }
    }

    if (isExpired) {
      try {
        console.log(`Excluindo processo aprovado vencido: ${process.id} (Cliente: ${process.clientId})`);
        await api.delete('processes', process.id);
        deletedIds.push(process.id);
      } catch (err) {
        console.error(`Erro ao excluir processo vencido ${process.id}:`, err);
      }
    }
  }

  return deletedIds;
}

/**
 * Detects and removes duplicated processes in "Aprovado" stage.
 * A process in "Aprovado" is duplicated if another process already exists for the same client (or buyer participant).
 */
export async function deleteDuplicateAprovadoProcesses(
  processes: Process[],
  clients: Client[]
): Promise<string[]> {
  const clientMap = new Map<string, Client>(clients.map(c => [c.id || '', c]));
  const aprovadoProcesses = processes.filter(p => p.stage === 'Aprovado');
  const deletedIds: string[] = [];

  for (const ap of aprovadoProcesses) {
    if (!ap.id) continue;
    const clientId = ap.clientId || ap.participants?.find(pt => pt.type === 'buyer')?.id;
    if (!clientId) continue;

    // Check if another non-cancelled process exists for this client
    const otherProcesses = processes.filter(op => {
      if (op.id === ap.id) return false;
      const isSameClient = op.clientId === clientId || op.participants?.some(pt => pt.id === clientId);
      return isSameClient && op.status !== 'Cancelado';
    });

    if (otherProcesses.length > 0) {
      try {
        console.log(`[deleteDuplicateAprovadoProcesses] Excluindo processo duplicado em Aprovado: ${ap.id}`);
        await api.delete('processes', ap.id);
        deletedIds.push(ap.id);
      } catch (err) {
        console.error(`Erro ao excluir processo duplicado ${ap.id}:`, err);
      }
    }
  }

  return deletedIds;
}

let isSyncInProgress = false;

/**
 * Synchronizes all registered clients and processes:
 * 1. Cleans up any expired processes in "Aprovado".
 * 2. Cleans up duplicate processes in "Aprovado".
 * 3. Checks all clients with valid approved banks who don't have an active process and creates one.
 */
export async function syncAllApprovedClientsAndProcesses(
  clients: Client[],
  processes: Process[],
  agencies: Agency[] = [],
  brokers: Broker[] = []
): Promise<{ createdCount: number; deletedCount: number }> {
  if (isSyncInProgress) {
    return { createdCount: 0, deletedCount: 0 };
  }

  isSyncInProgress = true;
  try {
    // 1. Cleanup expired processes in 'Aprovado'
    const expiredDeletedIds = await cleanupExpiredApprovedProcesses(processes, clients);
    let remainingProcesses = processes.filter(p => !expiredDeletedIds.includes(p.id || ''));

    // 2. Cleanup any duplicate processes in 'Aprovado'
    const duplicateDeletedIds = await deleteDuplicateAprovadoProcesses(remainingProcesses, clients);
    remainingProcesses = remainingProcesses.filter(p => !duplicateDeletedIds.includes(p.id || ''));

    const totalDeletedCount = expiredDeletedIds.length + duplicateDeletedIds.length;

    // 3. Automatically create processes in 'Aprovado' for approved clients without an active process
    let createdCount = 0;
    for (const client of clients) {
      if (!client.id) continue;
      const validBanks = getValidApprovedBanks(client);
      if (validBanks.length === 0) continue;

      const hasActive = hasActiveProcess(client.id, remainingProcesses);
      if (!hasActive) {
        const newProcess = await createProcessForApprovedClient(client, agencies, brokers, remainingProcesses);
        if (newProcess) {
          createdCount++;
          remainingProcesses.push(newProcess);
        }
      }
    }

    // 3. Review and adjust existing processes in 'Aprovado'
    const clientMap = new Map<string, Client>(clients.map(c => [c.id || '', c]));
    for (const p of remainingProcesses) {
      if (p.stage !== 'Aprovado' || !p.id) continue;

      let clientId = p.clientId;
      if (!clientId) {
        const buyer = p.participants?.find(part => part.type === 'buyer');
        clientId = buyer?.id || '';
      }
      const client = clientId ? clientMap.get(clientId) : undefined;
      const matchingBank = client?.approvedBanks?.find(b => b.bankId === p.bankId) || client?.approvedBanks?.[0];
      const approvedVal = matchingBank?.approvedValue || 0;
      const expirationDate = matchingBank?.expirationDate ? (
        matchingBank.expirationDate.includes('/')
          ? matchingBank.expirationDate.split('/').reverse().join('-')
          : matchingBank.expirationDate
      ) : '';

      const updates: Partial<Process> = {};

      if (!p.clientId && clientId) {
        updates.clientId = clientId;
      }

      if ((!p.financingValue || p.financingValue === 0) && approvedVal > 0) {
        updates.financingValue = approvedVal;
        updates.value = approvedVal;
        if (!p.bankId && matchingBank?.bankId) {
          updates.bankId = matchingBank.bankId;
        }
        if (!p.approvalExpirationDate && expirationDate) {
          updates.approvalExpirationDate = expirationDate;
        }
      }

      // If purchaseValue is equal to financingValue and no property is linked, reset purchaseValue to 0
      if (p.purchaseValue && p.purchaseValue > 0 && p.purchaseValue === (updates.financingValue || p.financingValue || 0) && !p.propertyId) {
        updates.purchaseValue = 0;
      }

      if (Object.keys(updates).length > 0) {
        try {
          await api.update('processes', p.id, {
            ...updates,
            updatedAt: new Date().toISOString()
          });
          Object.assign(p, updates);
        } catch (err) {
          console.error(`Erro ao atualizar processo aprovado ${p.id}:`, err);
        }
      }
    }

    return { createdCount, deletedCount: totalDeletedCount };
  } finally {
    isSyncInProgress = false;
  }
}
