import { Head } from '@inertiajs/react';
import 'flatpickr/dist/flatpickr.css';
import { AppWrapper } from '@/components/common/PageMeta';
import { ThemeProvider } from '@/context/ThemeContext';
import SpaApp from '@/SpaApp';

export default function AppPage() {
    return (
        <>
            <Head title="EduCore" />
            <ThemeProvider>
                <AppWrapper>
                    <SpaApp />
                </AppWrapper>
            </ThemeProvider>
        </>
    );
}
