import { api } from '../api';
import { Client, Process, Agency, Broker, Participant, ApprovedBank } from '../types';
import { resolveParticipantName } from '../utils/participantUtils';

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
 * Verifies if a client has valid credit approval.
 * Rules:
 * - Status 'Aprovado' OR has non-expired approvedBanks with positive value
 * - Client cannot have status 'Negado' or 'Cancelado'
 */
export function hasCreditApproval(client?: Client, process?: Process): boolean {
  if (!client && !process) return false;

  if (client) {
    if (client.status === 'Negado') {
      return false;
    }
    if (client.status === 'Aprovado') {
      // If client has approved banks list, ensure at least one is not expired
      if (client.approvedBanks && client.approvedBanks.length > 0) {
        return client.approvedBanks.some(b => !isDateExpired(b.expirationDate));
      }
      return true;
    }
    if (client.approvedBanks && client.approvedBanks.length > 0) {
      return client.approvedBanks.some(b => !isDateExpired(b.expirationDate) && (b.approvedValue || 0) > 0);
    }
  }

  // Fallback to process information if client record not directly found
  if (process) {
    if (process.approvalExpirationDate && isDateExpired(process.approvalExpirationDate)) {
      return false;
    }
    if ((process.financingValue && process.financingValue > 0) || (process.value && process.value > 0)) {
      return true;
    }
  }

  return false;
}

/**
 * Extracts normalized identifiers (IDs, CPFs, buyer names) from a process for cross-referencing.
 */
export function getProcessBuyerIdentifiers(
  p: Process,
  clients: Client[] = [],
  brokers: Broker[] = [],
  agencies: Agency[] = []
): {
  clientIds: Set<string>;
  cpfs: Set<string>;
  names: Set<string>;
} {
  const clientIds = new Set<string>();
  if (p.clientId && p.clientId.trim()) clientIds.add(p.clientId.trim());

  p.participants?.filter(pt => pt.type === 'buyer').forEach(pt => {
    if (pt.id && pt.id.trim()) clientIds.add(pt.id.trim());
  });

  const cpfs = new Set<string>();
  const names = new Set<string>();

  clientIds.forEach(cId => {
    const client = clients.find(c => c.id === cId);
    if (client) {
      if (client.cpf) {
        const cleanCpf = client.cpf.replace(/\D/g, '');
        if (cleanCpf.length >= 9) cpfs.add(cleanCpf);
      }
      if (client.name && client.name.trim().length >= 3) {
        names.add(client.name.trim().toLowerCase());
      }
    }
  });

  p.participants?.filter(pt => pt.type === 'buyer').forEach(pt => {
    const ptName = resolveParticipantName(pt, clients, brokers, agencies);
    if (ptName && ptName.trim().length >= 3) {
      const lower = ptName.trim().toLowerCase();
      if (lower !== 'cliente desconhecido' && lower !== 'cliente') {
        names.add(lower);
      }
    }
  });

  return { clientIds, cpfs, names };
}

/**
 * Checks if two processes share the same client/buyer identity.
 */
export function doProcessesMatchSameClient(
  id1: { clientIds: Set<string>; cpfs: Set<string>; names: Set<string> },
  id2: { clientIds: Set<string>; cpfs: Set<string>; names: Set<string> }
): boolean {
  // Check matching client ID
  for (const cId of id1.clientIds) {
    if (id2.clientIds.has(cId)) return true;
  }
  // Check matching CPF
  for (const cpf of id1.cpfs) {
    if (id2.cpfs.has(cpf)) return true;
  }
  // Check matching Name
  for (const name of id1.names) {
    if (id2.names.has(name)) return true;
  }
  return false;
}

/**
 * Finds the corresponding Client object for a given process.
 */
export function findClientForProcess(process: Process, clients: Client[]): Client | undefined {
  if (process.clientId) {
    const found = clients.find(c => c.id === process.clientId);
    if (found) return found;
  }

  const buyerPt = process.participants?.find(p => p.type === 'buyer');
  if (buyerPt?.id) {
    const found = clients.find(c => c.id === buyerPt.id);
    if (found) return found;
  }

  if (buyerPt?.name && buyerPt.name.trim().length >= 3) {
    const buyerLower = buyerPt.name.trim().toLowerCase();
    const found = clients.find(c => c.name && c.name.trim().toLowerCase() === buyerLower);
    if (found) return found;
  }

  return undefined;
}

/**
 * Checks if a client currently has any process (active or completed, not cancelled).
 */
export function hasActiveProcess(
  clientId: string, 
  processes: Process[], 
  clients: Client[] = []
): boolean {
  const targetClient = clients.find(c => c.id === clientId);
  const targetCpf = targetClient?.cpf ? targetClient.cpf.replace(/\D/g, '') : '';
  const targetName = targetClient?.name ? targetClient.name.trim().toLowerCase() : '';

  return processes.some(p => {
    if (p.status === 'Cancelado') return false;

    // Direct client ID match
    if (p.clientId === clientId) return true;
    if (p.participants?.some(part => part.id === clientId)) return true;

    // CPF match
    if (targetCpf && targetCpf.length >= 9) {
      if (p.clientId) {
        const pClient = clients.find(c => c.id === p.clientId);
        const pCpf = pClient?.cpf ? pClient.cpf.replace(/\D/g, '') : '';
        if (pCpf && pCpf === targetCpf) return true;
      }
    }

    // Name match
    if (targetName && targetName.length >= 3) {
      const pBuyer = p.participants?.find(part => part.type === 'buyer');
      if (pBuyer && pBuyer.name && pBuyer.name.trim().toLowerCase() === targetName) {
        return true;
      }
    }

    return false;
  });
}

export interface AprovadosAnalysisResult {
  validProcesses: Process[];
  invalidOrDuplicateProcessIds: Set<string>;
  duplicateCount: number;
  reasons: Map<string, string>;
}

/**
 * Analyzes all processes in stage "Aprovado":
 * Rule: In stage "Aprovado", ONLY clients with credit approval who are NOT in any other stage should be present.
 * Duplicates in "Aprovado" are identified and separated.
 */
export function analyzeAprovadoProcesses(
  processes: Process[],
  clients: Client[],
  brokers: Broker[] = [],
  agencies: Agency[] = []
): AprovadosAnalysisResult {
  const invalidOrDuplicateProcessIds = new Set<string>();
  const reasons = new Map<string, string>();
  const validProcesses: Process[] = [];

  if (!processes || processes.length === 0) {
    return {
      validProcesses,
      invalidOrDuplicateProcessIds,
      duplicateCount: 0,
      reasons
    };
  }

  // Pre-calculate identifiers for all processes
  const processMetaList = processes.map(p => ({
    process: p,
    id: p.id || '',
    stage: p.stage,
    status: p.status,
    identifiers: getProcessBuyerIdentifiers(p, clients, brokers, agencies)
  }));

  // Identify processes in OTHER active stages (Vistoria, Documentos, Conformidade, Recursos, Contrato, ITBI, Registro, Pag Vend, Finalizado)
  const otherStageMetaList = processMetaList.filter(
    m => m.stage !== 'Aprovado' && m.status !== 'Cancelado'
  );

  // Group processes in stage "Aprovado"
  const aprovadoMetaList = processMetaList.filter(m => m.stage === 'Aprovado' && m.id);

  // Map to cluster 'Aprovado' processes by client identity
  // Key: unique cluster index or identifier string
  const clusters: {
    client?: Client;
    metaList: typeof aprovadoMetaList;
  }[] = [];

  for (const apMeta of aprovadoMetaList) {
    const ap = apMeta.process;
    const client = findClientForProcess(ap, clients);

    // 1. Check if client has ANY process in another stage
    const matchingOther = otherStageMetaList.find(other => 
      doProcessesMatchSameClient(apMeta.identifiers, other.identifiers)
    );

    if (matchingOther) {
      invalidOrDuplicateProcessIds.add(apMeta.id);
      reasons.set(apMeta.id, `Cliente já possui processo na etapa "${matchingOther.stage}"`);
      continue;
    }

    // 2. Check if client has credit approval
    const isApproved = hasCreditApproval(client, ap);
    if (!isApproved) {
      invalidOrDuplicateProcessIds.add(apMeta.id);
      reasons.set(apMeta.id, 'Cliente não possui aprovação de crédito ativa');
      continue;
    }

    // 3. Cluster with existing approved group for same client
    let foundCluster = clusters.find(c => 
      c.metaList.some(item => doProcessesMatchSameClient(item.identifiers, apMeta.identifiers))
    );

    if (foundCluster) {
      foundCluster.metaList.push(apMeta);
      if (!foundCluster.client && client) foundCluster.client = client;
    } else {
      clusters.push({
        client,
        metaList: [apMeta]
      });
    }
  }

  // Process clusters: keep exactly 1 best process per approved client, mark the rest as duplicates
  for (const cluster of clusters) {
    if (cluster.metaList.length === 1) {
      validProcesses.push(cluster.metaList[0].process);
    } else {
      // Multiple processes in 'Aprovado' for the same client: sort to choose the single best one
      const sorted = [...cluster.metaList].sort((a, b) => {
        // Priority 1: Has linked property
        const propA = Boolean(a.process.propertyId);
        const propB = Boolean(b.process.propertyId);
        if (propA !== propB) return propA ? -1 : 1;

        // Priority 2: Higher financing/purchase value
        const valA = (a.process.purchaseValue || 0) + (a.process.financingValue || 0) + (a.process.value || 0);
        const valB = (b.process.purchaseValue || 0) + (b.process.financingValue || 0) + (b.process.value || 0);
        if (valA !== valB) return valB - valA;

        // Priority 3: More recent update
        const dateA = new Date(a.process.updatedAt || 0).getTime();
        const dateB = new Date(b.process.updatedAt || 0).getTime();
        return dateB - dateA;
      });

      // The best one is kept as valid
      validProcesses.push(sorted[0].process);

      // All others are marked as duplicates to be removed
      for (let i = 1; i < sorted.length; i++) {
        invalidOrDuplicateProcessIds.add(sorted[i].id);
        reasons.set(sorted[i].id, 'Processo duplicado na etapa Aprovado');
      }
    }
  }

  return {
    validProcesses,
    invalidOrDuplicateProcessIds,
    duplicateCount: invalidOrDuplicateProcessIds.size,
    reasons
  };
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
  if (hasActiveProcess(client.id, listToCheck, [client])) {
    console.warn(`[createProcessForApprovedClient] Cliente ${client.name} (${client.id}) já possui processo.`);
    return null;
  }

  const validBanks = getValidApprovedBanks(client);
  const bankToUse = validBanks[0] || client.approvedBanks?.[0];

  const initialFinancingValue = bankToUse?.approvedValue || 0;
  const initialBankId = bankToUse?.bankId || '';
  let initialExpirationDate: string = '';
  if (bankToUse?.expirationDate) {
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
 * Detects and removes duplicated or invalid processes in "Aprovado" stage.
 * Deletes:
 * 1. Processes in 'Aprovado' where the client already has a process in another stage.
 * 2. Duplicate processes in 'Aprovado' for the same client (keeps the single best one).
 * 3. Processes in 'Aprovado' for clients who do not have valid credit approval.
 */
export async function deleteDuplicateAprovadoProcesses(
  processes: Process[],
  clients: Client[],
  agencies: Agency[] = [],
  brokers: Broker[] = []
): Promise<string[]> {
  const analysis = analyzeAprovadoProcesses(processes, clients, brokers, agencies);
  const deletedIds: string[] = [];

  for (const id of analysis.invalidOrDuplicateProcessIds) {
    try {
      const reason = analysis.reasons.get(id) || 'Duplicado ou em outra etapa';
      console.log(`[deleteDuplicateAprovadoProcesses] Excluindo processo ${id} da etapa Aprovado: ${reason}`);
      await api.delete('processes', id);
      deletedIds.push(id);
    } catch (err) {
      console.error(`Erro ao excluir processo duplicado/inválido ${id}:`, err);
    }
  }

  return deletedIds;
}

let isSyncInProgress = false;

/**
 * Synchronizes all registered clients and processes:
 * 1. Cleans up any expired processes in "Aprovado".
 * 2. Cleans up duplicate or invalid processes in "Aprovado".
 * 3. Checks all clients with valid credit approval who don't have an active process and creates one.
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

    // 2. Cleanup duplicate or invalid processes in 'Aprovado'
    const duplicateDeletedIds = await deleteDuplicateAprovadoProcesses(remainingProcesses, clients, agencies, brokers);
    remainingProcesses = remainingProcesses.filter(p => !duplicateDeletedIds.includes(p.id || ''));

    const totalDeletedCount = expiredDeletedIds.length + duplicateDeletedIds.length;

    // 3. Automatically create processes in 'Aprovado' for approved clients without an active process
    let createdCount = 0;
    for (const client of clients) {
      if (!client.id) continue;
      if (!hasCreditApproval(client)) continue;

      const hasActive = hasActiveProcess(client.id, remainingProcesses, clients);
      if (!hasActive) {
        const newProcess = await createProcessForApprovedClient(client, agencies, brokers, remainingProcesses);
        if (newProcess) {
          createdCount++;
          remainingProcesses.push(newProcess);
        }
      }
    }

    // 4. Review and adjust existing processes in 'Aprovado'
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
