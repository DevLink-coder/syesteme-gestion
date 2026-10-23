import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router';
import { Dropdown } from '../ui/dropdown/Dropdown';

interface ApplicationNotification {
    id: number;
    type: string;
    title: string;
    message: string;
    target_url: string | null;
    read_at: string | null;
    created_at: string;
}

function decodeHtmlEntities(value: string): string {
    const textarea = document.createElement('textarea');
    textarea.innerHTML = value;
    return textarea.value;
}

function formatDate(value: string): string {
    return new Date(value).toLocaleString('fr-FR', {
        day: '2-digit',
        month: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
    });
}

async function updateAppIconBadge(count: number): Promise<void> {
    const badgeApi = navigator as Navigator & {
        setAppBadge?: (contents?: number) => Promise<void>;
        clearAppBadge?: () => Promise<void>;
    };

    try {
        if (count > 0) await badgeApi.setAppBadge?.(count);
        else await badgeApi.clearAppBadge?.();
        const registration =
            await navigator.serviceWorker?.getRegistration('/');
        if (count > 0)
            registration?.active?.postMessage({
                type: 'SET_BADGE',
                count,
            });
        else registration?.active?.postMessage({ type: 'CLEAR_BADGE' });
    } catch {
        // App icon badges are optional and depend on browser and operating system support.
    }
}

export default function NotificationDropdown() {
    const navigate = useNavigate();
    const [isOpen, setIsOpen] = useState(false);
    const [notifications, setNotifications] = useState<
        ApplicationNotification[]
    >([]);
    const [unreadCount, setUnreadCount] = useState(0);

    const loadNotifications = useCallback(async (markAsViewed = false) => {
        try {
            const response = await fetch('/web/notifications', {
                credentials: 'include',
                headers: { Accept: 'application/json' },
                cache: 'no-store',
            });
            if (!response.ok) return;
            const payload = await response.json();
            const rows: ApplicationNotification[] = Array.isArray(
                payload.notifications,
            )
                ? payload.notifications
                : [];
            setNotifications(rows);
            const nextUnreadCount = Number(payload.unreadCount || 0);
            setUnreadCount(nextUnreadCount);
            void updateAppIconBadge(nextUnreadCount);

            const ids = markAsViewed
                ? rows.filter((item) => !item.read_at).map((item) => item.id)
                : [];
            if (ids.length > 0) {
                await fetch('/web/notifications/viewed', {
                    method: 'POST',
                    credentials: 'include',
                    headers: {
                        Accept: 'application/json',
                        'Content-Type': 'application/json',
                        'X-CSRF-TOKEN':
                            document.querySelector<HTMLMetaElement>(
                                'meta[name="csrf-token"]',
                            )?.content || '',
                    },
                    body: JSON.stringify({ ids }),
                });
                const seenAt = new Date().toISOString();
                setNotifications((current) =>
                    current.map((item) =>
                        ids.includes(item.id)
                            ? { ...item, read_at: seenAt }
                            : item,
                    ),
                );
                setUnreadCount((count) => Math.max(0, count - ids.length));
                void updateAppIconBadge(
                    Math.max(0, Number(payload.unreadCount || 0) - ids.length),
                );
            }
        } catch {
            // The bell remains usable if the notification endpoint is temporarily unavailable.
        }
    }, []);

    useEffect(() => {
        void loadNotifications();
        const timer = window.setInterval(() => {
            void loadNotifications(isOpen);
        }, 30000);
        return () => window.clearInterval(timer);
    }, [isOpen, loadNotifications]);

    const toggleDropdown = () => {
        const opening = !isOpen;
        setIsOpen(opening);
        if (opening) void loadNotifications(true);
    };

    const openNotification = (item: ApplicationNotification) => {
        setIsOpen(false);
        if (item.target_url) void navigate(item.target_url);
    };

    return (
        <div className="relative">
            <button
                type="button"
                aria-label={
                    unreadCount > 0
                        ? `Notifications non lues : ${unreadCount}`
                        : 'Notifications'
                }
                aria-expanded={isOpen}
                className="dropdown-toggle relative flex h-11 w-11 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:border-gray-800 dark:bg-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
                onClick={toggleDropdown}
            >
                <svg
                    className="fill-current"
                    width="20"
                    height="20"
                    viewBox="0 0 20 20"
                    xmlns="http://www.w3.org/2000/svg"
                    aria-hidden="true"
                >
                    <path
                        fillRule="evenodd"
                        clipRule="evenodd"
                        d="M10.75 2.29248C10.75 1.87827 10.4143 1.54248 10 1.54248C9.58583 1.54248 9.25004 1.87827 9.25004 2.29248V2.83613C6.08266 3.20733 3.62504 5.9004 3.62504 9.16748V14.4591H3.33337C2.91916 14.4591 2.58337 14.7949 2.58337 15.2091C2.58337 15.6234 2.91916 15.9591 3.33337 15.9591H4.37504H15.625H16.6667C17.0809 15.9591 17.4167 15.6234 17.4167 15.2091C17.4167 14.7949 17.0809 14.4591 16.6667 14.4591H16.375V9.16748C16.375 5.9004 13.9174 3.20733 10.75 2.83613V2.29248ZM14.875 14.4591V9.16748C14.875 6.47509 12.6924 4.29248 10 4.29248C7.30765 4.29248 5.12504 6.47509 5.12504 9.16748V14.4591H14.875ZM8.00004 17.7085C8.00004 18.1228 8.33583 18.4585 8.75004 18.4585H11.25C11.6643 18.4585 12 18.1228 12 17.7085C12 17.2943 11.6643 16.9585 11.25 16.9585H8.75004C8.33583 16.9585 8.00004 17.2943 8.00004 17.7085Z"
                        fill="currentColor"
                    />
                </svg>
                {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-orange-500 px-1 text-[10px] font-semibold text-white">
                        {unreadCount > 9 ? '9+' : unreadCount}
                    </span>
                )}
            </button>

            <Dropdown
                isOpen={isOpen}
                onClose={() => setIsOpen(false)}
                className="shadow-theme-lg absolute right-0 mt-[17px] flex h-[480px] max-h-[80vh] w-[calc(100vw-32px)] max-w-[360px] flex-col rounded-2xl border border-gray-200 bg-white p-3 max-sm:-right-2 sm:right-0 sm:w-[361px] dark:border-gray-800 dark:bg-gray-800"
            >
                <div className="mb-3 flex items-center justify-between border-b border-gray-100 pb-3 dark:border-gray-700">
                    <div>
                        <h2 className="text-lg font-semibold text-gray-800 dark:text-gray-200">
                            Notifications
                        </h2>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            Elles disparaissent une heure après consultation.
                        </p>
                    </div>
                    <button
                        type="button"
                        aria-label="Fermer les notifications"
                        onClick={() => setIsOpen(false)}
                        className="text-gray-500 transition hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                    >
                        <svg
                            className="fill-current"
                            width="24"
                            height="24"
                            viewBox="0 0 24 24"
                            aria-hidden="true"
                        >
                            <path
                                fillRule="evenodd"
                                clipRule="evenodd"
                                d="M6.21967 7.28131C5.92678 6.98841 5.92678 6.51354 6.21967 6.22065C6.51256 5.92775 6.98744 5.92775 7.28033 6.22065L11.999 10.9393L16.7176 6.22078C17.0105 5.92789 17.4854 5.92788 17.7782 6.22078C18.0711 6.51367 18.0711 6.98855 17.7782 7.28144L13.0597 12L17.7782 16.7186C18.0711 17.0115 18.0711 17.4863 17.7782 17.7792C17.4854 18.0723 17.0105 18.0721 16.7176 17.7792L11.999 13.0607L7.28033 17.7794C6.98744 18.0722 6.51256 18.0722 6.21967 17.7794C5.92678 17.4865 5.92678 17.0116 6.21967 16.7187L10.9384 12L6.21967 7.28131Z"
                                fill="currentColor"
                            />
                        </svg>
                    </button>
                </div>

                <ul className="custom-scrollbar flex min-h-0 flex-1 flex-col overflow-y-auto">
                    {notifications.length === 0 ? (
                        <li className="py-12 text-center text-sm text-gray-500 dark:text-gray-400">
                            Aucune notification pour le moment.
                        </li>
                    ) : (
                        notifications.map((item) => (
                            <li key={item.id}>
                                <button
                                    type="button"
                                    onClick={() => openNotification(item)}
                                    className={`flex w-full gap-3 border-b border-gray-100 p-3 text-left hover:bg-gray-50 dark:border-gray-700 dark:hover:bg-gray-700 ${item.read_at ? 'opacity-75' : ''}`}
                                >
                                    <span
                                        className={`mt-1 h-2.5 w-2.5 shrink-0 rounded-full ${item.type === 'payment_due' ? 'bg-amber-500' : 'bg-brand-500'}`}
                                    />
                                    <span className="min-w-0 flex-1">
                                        <span className="block text-sm font-semibold text-gray-800 dark:text-white">
                                            {decodeHtmlEntities(item.title)}
                                        </span>
                                        <span className="mt-1 block text-sm text-gray-600 dark:text-gray-300">
                                            {decodeHtmlEntities(item.message)}
                                        </span>
                                        <span className="mt-2 block text-xs text-gray-400">
                                            {formatDate(item.created_at)}
                                        </span>
                                    </span>
                                </button>
                            </li>
                        ))
                    )}
                </ul>
            </Dropdown>
        </div>
    );
}
