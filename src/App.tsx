import React, { useState, useEffect } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import ClientManager from './components/ClientManager';
import ProcessManager from './components/ProcessManager';
import BankManager from './components/BankManager';
import AgencyManager from './components/AgencyManager';
import BrokerManager from './components/BrokerManager';
import PropertyManager from './components/PropertyManager';
import UserManager from './components/UserManager';
import FinanceManager from './components/FinanceManager';
import { ReportsManager } from './components/ReportsManager';
import ClientModal from './components/ClientModal';
import { HeaderProvider } from './context/HeaderContext';
import { AuthProvider } from './context/AuthContext';
import { api } from './api';
import { Process, Client, Bank, Agency, Broker, Property } from './types';

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
  
  const [processes, setProcesses] = useState<Process[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);

  useEffect(() => {
    if (!user) return;

    const unsubProcesses = api.subscribeToCollection('processes', (data) => setProcesses(data as Process[]));
    const unsubClients = api.subscribeToCollection('clients', (data) => setClients(data as Client[]));
    const unsubBanks = api.subscribeToCollection('banks', (data) => setBanks(data as Bank[]));
    const unsubAgencies = api.subscribeToCollection('agencies', (data) => setAgencies(data as Agency[]));
    const unsubBrokers = api.subscribeToCollection('brokers', (data) => setBrokers(data as Broker[]));
    const unsubProperties = api.subscribeToCollection('properties', (data) => setProperties(data as Property[]));

    return () => {
      unsubProcesses();
      unsubClients();
      unsubBanks();
      unsubAgencies();
      unsubBrokers();
      unsubProperties();
    };
  }, [user]);

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

  const handleOpenClientModal = (id: string, isEdit: boolean = false) => {
    setSelectedClientId(id);
    setIsClientModalEdit(isEdit);
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
      case 'banks':
        return <BankManager />;
      case 'finance':
        return isAdmin ? <FinanceManager /> : <Dashboard />;
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
        onCreateProcessForClient={handleCreateProcessForClient}
        onClose={() => {
          setIsClientModalOpen(false);
          setSelectedClientId(null);
          setIsClientModalEdit(false);
        }}
      />
    </HeaderProvider>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}
