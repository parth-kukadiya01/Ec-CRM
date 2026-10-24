'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { CheckCircle2, AlertCircle, AlertTriangle, Info, X } from 'lucide-react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastContextType {
  toasts: ToastMessage[];
  addToast: (toast: Omit<ToastMessage, 'id'>) => string;
  removeToast: (id: string) => void;
  success: (message: string, title?: string, duration?: number) => string;
  error: (message: string, title?: string, duration?: number) => string;
  warning: (message: string, title?: string, duration?: number) => string;
  info: (message: string, title?: string, duration?: number) => string;
}

const ToastContext = createContext<ToastContextType | null>(null);

// Global custom event bridge for invoking toast from anywhere
const TOAST_EVENT = 'app:show-toast';

export const toast = {
  success: (message: string, title?: string, duration = 5000) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent(TOAST_EVENT, {
          detail: { type: 'success', message, title, duration },
        })
      );
    }
  },
  error: (message: string, title?: string, duration = 6500) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent(TOAST_EVENT, {
          detail: { type: 'error', message, title, duration },
        })
      );
    }
  },
  warning: (message: string, title?: string, duration = 5500) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent(TOAST_EVENT, {
          detail: { type: 'warning', message, title, duration },
        })
      );
    }
  },
  info: (message: string, title?: string, duration = 5000) => {
    if (typeof window !== 'undefined') {
      window.dispatchEvent(
        new CustomEvent(TOAST_EVENT, {
          detail: { type: 'info', message, title, duration },
        })
      );
    }
  },
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    return {
      toasts: [],
      addToast: () => '',
      removeToast: () => {},
      success: toast.success,
      error: toast.error,
      warning: toast.warning,
      info: toast.info,
    };
  }
  return context;
};

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const addToast = useCallback(
    ({ type, title, message, duration = 5000 }: Omit<ToastMessage, 'id'>) => {
      const id = 'toast_' + Math.random().toString(36).substring(2, 9);
      setToasts((prev) => [...prev, { id, type, title, message, duration }]);
      return id;
    },
    []
  );

  const success = useCallback(
    (message: string, title?: string, duration?: number) =>
      addToast({ type: 'success', message, title, duration }),
    [addToast]
  );

  const error = useCallback(
    (message: string, title?: string, duration?: number) =>
      addToast({ type: 'error', message, title, duration }),
    [addToast]
  );

  const warning = useCallback(
    (message: string, title?: string, duration?: number) =>
      addToast({ type: 'warning', message, title, duration }),
    [addToast]
  );

  const info = useCallback(
    (message: string, title?: string, duration?: number) =>
      addToast({ type: 'info', message, title, duration }),
    [addToast]
  );

  // Listen to global custom event
  useEffect(() => {
    const handleCustomToast = (event: Event) => {
      const customEvent = event as CustomEvent<{
        type: ToastType;
        message: string;
        title?: string;
        duration?: number;
      }>;
      if (customEvent.detail) {
        addToast(customEvent.detail);
      }
    };

    window.addEventListener(TOAST_EVENT, handleCustomToast);
    return () => {
      window.removeEventListener(TOAST_EVENT, handleCustomToast);
    };
  }, [addToast]);

  return (
    <ToastContext.Provider
      value={{
        toasts,
        addToast,
        removeToast,
        success,
        error,
        warning,
        info,
      }}
    >
      {children}
      <ToastContainer toasts={toasts} onDismiss={removeToast} />
    </ToastContext.Provider>
  );
};

export const ToastContainer: React.FC<{
  toasts: ToastMessage[];
  onDismiss: (id: string) => void;
}> = ({ toasts, onDismiss }) => {
  return (
    <div
      aria-live="polite"
      className="fixed top-5 right-5 z-[99999] flex flex-col gap-2.5 max-w-md w-[calc(100vw-2.5rem)] sm:w-[420px] pointer-events-none select-none"
    >
      {toasts.map((toast) => (
        <ToastItem key={toast.id} toast={toast} onDismiss={onDismiss} />
      ))}
    </div>
  );
};

const ToastItem: React.FC<{
  toast: ToastMessage;
  onDismiss: (id: string) => void;
}> = ({ toast, onDismiss }) => {
  const [isExiting, setIsExiting] = useState(false);

  useEffect(() => {
    const duration = toast.duration || 5000;
    const timer = setTimeout(() => {
      handleClose();
    }, duration);
    return () => clearTimeout(timer);
  }, [toast]);

  const handleClose = () => {
    setIsExiting(true);
    setTimeout(() => {
      onDismiss(toast.id);
    }, 200);
  };

  const getStyles = () => {
    switch (toast.type) {
      case 'error':
        return {
          wrapper: 'bg-white border-l-4 border-l-rose-600 border border-rose-200 text-slate-800 shadow-xl shadow-rose-900/10',
          iconBg: 'bg-rose-100 text-rose-600',
          icon: <AlertCircle className="w-5 h-5 shrink-0" />,
          title: toast.title || 'Error',
          titleColor: 'text-rose-900',
          progressColor: 'bg-rose-500',
        };
      case 'warning':
        return {
          wrapper: 'bg-white border-l-4 border-l-amber-500 border border-amber-200 text-slate-800 shadow-xl shadow-amber-900/10',
          iconBg: 'bg-amber-100 text-amber-700',
          icon: <AlertTriangle className="w-5 h-5 shrink-0" />,
          title: toast.title || 'Warning',
          titleColor: 'text-amber-900',
          progressColor: 'bg-amber-500',
        };
      case 'success':
        return {
          wrapper: 'bg-white border-l-4 border-l-emerald-600 border border-emerald-200 text-slate-800 shadow-xl shadow-emerald-900/10',
          iconBg: 'bg-emerald-100 text-emerald-600',
          icon: <CheckCircle2 className="w-5 h-5 shrink-0" />,
          title: toast.title || 'Success',
          titleColor: 'text-emerald-900',
          progressColor: 'bg-emerald-500',
        };
      case 'info':
      default:
        return {
          wrapper: 'bg-white border-l-4 border-l-blue-600 border border-blue-200 text-slate-800 shadow-xl shadow-blue-900/10',
          iconBg: 'bg-blue-100 text-blue-600',
          icon: <Info className="w-5 h-5 shrink-0" />,
          title: toast.title || 'Information',
          titleColor: 'text-blue-900',
          progressColor: 'bg-blue-500',
        };
    }
  };

  const s = getStyles();

  return (
    <div
      role="alert"
      className={`pointer-events-auto rounded-md p-3.5 flex items-start gap-3 transition-all duration-200 relative overflow-hidden backdrop-blur-sm ${
        s.wrapper
      } ${
        isExiting
          ? 'opacity-0 translate-x-4 scale-95'
          : 'animate-in fade-in slide-in-from-top-3 duration-200'
      }`}
    >
      <div className={`p-1.5 rounded-full shrink-0 ${s.iconBg}`}>
        {s.icon}
      </div>

      <div className="flex-1 min-w-0 pr-2">
        <h4 className={`text-xs font-bold leading-none mb-1 ${s.titleColor}`}>
          {s.title}
        </h4>
        <p className="text-xs text-slate-700 font-medium leading-relaxed break-words">
          {toast.message}
        </p>
      </div>

      <button
        type="button"
        onClick={handleClose}
        className="text-slate-400 hover:text-slate-700 hover:bg-slate-100 p-1 rounded transition-colors shrink-0 -mt-1 -mr-1"
        aria-label="Close"
      >
        <X className="w-4 h-4" />
      </button>

      {/* Progress line animation */}
      <div
        className={`absolute bottom-0 left-0 h-[2.5px] ${s.progressColor}`}
        style={{
          width: '100%',
          animation: `toastProgress ${toast.duration || 5000}ms linear forwards`,
        }}
      />
    </div>
  );
};
