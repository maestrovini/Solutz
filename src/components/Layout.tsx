import React, { useState, useEffect } from 'react';
import { auth, signInWithPopup, googleProvider, onAuthStateChanged, User, db, doc, getDoc, setDoc } from '../firebase';
import { UserProfile } from '../types';
import { LogOut, Home, Users, FileText, Building2, Menu, X, User as UserIcon, Landmark, LogIn, Shield, BarChart3, Calculator } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useHeader } from '../context/HeaderContext';
import { useAuth } from '../context/AuthContext';
import { cn } from '../utils/cn';

interface LayoutProps {
  children: React.ReactNode;
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

export default function Layout({ children, activeTab, setActiveTab }: LayoutProps) {
  const { user, loading, isAdmin } = useAuth();
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const { title, actions } = useHeader();

  const handleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (error) {
      console.error("Erro ao fazer login:", error);
    }
  };

  const handleLogout = async () => {
    try {
      await auth.signOut();
    } catch (error) {
      console.error("Erro ao fazer logout:", error);
    }
  };

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

  const isGuest = user?.uid === 'public-guest';

  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: Home },
    { id: 'processes', label: 'Processos', icon: FileText },
    { id: 'clients', label: 'Clientes', icon: Users },
    { id: 'simulations', label: 'Simulação', icon: Calculator },
    { id: 'brokers', label: 'Corretores', icon: UserIcon },
    { id: 'agencies', label: 'Imobiliárias', icon: Building2 },
    { id: 'properties', label: 'Imóveis', icon: Building2 },
    { id: 'banks', label: 'Bancos', icon: Landmark },
    { id: 'reports', label: 'Relatórios', icon: BarChart3 },
    ...(isAdmin ? [{ id: 'users', label: 'Usuários', icon: Shield }] : []),
  ];

  const SidebarContent = () => (
    <>
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
            {user?.displayName?.[0] || 'V'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold text-white truncate">{user?.displayName || 'Visitante'}</p>
            <p className="text-xs text-white/60 truncate capitalize">{user?.role || 'user'}</p>
          </div>
        </div>
        
        {isGuest ? (
          <button
            onClick={handleLogin}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-white hover:bg-white/10 transition-colors"
          >
            <LogIn className="w-5 h-5" />
            <span className="font-medium">Entrar</span>
          </button>
        ) : (
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3 px-4 py-3 rounded-2xl text-red-400 hover:bg-red-400/10 transition-colors"
          >
            <LogOut className="w-5 h-5" />
            <span className="font-medium">Sair</span>
          </button>
        )}
      </div>
    </>
  );

  return (
    <div className="h-screen bg-[#f5f5f0] flex overflow-hidden text-[#1a1a1a]">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex w-64 bg-black flex-col p-6 shrink-0">
        <SidebarContent />
      </aside>

      {/* Mobile Sidebar Overlay */}
      <AnimatePresence>
        {isMenuOpen && (
          <div className="fixed inset-0 z-[100] md:hidden">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMenuOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.aside
              initial={{ x: -300 }}
              animate={{ x: 0 }}
              exit={{ x: -300 }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
              className="relative w-64 h-full bg-black flex flex-col p-6 shadow-2xl"
            >
              <SidebarContent />
            </motion.aside>
          </div>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Bar */}
        <header className="bg-black p-4 flex items-center justify-between sticky top-0 z-[60] shadow-md shrink-0">
          <div className="flex items-center gap-4">
            <button onClick={() => setIsMenuOpen(!isMenuOpen)} className="text-white md:hidden">
              {isMenuOpen ? <X /> : <Menu />}
            </button>
            <h2 className="text-white font-sans font-bold text-xl truncate">{title}</h2>
          </div>
          <div className="flex items-center gap-2">
            {actions}
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto p-4 md:p-10">
          <div className="max-w-6xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
