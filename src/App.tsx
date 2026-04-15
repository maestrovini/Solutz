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
import { ReportsManager } from './components/ReportsManager';
import { HeaderProvider } from './context/HeaderContext';
import { AuthProvider } from './context/AuthContext';
import { api } from './api';
import { Process, Client, Bank, Agency, Broker, Property } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedProcessId, setSelectedProcessId] = useState<string | null>(null);
  
  const [processes, setProcesses] = useState<Process[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [banks, setBanks] = useState<Bank[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [properties, setProperties] = useState<Property[]>([]);

  useEffect(() => {
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
  }, []);

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return (
          <Dashboard 
            onOpenProcess={(id) => {
              setSelectedProcessId(id);
              setActiveTab('processes');
            }} 
          />
        );
      case 'clients':
        return (
          <ClientManager 
            onOpenProcess={(id) => {
              setSelectedProcessId(id);
              setActiveTab('processes');
            }} 
          />
        );
      case 'agencies':
        return <AgencyManager />;
      case 'brokers':
        return <BrokerManager />;
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
        return <UserManager />;
      case 'processes':
        return (
          <ProcessManager 
            initialSelectedProcessId={selectedProcessId} 
            onCloseDetail={() => setSelectedProcessId(null)} 
          />
        );
      case 'banks':
        return <BankManager />;
      case 'reports':
        return (
          <ReportsManager 
            processes={processes}
            clients={clients}
            banks={banks}
            brokers={brokers}
            agencies={agencies}
          />
        );
      default:
        return <Dashboard />;
    }
  };

  return (
    <AuthProvider>
      <HeaderProvider>
        <Layout activeTab={activeTab} setActiveTab={setActiveTab}>
          {renderContent()}
        </Layout>
      </HeaderProvider>
    </AuthProvider>
  );
}
