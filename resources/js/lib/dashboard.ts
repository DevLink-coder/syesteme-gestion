import { useEffect, useState } from 'react';

export type DashboardData = Record<string, any>;

const fallbackDashboard: DashboardData = {
    students: 0,
    activeStudents: 0,
    teachers: 0,
    salles: 0,
    attendanceRate: 0,
    ca: 0,
    monthly: [],
    recent: [],
    debtors: [],
    attendanceTrend: [],
    notifications: [],
};

export function getInitialDashboard(): DashboardData {
    if (typeof window === 'undefined') {
        return fallbackDashboard;
    }

    return (window as any).__DASHBOARD__ || fallbackDashboard;
}

export async function fetchDashboardData(): Promise<DashboardData> {
    const response = await fetch('/web/dashboard-data', {
        credentials: 'include',
        headers: { Accept: 'application/json' },
    });

    if (!response.ok) {
        throw new Error('Impossible de charger le tableau de bord');
    }

    const payload = (await response.json()) as DashboardData;

    if (typeof window !== 'undefined') {
        (window as any).__DASHBOARD__ = payload;
    }

    return payload;
}

export function triggerDashboardRefresh() {
    if (typeof window === 'undefined') {
        return;
    }

    window.dispatchEvent(new CustomEvent('dashboard:refresh'));
}

export function useDashboardData() {
    const [dashboard, setDashboard] = useState<DashboardData>(() =>
        getInitialDashboard(),
    );

    const refresh = async () => {
        try {
            const data = await fetchDashboardData();
            setDashboard(data);
        } catch {
            setDashboard(getInitialDashboard());
        }
    };

    useEffect(() => {
        void refresh();

        const refreshTimer = window.setInterval(() => {
            void refresh();
        }, 30000);

        const onRefresh = () => {
            void refresh();
        };

        const onVisibilityChange = () => {
            if (!document.hidden) {
                void refresh();
            }
        };

        window.addEventListener('dashboard:refresh', onRefresh);
        document.addEventListener('visibilitychange', onVisibilityChange);

        return () => {
            window.clearInterval(refreshTimer);
            window.removeEventListener('dashboard:refresh', onRefresh);
            document.removeEventListener(
                'visibilitychange',
                onVisibilityChange,
            );
        };
    }, []);

    return { dashboard, refresh };
}
