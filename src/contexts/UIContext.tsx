import React, { createContext, useContext, useState, ReactNode } from 'react';
import { Dialog, Notification } from '../components/Dialog';

interface UIContextType {
  showConfirm: (title: string, message: string, onConfirm: () => void) => void;
  showAlert: (title: string, message: string, type?: 'info' | 'error' | 'success' | 'warning') => void;
  notify: (message: string, type?: 'success' | 'error' | 'info') => void;
}

const UIContext = createContext<UIContextType | undefined>(undefined);

export const UIProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [dialog, setDialog] = useState<{ isOpen: boolean; title: string; message: string; type: 'info' | 'error' | 'success' | 'warning' | 'confirm'; onConfirm?: () => void }>({
    isOpen: false, title: '', message: '', type: 'info'
  });
  const [notification, setNotification] = useState<{ isOpen: boolean; message: string; type: 'success' | 'error' | 'info' }>({
    isOpen: false, message: '', type: 'success'
  });

  const showConfirm = (title: string, message: string, onConfirm: () => void) => {
    setDialog({ isOpen: true, title, message, type: 'confirm', onConfirm });
  };
  const showAlert = (title: string, message: string, type: 'info' | 'error' | 'success' | 'warning' = 'info') => {
    setDialog({ isOpen: true, title, message, type });
  };
  const notify = (message: string, type: 'success' | 'error' | 'info' = 'success') => {
    setNotification({ isOpen: true, message, type });
  };

  return (
    <UIContext.Provider value={{ showConfirm, showAlert, notify }}>
      {children}
      <Dialog 
        isOpen={dialog.isOpen} 
        onClose={() => setDialog(p => ({ ...p, isOpen: false }))} 
        onConfirm={dialog.onConfirm}
        title={dialog.title}
        message={dialog.message}
        type={dialog.type}
      />
      <Notification 
        isOpen={notification.isOpen} 
        onClose={() => setNotification(p => ({ ...p, isOpen: false }))} 
        message={notification.message}
        type={notification.type}
      />
    </UIContext.Provider>
  );
};

export const useUI = () => {
  const context = useContext(UIContext);
  if (!context) throw new Error('useUI must be used within a UIProvider');
  return context;
};
