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
  brokers: Broker[] = []
): Promise<Process | null> {
  // Automatic process creation is disabled to prevent duplicate processes or resurrection of deleted processes.
  // Processes should only be created manually by user action in ProcessManager.
  console.info(`[createProcessForApprovedClient] Auto-creation disabled. Manual process creation is required for client: ${client?.name}`);
  return null;
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

let isSyncInProgress = false;

/**
 * Synchronizes all registered clients and processes:
 * 1. Cleans up any expired processes in "Aprovado".
 * 2. Checks all clients with valid approved banks who don't have an active process and creates one.
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
    const deletedIds = await cleanupExpiredApprovedProcesses(processes, clients);
    const remainingProcesses = processes.filter(p => !deletedIds.includes(p.id || ''));

    // 2. Review and adjust existing processes in 'Aprovado'
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

    return { createdCount: 0, deletedCount: deletedIds.length };
  } finally {
    isSyncInProgress = false;
  }
}
