import React, { createContext, useContext, useState, ReactNode, useCallback, useMemo } from 'react';

interface HeaderContextType {
  title: string;
  setTitle: (title: string) => void;
  actions: ReactNode;
  setActions: (actions: ReactNode) => void;
}

const HeaderContext = createContext<HeaderContextType | undefined>(undefined);

export function HeaderProvider({ children }: { children: ReactNode }) {
  const [title, setTitleState] = useState('');
  const [actions, setActionsState] = useState<ReactNode>(null);

  const setTitle = useCallback((newTitle: string) => {
    setTitleState(newTitle);
  }, []);

  const setActions = useCallback((newActions: ReactNode) => {
    setActionsState(newActions);
  }, []);

  const value = useMemo(() => ({
    title,
    setTitle,
    actions,
    setActions,
  }), [title, actions, setTitle, setActions]);

  return (
    <HeaderContext.Provider value={value}>
      {children}
    </HeaderContext.Provider>
  );
}

export function useHeader() {
  const context = useContext(HeaderContext);
  if (context === undefined) {
    throw new Error('useHeader must be used within a HeaderProvider');
  }
  return context;
}

