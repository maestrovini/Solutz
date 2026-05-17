import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogIn, Shield, Lock, User } from 'lucide-react';
import { motion } from 'motion/react';

export default function Login() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const success = await login(username, password);
      if (!success) {
        setError('Usuário ou senha incorretos');
      }
    } catch (err) {
      setError('Ocorreu um erro ao tentar entrar');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#f5f5f0] flex flex-col items-center justify-center p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="w-20 h-20 bg-black rounded-[24px] flex items-center justify-center text-white shadow-2xl mb-4 rotate-3">
            <Shield className="w-10 h-10" />
          </div>
          <h1 className="text-3xl font-black text-[#1a1a1a] tracking-tight">SOLUTZ</h1>
          <p className="text-black/40 font-medium mt-1">Gestão de Processos e Crédito</p>
        </div>

        <div className="bg-white p-8 rounded-[40px] shadow-2xl border border-black/5 relative overflow-hidden">
          {/* Decorative background elements */}
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 rounded-full -mr-16 -mt-16 blur-2xl" />
          <div className="absolute bottom-0 left-0 w-32 h-32 bg-black/5 rounded-full -ml-16 -mb-16 blur-2xl" />

          <form onSubmit={handleSubmit} className="space-y-6 relative">
            <div>
              <label className="block text-[10px] font-bold text-black/40 uppercase tracking-widest mb-2 ml-1">
                Usuário
              </label>
              <div className="relative group">
                <User className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-black/20 group-focus-within:text-black transition-colors" />
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-[#f5f5f0]/50 border border-black/5 rounded-2xl outline-none focus:ring-2 focus:ring-black/10 focus:border-black/10 transition-all font-medium"
                  placeholder="Seu usuário"
                />
              </div>
            </div>

            <div>
              <label className="block text-[10px] font-bold text-black/40 uppercase tracking-widest mb-2 ml-1">
                Senha
              </label>
              <div className="relative group">
                <Lock className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-black/20 group-focus-within:text-black transition-colors" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-12 pr-4 py-4 bg-[#f5f5f0]/50 border border-black/5 rounded-2xl outline-none focus:ring-2 focus:ring-black/10 focus:border-black/10 transition-all font-medium"
                  placeholder="Sua senha"
                />
              </div>
            </div>

            {error && (
              <motion.div 
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                className="bg-red-50 text-red-500 text-xs font-bold py-3 px-4 rounded-xl border border-red-100 flex items-center gap-2"
              >
                <div className="w-1.5 h-1.5 rounded-full bg-red-500" />
                {error}
              </motion.div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-black text-white py-4 rounded-2xl font-black flex items-center justify-center gap-3 hover:bg-black/90 transition-all active:scale-[0.98] disabled:opacity-50 shadow-xl shadow-black/20"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  Entrar no Sistema
                  <LogIn className="w-5 h-5" />
                </>
              )}
            </button>
          </form>
        </div>

        <div className="mt-8 text-center">
          <p className="text-[10px] font-bold text-black/20 uppercase tracking-widest">
            &copy; {new Date().getFullYear()} Solutz Soluções Financeiras
          </p>
        </div>
      </motion.div>
    </div>
  );
}
