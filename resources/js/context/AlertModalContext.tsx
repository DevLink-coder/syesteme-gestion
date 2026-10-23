import React, { createContext, useCallback, useContext, useState } from 'react';
import Button from '../components/ui/button/Button';
import { Modal } from '../components/ui/modal';

interface AlertModalContextValue {
    showAlert: (message: string) => void;
}

const AlertModalContext = createContext<AlertModalContextValue | undefined>(
    undefined,
);

function decodeHtmlEntities(value: string): string {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = value;
    return textarea.value;
}

export const AlertModalProvider: React.FC<{ children: React.ReactNode }> = ({
    children,
}) => {
    const [message, setMessage] = useState<string | null>(null);
    const showAlert = useCallback((text: string) => {
        setMessage(
            decodeHtmlEntities(String(text || 'Une erreur est survenue.')),
        );
    }, []);

    return (
        <AlertModalContext.Provider value={{ showAlert }}>
            {children}
            <Modal
                isOpen={message !== null}
                onClose={() => setMessage(null)}
                className="max-w-md p-6"
            >
                <h2 className="mb-2 text-lg font-semibold text-gray-900 dark:text-white">
                    Information
                </h2>
                <p className="text-sm whitespace-pre-wrap text-gray-600 dark:text-gray-300">
                    {message}
                </p>
                <div className="mt-5 flex justify-end">
                    <Button onClick={() => setMessage(null)}>Fermer</Button>
                </div>
            </Modal>
        </AlertModalContext.Provider>
    );
};

export function useAlertModal() {
    const context = useContext(AlertModalContext);
    if (!context) {
        throw new Error('useAlertModal must be used within AlertModalProvider');
    }
    return context;
}
