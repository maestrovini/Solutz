import React, { useState, useEffect } from 'react';
import { api } from '../api';
import { UserProfile, Agency } from '../types';
import { Users, Shield, User, Building2, Search, Filter, MoreVertical, Edit2, Trash2, Check, X, Mail, ShieldAlert } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { useHeader } from '../context/HeaderContext';
import { useAuth } from '../context/AuthContext';
import { cn } from '../utils/cn';

export default function UserManager() {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [agencies, setAgencies] = useState<Agency[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<UserProfile | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const { user: currentUser } = useAuth();
  const [formData, setFormData] = useState<Partial<UserProfile>>({
    username: '',
    password: '',
    displayName: '',
    role: 'user',
    agencyId: ''
  });
  const { setTitle, setActions } = useHeader();

  useEffect(() => {
    setTitle('Gestão de Usuários');
    setActions(
      <button
        onClick={() => {
          setEditingUser(null);
          setFormData({
            username: '',
            password: '',
            displayName: '',
            role: 'user',
            agencyId: ''
          });
          setIsModalOpen(true);
        }}
        className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/20 text-white rounded-xl transition-all font-bold text-sm border border-white/10"
      >
        <Users className="w-4 h-4" />
        Novo Usuário
      </button>
    );
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

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editingUser) {
      try {
        const dataToUpdate = { ...formData };
        // Don't update password if it's empty
        if (!dataToUpdate.password) {
          delete dataToUpdate.password;
        }
        await api.update('users', editingUser.id || editingUser.uid, dataToUpdate);
        setEditingUser(null);
        setIsModalOpen(false);
      } catch (error) {
        console.error("Erro ao atualizar usuário:", error);
      }
      return;
    }

    try {
      await api.create('users', {
        ...formData,
        uid: `user_${Date.now()}` // Temporary UID, preferably use the one from Firestore
      });
      // Update local state is handled by subscription
      setIsModalOpen(false);
    } catch (error) {
      console.error("Erro ao criar usuário:", error);
    }
  };

  const handleUpdateRole = async (user: UserProfile, newRole: UserProfile['role']) => {
    try {
      await api.update('users', user.id || user.uid, { role: newRole });
    } catch (error) {
      console.error("Erro ao atualizar cargo:", error);
    }
  };

  const handleUpdateAgency = async (user: UserProfile, agencyId: string) => {
    try {
      await api.update('users', user.id || user.uid, { agencyId });
    } catch (error) {
      console.error("Erro ao vincular imobiliária:", error);
    }
  };

  const handleDeleteUser = async () => {
    if (!userToDelete) return;

    if (userToDelete.id === 'admin_solutz_root') {
      setErrorMessage('O usuário principal Solutz não pode ser excluído.');
      setTimeout(() => setErrorMessage(null), 3000);
      setUserToDelete(null);
      return;
    }

    if (currentUser && (userToDelete.id === currentUser.id || userToDelete.uid === currentUser.uid)) {
      setErrorMessage('Você não pode excluir seu próprio usuário.');
      setTimeout(() => setErrorMessage(null), 3000);
      setUserToDelete(null);
      return;
    }

    try {
      const deleteId = userToDelete.id || userToDelete.uid;
      if (!deleteId) throw new Error("ID do usuário não encontrado");
      
      await api.delete('users', deleteId);
      setUserToDelete(null);
    } catch (error) {
      console.error("Erro ao excluir usuário:", error);
      setErrorMessage('Erro ao excluir usuário. Verifique suas permissões.');
      setTimeout(() => setErrorMessage(null), 3000);
    }
  };

  const filteredUsers = users
    .filter(user => 
      user.displayName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.username?.toLowerCase().includes(searchTerm.toLowerCase())
    )
    .sort((a, b) => {
      // Root system admin always first
      if (a.id === 'admin_solutz_root') return -1;
      if (b.id === 'admin_solutz_root') return 1;
      
      // Sort alphabetically by display name for others
      return (a.displayName || '').localeCompare(b.displayName || '');
    });

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

      <AnimatePresence>
        {errorMessage && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="bg-red-50 border border-red-100 rounded-xl p-3 flex items-center gap-2 text-red-500 text-xs font-bold shadow-sm"
          >
            <ShieldAlert className="w-4 h-4 shrink-0" />
            {errorMessage}
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pb-20">
        {filteredUsers.map((user) => (
          <div
            key={user.id || user.uid || Math.random().toString()}
            className="bg-white p-4 rounded-[24px] shadow-xs border border-black/5 hover:border-black/10 transition-all group flex flex-col h-full"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-12 h-12 rounded-xl flex items-center justify-center text-white shadow-lg transition-transform group-hover:scale-105 bg-black"
                )}>
                  {(user.role === 'admin' || user.id === 'admin_solutz_root') ? <Shield className="w-6 h-6" /> : <User className="w-6 h-6" />}
                </div>
                <div>
                  <h3 className="text-sm font-black text-[#1a1a1a] leading-tight tracking-tight">{user.displayName || 'Sem nome'}</h3>
                  <div className="flex items-center gap-1.5 text-[9px] text-black/30 uppercase font-black tracking-widest mt-1">
                    <Mail className="w-2.5 h-2.5" />
                    {user.username || user.email || 'N/A'}
                  </div>
                  {currentUser?.role === 'admin' && (
                    <div className="text-[7px] text-black/20 font-mono mt-0.5">
                      ID: {user.id}
                    </div>
                  )}
                </div>
              </div>
              <div className="flex items-center gap-1.5">
                <div className={cn(
                  "px-2 py-1 rounded-lg text-[8px] font-black uppercase tracking-widest",
                  user.id === 'admin_solutz_root' 
                    ? "bg-black text-white ring-1 ring-black/10 shadow-sm" 
                    : (user.role === 'admin' ? "bg-emerald-50 text-emerald-600 border border-emerald-100" : "bg-blue-50 text-blue-600 border border-blue-100")
                )}>
                  {user.id === 'admin_solutz_root' ? '🛡️ SISTEMA' : (user.role === 'admin' ? 'Administrador' : 'Operacional')}
                </div>
                {currentUser?.role === 'admin' && user.id !== 'admin_solutz_root' && (
                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setEditingUser(user);
                        setFormData({
                          username: user.username || '',
                          password: '', // Clear password field for editing
                          displayName: user.displayName || '',
                          role: user.role || 'user',
                          agencyId: user.agencyId || ''
                        });
                        setIsModalOpen(true);
                      }}
                      className="p-1.5 text-black/20 hover:text-black/60 hover:bg-black/5 rounded-lg transition-all"
                      title="Editar Usuário"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        setUserToDelete(user);
                      }}
                      className="p-1.5 text-black/20 hover:text-red-500 hover:bg-red-50 rounded-lg transition-all"
                      title="Excluir Usuário"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {user.id !== 'admin_solutz_root' && (
              <div className="mt-auto pt-4 border-t border-black/5 grid grid-cols-1 gap-3">
                {/* Access Level */}
                <div>
                  <label className="text-[9px] font-black text-black/20 uppercase tracking-widest mb-2 block">
                    Nível de Acesso
                  </label>
                  <div className="flex gap-2">
                    {(['admin', 'user'] as const).map((role) => (
                      <button
                        key={role}
                        type="button"
                        disabled={user.id === 'admin_solutz_root'}
                        onClick={() => handleUpdateRole(user, role)}
                        className={cn(
                          "flex-1 py-2 rounded-xl text-[9px] font-black uppercase tracking-widest transition-all",
                          user.role === role
                            ? (role === 'admin' ? "bg-emerald-600 text-white shadow-md" : "bg-blue-600 text-white shadow-md")
                            : "bg-[#f5f5f0] text-black/40 hover:bg-black/5 hover:text-black/60"
                        )}
                      >
                        {role === 'admin' ? 'Admin' : 'Operacional'}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {filteredUsers.length === 0 && (
        <div className="text-center py-12 bg-white rounded-[32px] border border-dashed border-black/10">
          <Users className="w-12 h-12 text-black/10 mx-auto mb-4" />
          <h3 className="text-lg font-bold text-[#1a1a1a]">Nenhum usuário encontrado</h3>
          <p className="text-sm text-black/40">Tente ajustar sua busca.</p>
        </div>
      )}

      {/* Create User Modal */}
      <AnimatePresence>
        {isModalOpen && (
          <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsModalOpen(false)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-lg bg-[#f5f5f0] rounded-[40px] shadow-2xl overflow-hidden border border-black/5"
            >
              <div className="p-8">
                <div className="flex items-center justify-between mb-8">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 bg-black rounded-2xl flex items-center justify-center text-white shadow-lg">
                      <User className="w-6 h-6" />
                    </div>
                    <div>
                      <h2 className="text-2xl font-black text-[#1a1a1a] tracking-tight">
                        {editingUser ? 'Editar Usuário' : 'Novo Usuário'}
                      </h2>
                      <p className="text-black/40 text-sm font-medium">
                        {editingUser ? 'Atualize as informações de acesso' : 'Cadastre um novo acesso ao sistema'}
                      </p>
                    </div>
                  </div>
                  <button 
                    onClick={() => {
                      setIsModalOpen(false);
                      setEditingUser(null);
                    }}
                    className="p-2 hover:bg-black/5 rounded-full transition-colors"
                  >
                    <X className="w-6 h-6 text-black/40" />
                  </button>
                </div>

                <form onSubmit={handleCreateUser} className="space-y-6">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-black/40 uppercase tracking-widest mb-2 ml-1">
                        Nome de Exibição
                      </label>
                      <input
                        required
                        type="text"
                        value={formData.displayName}
                        onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
                        className="w-full px-4 py-3 bg-white border border-black/5 rounded-2xl outline-none focus:ring-2 focus:ring-black/5 transition-all"
                        placeholder="Ex: João Silva"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-black/40 uppercase tracking-widest mb-2 ml-1">
                        Usuário (Login)
                      </label>
                      <input
                        required
                        type="text"
                        value={formData.username}
                        onChange={(e) => setFormData({ ...formData, username: e.target.value })}
                        className="w-full px-4 py-3 bg-white border border-black/5 rounded-2xl outline-none focus:ring-2 focus:ring-black/5 transition-all"
                        placeholder="Ex: joao.silva"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-bold text-black/40 uppercase tracking-widest mb-2 ml-1">
                        {editingUser ? 'Nova Senha (deixe em branco para manter)' : 'Senha'}
                      </label>
                      <input
                        required={!editingUser}
                        type="password"
                        value={formData.password}
                        onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                        className="w-full px-4 py-3 bg-white border border-black/5 rounded-2xl outline-none focus:ring-2 focus:ring-black/5 transition-all"
                        placeholder="••••••••"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-black/40 uppercase tracking-widest mb-2 ml-1">
                        Cargo
                      </label>
                      <select
                        value={formData.role}
                        onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'user' })}
                        className="w-full px-4 py-3 bg-white border border-black/5 rounded-2xl outline-none focus:ring-2 focus:ring-black/5 transition-all appearance-none"
                      >
                        <option value="user">Operacional</option>
                        <option value="admin">Administrador</option>
                      </select>
                    </div>
                  </div>

                  <div className="pt-4 flex gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setIsModalOpen(false);
                        setEditingUser(null);
                      }}
                      className="flex-1 px-6 py-4 rounded-2xl font-bold text-black/60 hover:bg-black/5 transition-all"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      className="flex-1 bg-black text-white px-6 py-4 rounded-2xl font-black shadow-xl shadow-black/10 hover:bg-black/90 active:scale-[0.98] transition-all"
                    >
                      {editingUser ? 'Salvar Alterações' : 'Criar Usuário'}
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Delete Confirmation Modal */}
      <AnimatePresence>
        {userToDelete && (
          <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setUserToDelete(null)}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative w-full max-w-sm bg-white rounded-[32px] shadow-2xl overflow-hidden border border-black/5 p-8 text-center"
            >
              <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center text-red-500 mx-auto mb-6">
                <Trash2 className="w-10 h-10" />
              </div>
              
              <h2 className="text-2xl font-black text-[#1a1a1a] mb-2 tracking-tight">Excluir Usuário?</h2>
              <p className="text-black/40 text-sm mb-8 leading-relaxed px-4">
                Tem certeza que deseja excluir <span className="text-[#1a1a1a] font-bold">{userToDelete.displayName}</span>?
                <br/>
                <span className="text-red-500 text-[10px] uppercase font-bold tracking-widest mt-2 block">Ação Irreversível</span>
              </p>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setUserToDelete(null)}
                  className="flex-1 px-6 py-4 rounded-2xl font-bold text-black/60 hover:bg-black/5 transition-all"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    handleDeleteUser();
                  }}
                  className="flex-1 bg-red-500 text-white px-6 py-4 rounded-2xl font-black shadow-xl shadow-red-500/20 hover:bg-red-600 active:scale-[0.98] transition-all"
                >
                  Excluir
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
