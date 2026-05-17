import React, { createContext, useContext, useState, useEffect } from 'react';
import { UserProfile } from '../types';
import { api } from '../api';

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
  isAdmin: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(() => {
    const saved = localStorage.getItem('solutz_auth');
    return saved ? JSON.parse(saved) : null;
  });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Initial admin creation if not exists
    const ensureAdmin = async () => {
      try {
        const users = await api.list('users') as UserProfile[];
        const rootAdmin = users?.find(u => u.id === 'admin_solutz_root');
        
        // Clean up duplicates: Any user with username 'Solutz' that is NOT the root ID
        const duplicates = users?.filter(u => u.username === 'Solutz' && u.id !== 'admin_solutz_root');
        if (duplicates && duplicates.length > 0) {
          console.log(`Found ${duplicates.length} duplicate Solutz users. Cleaning up...`);
          for (const duplicate of duplicates) {
            await api.delete('users', duplicate.id || duplicate.uid);
          }
        }

        if (!rootAdmin) {
          await api.set('users', 'admin_solutz_root', {
            username: 'Solutz',
            password: 'Solutz@dmin',
            displayName: 'Administrador Solutz',
            role: 'admin',
            uid: 'admin_solutz'
          });
          console.log('Admin user created successfully');
        }
      } catch (error) {
        console.error('Error ensuring admin:', error);
      } finally {
        setLoading(false);
      }
    };

    ensureAdmin();
  }, []);

  const login = async (username: string, password: string) => {
    try {
      const users = await api.list('users') as UserProfile[];
      const foundUser = users?.find(u => u.username === username && u.password === password);
      
      if (foundUser) {
        setUser(foundUser);
        localStorage.setItem('solutz_auth', JSON.stringify(foundUser));
        return true;
      }
      return false;
    } catch (error) {
      console.error('Login error:', error);
      return false;
    }
  };

  const logout = () => {
    setUser(null);
    localStorage.removeItem('solutz_auth');
  };

  const isAdmin = user?.role === 'admin';

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAdmin }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
