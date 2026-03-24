import React, { useState } from 'react';
import Layout from './components/Layout';
import Dashboard from './components/Dashboard';
import ClientManager from './components/ClientManager';
import ProcessManager from './components/ProcessManager';
import BankManager from './components/BankManager';
import AgencyManager from './components/AgencyManager';
import BrokerManager from './components/BrokerManager';
import UserManager from './components/UserManager';
import { HeaderProvider } from './context/HeaderContext';
import { AuthProvider } from './context/AuthContext';

export default function App() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [selectedProcessId, setSelectedProcessId] = useState<string | null>(null);

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
        return <ClientManager />;
      case 'agencies':
        return <AgencyManager />;
      case 'brokers':
        return <BrokerManager />;
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
