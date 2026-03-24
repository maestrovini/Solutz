import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { UserProfile, Agency } from '../types';
import { Users, Shield, User, Building2, Search, Filter, MoreVertical, Edit2, Trash2, Check, X, Mail, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useHeader } from '../context/HeaderContext';
import { cn } from '../utils/cn';

export default function UserManager() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const { setTitle, setActions } = useHeader();

  useEffect(() => {
    setTitle('Gestão de Usuários');
    setActions(null);
  }, []);

  useEffect(() => {
    const unsubUsers = api.subscribeToCollection('users', (data) => {
      setUsers(data as UserProfile[]);
      setLoading(false);
    });
    const unsubAgencies = api.subscribeToCollection('agencies', (data) => {
      setAgencies(data as Agency[]);
    });

    return () => {
      unsubUsers();
      unsubAgencies();
    };
  }, []);

  const handleUpdateRole = async (user: UserProfile, newRole: UserProfile['role']) => {
    try {
      await api.update('users', user.uid, { role: newRole });
    } catch (error) {
      console.error("Erro ao atualizar cargo:", error);
    }
  };

  const handleUpdateAgency = async (user: UserProfile, agencyId: string) => {
    try {
      await api.update('users', user.uid, { agencyId });
    } catch (error) {
      console.error("Erro ao vincular imobiliária:", error);
    }
  };

  const filteredUsers = users.filter(user => 
    user.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Search and Filter */}
      <div className="flex flex-col md:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-black/40" />
          <input
            type="text"
            placeholder="Buscar usuários por nome ou email..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-white border border-black/5 rounded-xl focus:outline-none focus:ring-2 focus:ring-black/5 transition-all"
          />
        </div>
      </div>

      {/* Users Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredUsers.map((user) => (
          <motion.div
            key={user.uid}
            layout
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-white p-6 rounded-[24px] shadow-sm border border-black/5 hover:border-black/10 transition-all group"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-12 h-12 rounded-2xl flex items-center justify-center text-white shadow-lg",
                  user.role === 'admin' ? "bg-black" : "bg-blue-500"
                )}>
                  {user.role === 'admin' ? <Shield className="w-6 h-6" /> : <User className="w-6 h-6" />}
                </div>
                <div>
                  <h3 className="font-bold text-[#1a1a1a] leading-tight">{user.displayName}</h3>
                  <div className="flex items-center gap-1 text-[10px] text-black/40 uppercase tracking-wider mt-1">
                    <Mail className="w-3 h-3" />
                    {user.email}
                  </div>
                </div>
              </div>
              <div className={cn(
                "px-2 py-1 rounded-lg text-[8px] font-bold uppercase tracking-widest",
                user.role === 'admin' ? "bg-black text-white" : "bg-blue-100 text-blue-600"
              )}>
                {user.role === 'admin' ? 'Administrador' : 'Usuário'}
              </div>
            </div>

            <div className="space-y-4 pt-4 border-t border-black/5">
              {/* Role Management */}
              <div>
                <label className="text-[10px] font-bold text-black/40 uppercase tracking-wider mb-2 block">
                  Alterar Cargo
                </label>
                <div className="flex gap-2">
                  {(['admin', 'user'] as const).map((role) => (
                    <button
                      key={role}
                      onClick={() => handleUpdateRole(user, role)}
                      className={cn(
                        "flex-1 py-1.5 rounded-lg text-[10px] font-bold uppercase tracking-wider transition-all border",
                        user.role === role
                          ? "bg-black border-black text-white shadow-md"
                          : "bg-white border-black/5 text-black/60 hover:border-black/20"
                      )}
                    >
                      {role === 'admin' ? 'Administrador' : 'Usuário'}
                    </button>
                  ))}
                </div>
              </div>

              {/* Agency Link */}
              {user.role !== 'admin' && (
                <div>
                  <label className="text-[10px] font-bold text-black/40 uppercase tracking-wider mb-2 block">
                    Vincular Imobiliária
                  </label>
                  <select
                    value={user.agencyId || ''}
                    onChange={(e) => handleUpdateAgency(user, e.target.value)}
                    className="w-full px-3 py-2 bg-[#f5f5f0]/50 border border-black/5 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-black/5 transition-all"
                  >
                    <option value="">Nenhuma imobiliária</option>
                    {agencies.map((agency) => (
                      <option key={agency.id} value={agency.id}>
                        {agency.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}
            </div>
          </motion.div>
        ))}
      </div>

      {filteredUsers.length === 0 && (
        <div className="text-center py-12 bg-white rounded-[32px] border border-dashed border-black/10">
          <Users className="w-12 h-12 text-black/10 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-[#1a1a1a]">Nenhum usuário encontrado</h3>
          <p className="text-sm text-black/40">Tente ajustar sua busca.</p>
        </div>
      )}
    </div>
  );
}
