import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { UserProfile } from '../types';
import { LogIn, LogOut, Home, Users, FileText, Building2, Menu, X, User, Landmark } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useHeader } from '../context/HeaderContext';
import { cn } from '../utils/cn';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Layout({ children, activeTab, setActiveTab }: LayoutProps) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { title, actions } = useHeader();

  useEffect(() => {
    const loadUser = async () => {
      try {
        const data = await api.getData();
        // Auto-login for demo
        setUser(data.users[0]);
      } catch (error) {
        console.error("Erro ao carregar usuário:", error);
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, []);

  const handleLogin = () => {
    setUser({
      uid: 'admin-1',
      email: 'vinicius.lopes@msn.com',
      displayName: 'Vinícius Lopes',
      role: 'admin',
    });
  };

  const handleLogout = () => setUser(null);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f5f0]">
        <motion.div 
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="w-8 h-8 border-4 border-black/10 border-t-black rounded-full"
        />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f5f0] p-4 text-[#1a1a1a]">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="max-w-md w-full bg-white p-8 rounded-[32px] shadow-xl text-center border border-black/5"
        >
          <div className="w-16 h-16 bg-black rounded-2xl flex items-center justify-center mx-auto mb-6 border border-black/5">
            <Building2 className="text-white w-8 h-8" />
          </div>
          <h1 className="text-3xl font-sans font-bold text-[#1a1a1a] mb-2">Solutz</h1>
          <p className="text-black/60 mb-8">Gestão inteligente para o mercado imobiliário</p>
          <button
            onClick={handleLogin}
            className="w-full flex items-center justify-center gap-3 bg-black text-white py-4 rounded-full font-medium hover:bg-zinc-800 transition-colors shadow-lg"
          >
            <LogIn className="w-5 h-5" />
            Entrar com Google
          </button>
        </motion.div>
      </div>
    );
  }

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'processes', label: 'Processos', icon: FileText },
    { id: 'clients', label: 'Clientes', icon: Users },
    { id: 'brokers', label: 'Corretores', icon: User },
    { id: 'agencies', label: 'Imobiliárias', icon: Building2 },
    { id: 'banks', label: 'Bancos', icon: Landmark },
  ];

  return (
    <div className="min-h-screen bg-[#f5f5f0] flex flex-col md:flex-row text-[#1a1a1a]">
      {/* Top Bar for both mobile and desktop */}
      <div className="bg-black p-4 flex items-center justify-between sticky top-0 z-[60] shadow-md">
        <div className="flex items-center gap-4">
          <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-white">
            {isMenuOpen ? <X /> : <Menu />}
          </button>
          <h2 className="text-white font-sans font-bold text-xl truncate">{title}</h2>
        </div>
        <div className="flex items-center gap-2">
          {actions}
        </div>
      </div>

      {/* Sidebar */}
      <AnimatePresence>
        {isMenuOpen && (
          <motion.aside
            initial={{ x: -300 }}
            animate={{ x: 0 }}
            exit={{ x: -300 }}
            className="fixed inset-y-0 left-0 z-50 w-64 bg-black flex flex-col p-6 shadow-2xl"
          >
            <div className="flex items-center justify-between mb-12">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-white/10 rounded-xl flex items-center justify-center border border-white/10">
                  <Building2 className="text-white w-6 h-6" />
                </div>
                <span className="font-sans font-bold text-2xl text-white">Solutz</span>
              </div>
              <button onClick={() => setIsMenuOpen(false)} className="text-white md:hidden">
                <X />
              </button>
            </div>

            <nav className="flex-1 space-y-2">
              {navItems.map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveTab(item.id);
                    setIsMenuOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-200",
                    activeTab === item.id 
                      ? "bg-white/10 text-white shadow-md" 
                      : "text-white/60 hover:bg-white/5 hover:text-white"
                  )}
                >
                  <item.icon className="w-5 h-5" />
                  <span className="font-medium">{item.label}</span>
                </button>
              ))}
            </nav>

            <div className="mt-auto pt-6 border-t border-white/10">
              <div className="flex items-center gap-3 mb-4 px-2">
                <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center text-white font-bold border border-white/10">
                  {user.displayName[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-white truncate">{user.displayName}</p>
                  <p className="text-xs text-white/60 truncate capitalize">{user.role}</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-red-400 hover:bg-red-400/10 transition-colors"
              >
                <LogOut className="w-5 h-5" />
                <span className="font-medium">Sair</span>
              </button>
            </div>
          </motion.aside>
        )}
      </AnimatePresence>

      {/* Main Content */}
      <main className="flex-1 p-4 md:p-10 overflow-auto">
        <div className="max-w-6xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
