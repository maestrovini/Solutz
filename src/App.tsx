import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import ClientManager from './components/ClientManager';
import ProcessManager from './components/ProcessManager';
import ProductManager from './components/ProductManager';
import BankManager from './components/BankManager';
import AgencyManager from './components/AgencyManager';
import BrokerManager from './components/BrokerManager';
import PropertyManager from './components/PropertyManager';
import UserManager from './components/UserManager';
import FinanceManager from './components/FinanceManager';
import AnalystManager from './components/AnalystManager';
import { ReportsManager } from './components/ReportsManager';
import DocumentManager from './components/DocumentManager';
import ClientModal from './components/ClientModal';
import { HeaderProvider } from './context/HeaderContext';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider, useToast } from './context/ToastContext';
import { api } from './api';
import { Process, Client, Bank, Agency, Broker, Property, Product } from './types';

import { useAuth } from './context/AuthContext';
import Login from './components/Login';

function AppContent() {
  const { user, loading, isAdmin } = useAuth();
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedProcessId, setSelectedProcessId] = useState<string | null>(null);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [newProcessClientId, setNewProcessClientId] = useState<string | null>(null);
  const [newProcessRole, setNewProcessRole] = useState<'buyer' | 'seller' | null>(null);
  const [isClientModalOpen, setIsClientModalOpen] = useState(false);
  const [isClientModalEdit, setIsClientModalEdit] = useState(false);
  const [isClientModalSimulation, setIsClientModalSimulation] = useState(false);
  
  const [processes, setProcesses] = useState<Process[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);
  const [products, setProducts] = useState<Product[]>([]);

  useEffect(() => {
    if (!user) return;

    const unsubProcesses = api.subscribeToCollection('processes', (data) => setProcesses(data as Process[]));
    const unsubClients = api.subscribeToCollection('clients', (data) => setClients(data as Client[]));
    const unsubBanks = api.subscribeToCollection('banks', (data) => setBanks(data as Bank[]));
    const unsubAgencies = api.subscribeToCollection('agencies', (data) => setAgencies(data as Agency[]));
    const unsubBrokers = api.subscribeToCollection('brokers', (data) => setBrokers(data as Broker[]));
    const unsubProperties = api.subscribeToCollection('properties', (data) => setProperties(data as Property[]));
    const unsubProducts = api.subscribeToCollection('products', (data) => setProducts(data as Product[]));

    return () => {
      unsubProcesses();
      unsubClients();
      unsubBanks();
      unsubAgencies();
      unsubBrokers();
      unsubProperties();
      unsubProducts();
    };
  }, [user]);

  const prevProcessesRef = React.useRef<Process[] | null>(null);
  const { showToast } = useToast();

  useEffect(() => {
    if (processes.length > 0) {
      if (prevProcessesRef.current === null) {
        prevProcessesRef.current = processes;
        return;
      }

      processes.forEach((currProcess) => {
        const prevProcess = prevProcessesRef.current?.find((p) => p.id === currProcess.id);
        
        if (prevProcess) {
          // 1. Check for STAGE change
          if (currProcess.stage !== prevProcess.stage) {
            const client = clients.find((c) => c.id === currProcess.clientId);
            const clientName = client ? client.name : 'Cliente';
            
            showToast({
              type: currProcess.stage === 'Finalizado' ? 'success' : 'status',
              title: currProcess.stage === 'Finalizado' ? 'Processo Finalizado! 🎉' : 'Atualização de Etapa',
              description: currProcess.stage === 'Finalizado' 
                ? `O processo de ${clientName} foi concluído e finalizado!` 
                : `O processo avançou para a etapa: "${currProcess.stage}".`,
              clientName,
              oldValue: prevProcess.stage,
              newValue: currProcess.stage,
            });
          }

          // 2. Check for STATUS change (sales process status or credit approval)
          if (currProcess.status !== prevProcess.status) {
            const client = clients.find((c) => c.id === currProcess.clientId);
            const clientName = client ? client.name : 'Cliente';
            
            // Check if it is a credit approval/approved state
            const isApproved = currProcess.status.toLowerCase().includes('aprov') || 
                               currProcess.stage.toLowerCase() === 'aprovado' ||
                               currProcess.status.toLowerCase().includes('liber') ||
                               currProcess.status.toLowerCase().includes('concl');
            
            showToast({
              type: isApproved ? 'credit' : 'info',
              title: isApproved ? 'Crédito Aprovado! 💳' : 'Status do Processo Atualizado',
              description: `O status do processo de ${clientName} mudou para "${currProcess.status}".`,
              clientName,
              oldValue: prevProcess.status,
              newValue: currProcess.status,
            });
          }
        }
      });

      prevProcessesRef.current = processes;
    } else {
      prevProcessesRef.current = processes;
    }
  }, [processes, clients, showToast]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#f5f5f0] flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-black/10 border-t-black rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Login />;
  }

  const handleOpenClient = (id: string) => {
    setSelectedClientId(id);
    setActiveTab('clients');
  };

  const handleOpenClientModal = (id: string | null, isEdit: boolean = false, isSimulation: boolean = false) => {
    setSelectedClientId(id);
    setIsClientModalEdit(isEdit);
    setIsClientModalSimulation(isSimulation);
    setIsClientModalOpen(true);
  };

  const handleCreateProcessForClient = (clientId: string, role?: 'buyer' | 'seller') => {
    setNewProcessClientId(clientId);
    setNewProcessRole(role || null);
    setActiveTab('processes');
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard 
            onOpenProcess={(id) => {
              setSelectedProcessId(id);
              setActiveTab('processes');
            }} 
            onOpenClient={handleOpenClientModal}
          />
        );
      case 'clients':
        return (
          <ClientManager 
            initialSelectedClientId={selectedClientId}
            onCloseDetail={() => setSelectedClientId(null)}
            onOpenProcess={(id) => {
              setSelectedProcessId(id);
              setActiveTab('processes');
            }} 
            onOpenClientModal={handleOpenClientModal}
            onCreateProcessForClient={handleCreateProcessForClient}
          />
        );
      case 'agencies':
        return <AgencyManager />;
      case 'brokers':
        return (
          <BrokerManager 
            onOpenClient={handleOpenClientModal}
            onOpenProcess={(id) => {
              setSelectedProcessId(id);
              setActiveTab('processes');
            }}
          />
        );
      case 'properties':
        return (
          <PropertyManager 
            onOpenProcess={(id) => {
              setSelectedProcessId(id);
              setActiveTab('processes');
            }} 
          />
        );
      case 'users':
        return isAdmin ? <UserManager /> : <Dashboard />;
      case 'processes':
        return (
          <ProcessManager 
            initialSelectedProcessId={selectedProcessId} 
            initialNewProcessClientId={newProcessClientId}
            initialNewProcessRole={newProcessRole}
            onCloseDetail={() => {
              setSelectedProcessId(null);
              setNewProcessClientId(null);
              setNewProcessRole(null);
            }} 
            onOpenClient={handleOpenClientModal}
          />
        );
      case 'products':
        return <ProductManager />;
      case 'documents':
        return <DocumentManager />;
      case 'banks':
        return <BankManager />;
      case 'finance':
        return isAdmin ? <FinanceManager /> : <Dashboard />;
      case 'analyst':
        return <AnalystManager />;
      case 'reports':
        return isAdmin ? (
          <ReportsManager 
            processes={processes}
            clients={clients}
            banks={banks}
            brokers={brokers}
            agencies={agencies}
          />
        ) : <Dashboard />;
      default:
        return <Dashboard />;
    }
  };

  return (
    <HeaderProvider>
      <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
        {renderContent()}
      </Layout>
      <ClientModal 
        isOpen={isClientModalOpen}
        clientId={selectedClientId}
        initialIsEditing={isClientModalEdit}
        initialSimulation={isClientModalSimulation}
        onCreateProcessForClient={handleCreateProcessForClient}
        onClose={() => {
          setIsClientModalOpen(false);
          setSelectedClientId(null);
          setIsClientModalEdit(false);
          setIsClientModalSimulation(false);
        }}
      />
    </HeaderProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <AppContent />
      </ToastProvider>
    </AuthProvider>
  );
}
