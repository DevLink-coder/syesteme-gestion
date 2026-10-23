import { createRoot } from 'react-dom/client';
import 'flatpickr/dist/flatpickr.css';
import { AppWrapper } from './components/common/PageMeta';
import { ThemeProvider } from './context/ThemeContext';
import { ToastProvider } from './context/ToastContext';
import SpaApp from './SpaApp';
import InstallAppPrompt from './components/common/InstallAppPrompt';

if ('serviceWorker' in navigator && import.meta.env.PROD) {
    window.addEventListener('load', () => {
        void navigator.serviceWorker.register('/service-worker.js', {
            scope: '/',
        });
    });
}

const el = document.getElementById('spa');
if (el) {
    createRoot(el).render(
        <ThemeProvider>
            <ToastProvider>
                <AppWrapper>
                    <SpaApp />
                </AppWrapper>
                <InstallAppPrompt />
            </ToastProvider>
        </ThemeProvider>,
    );
}
