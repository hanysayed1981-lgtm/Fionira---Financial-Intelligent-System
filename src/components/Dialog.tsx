import React from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { AlertTriangle, Info, CheckCircle2, X } from 'lucide-react';
import { Card } from './Card';

interface DialogProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm?: () => void;
  title: string;
  message: string;
  type?: 'info' | 'error' | 'success' | 'warning' | 'confirm';
  confirmText?: string;
  cancelText?: string;
}

export const Dialog: React.FC<DialogProps> = ({
  isOpen,
  onClose,
  onConfirm,
  title,
  message,
  type = 'info',
  confirmText = 'موافق',
  cancelText = 'إلغاء'
}) => {
  const Icon = type === 'error' || type === 'confirm' || type === 'warning' 
    ? AlertTriangle 
    : (type === 'success' ? CheckCircle2 : Info);

  const iconColor = type === 'error' ? 'text-rose-500' : (type === 'success' ? 'text-emerald-500' : (type === 'warning' || type === 'confirm' ? 'text-amber-500' : 'text-indigo-500'));
  const btnColor = type === 'error' ? 'bg-rose-600 hover:bg-rose-700' : (type === 'success' ? 'bg-emerald-600 hover:bg-emerald-700' : (type === 'warning' || type === 'confirm' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-indigo-600 hover:bg-indigo-700'));

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[999] flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
          />
          
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="w-full max-w-md z-10"
            dir="rtl"
          >
            <Card className="p-8 shadow-2xl overflow-hidden border-none text-right">
              <div className="flex items-start gap-4">
                <div className={`p-3 rounded-2xl bg-slate-50 ${iconColor}`}>
                  <Icon className="w-6 h-6" />
                </div>
                <div className="flex-1">
                  <h3 className="text-xl font-black text-slate-900 mb-2">{title}</h3>
                  <p className="text-slate-600 font-medium leading-relaxed">{message}</p>
                </div>
              </div>
              
              <div className="flex items-center justify-end gap-3 mt-8">
                {type === 'confirm' && (
                  <button
                    onClick={onClose}
                    className="px-6 py-2.5 rounded-xl font-bold text-slate-600 hover:bg-slate-50 transition-colors"
                  >
                    {cancelText}
                  </button>
                )}
                <button
                  onClick={() => {
                    if (onConfirm) onConfirm();
                    onClose();
                  }}
                  className={`px-8 py-2.5 rounded-xl font-bold text-white shadow-lg transition-all ${btnColor}`}
                >
                  {confirmText}
                </button>
              </div>
            </Card>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export const Notification: React.FC<{
  message: string;
  isOpen: boolean;
  onClose: () => void;
  type?: 'success' | 'error' | 'info';
}> = ({ message, isOpen, onClose, type = 'success' }) => {
  React.useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(onClose, 4000);
      return () => clearTimeout(timer);
    }
  }, [isOpen, onClose]);

  const Icon = type === 'success' ? CheckCircle2 : (type === 'error' ? AlertTriangle : Info);
  const bgColor = type === 'success' ? 'bg-emerald-50 border-emerald-100 text-emerald-800' : (type === 'error' ? 'bg-rose-50 border-rose-100 text-rose-800' : 'bg-indigo-50 border-indigo-100 text-indigo-800');
  const iconColor = type === 'success' ? 'text-emerald-500' : (type === 'error' ? 'text-rose-500' : 'text-indigo-500');

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: 20 }}
          className={`fixed bottom-8 left-8 z-[1000] p-4 rounded-2xl border shadow-xl flex items-center gap-4 ${bgColor}`}
          dir="rtl"
        >
          <Icon className={`w-6 h-6 ${iconColor}`} />
          <p className="font-bold text-sm ml-4">{message}</p>
          <button onClick={onClose} className="p-1 hover:bg-white/50 rounded-lg transition-colors">
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
