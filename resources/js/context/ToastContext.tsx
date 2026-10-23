import React, { createContext, useContext, useState, useCallback } from 'react';

type ToastType = 'success' | 'error' | 'info';
interface Toast {
    id: string;
    message: string;
    type: ToastType;
}

interface ToastContextValue {
    showToast: (message: string, type?: ToastType) => void;
    toasts: Toast[];
    removeToast: (id: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const [toasts, setToasts] = useState<Toast[]>([]);

    const showToast = useCallback(
        (message: string, type: ToastType = 'success') => {
            const id = Math.random().toString(36).slice(2, 9);
            setToasts((prev) => [...prev, { id, message, type }]);
            setTimeout(() => {
                setToasts((prev) => prev.filter((t) => t.id !== id));
            }, 3000);
        },
        [],
    );

    const removeToast = useCallback((id: string) => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
    }, []);

    return (
        <ToastContext.Provider value={{ showToast, toasts, removeToast }}>
            {children}
            <div className="pointer-events-none fixed top-4 right-4 z-[9999] flex flex-col gap-2">
                {toasts.map((t) => (
                    <div
                        key={t.id}
                        className={`pointer-events-auto flex items-center gap-3 rounded-xl border px-4 py-3 text-sm font-medium shadow-lg backdrop-blur transition-all duration-300 ${
                            t.type === 'success'
                                ? 'border-success-200 text-success-700 dark:border-success-800 dark:text-success-400 bg-white dark:bg-gray-800'
                                : t.type === 'error'
                                  ? 'border-error-200 text-error-700 dark:border-error-800 dark:text-error-400 bg-white dark:bg-gray-800'
                                  : 'border-gray-200 bg-white text-gray-700 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-300'
                        }`}
                    >
                        <span
                            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-white ${t.type === 'success' ? 'bg-success-500' : t.type === 'error' ? 'bg-error-500' : 'bg-brand-500'}`}
                        >
                            {t.type === 'success'
                                ? '✓'
                                : t.type === 'error'
                                  ? '✕'
                                  : '•'}
                        </span>
                        <span>{t.message}</span>
                        <button
                            onClick={() => removeToast(t.id)}
                            className="ml-2 text-gray-400 hover:text-gray-600 dark:text-gray-500"
                        >
                            ✕
                        </button>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    );
};

export const useToast = () => {
    const ctx = useContext(ToastContext);
    if (!ctx) throw new Error('useToast must be used within ToastProvider');
    return ctx;
};
