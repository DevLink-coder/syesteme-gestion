import { useState } from 'react';
import { useSidebar } from '../context/SidebarContext';
import { ThemeToggleButton } from '../components/common/ThemeToggleButton';
import NotificationDropdown from '../components/header/NotificationDropdown';
import UserDropdown from '../components/header/UserDropdown';
import UserSelector from '../components/common/UserSelector';

const AppHeader: React.FC = () => {
    const [isApplicationMenuOpen, setApplicationMenuOpen] = useState(false);
    const {
        isExpanded,
        isHovered,
        isMobileOpen,
        toggleSidebar,
        toggleMobileSidebar,
    } = useSidebar();
    const leftClass =
        isExpanded || isHovered || isMobileOpen
            ? 'lg:left-[290px]'
            : 'lg:left-[90px]';

    const handleToggle = () => {
        if (window.innerWidth >= 1024) toggleSidebar();
        else toggleMobileSidebar();
    };

    const toggleApplicationMenu = () =>
        setApplicationMenuOpen(!isApplicationMenuOpen);

    return (
        <header
            className={`fixed top-0 right-0 left-0 z-50 flex h-16 w-full items-center justify-between gap-4 border-b border-gray-200 bg-white px-4 lg:h-[68px] lg:px-6 dark:border-gray-800 dark:bg-gray-900 ${leftClass} lg:right-0 lg:w-auto`}
        >
            {/* Left - toggle seul, logo supprimé */}
            <div className="flex items-center">
                <button
                    onClick={handleToggle}
                    aria-label="Toggle Sidebar"
                    className="flex h-10 w-10 items-center justify-center rounded-xl border border-gray-200 bg-white text-gray-500 transition hover:bg-gray-50 hover:text-gray-700 lg:h-11 lg:w-11 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-400 dark:hover:bg-gray-700 dark:hover:text-white"
                >
                    {isMobileOpen ? (
                        <svg
                            width="20"
                            height="20"
                            viewBox="0 0 24 24"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path
                                fillRule="evenodd"
                                clipRule="evenodd"
                                d="M6.21967 7.28131C5.92678 6.98841 5.92678 6.51354 6.21967 6.22065C6.51256 5.92775 6.98744 5.92775 7.28033 6.22065L11.999 10.9393L16.7176 6.22078C17.0105 5.92789 17.4854 5.92788 17.7782 6.22078C18.0711 6.51367 18.0711 6.98855 17.7782 7.28144L13.0597 12L17.7782 16.7186C18.0711 17.0115 18.0711 17.4863 17.7782 17.7792C17.4854 18.0721 17.0105 18.0721 16.7176 17.7792L11.999 13.0607L7.28033 17.7794C6.98744 18.0722 6.51256 18.0722 6.21967 17.7794C5.92678 17.4865 5.92678 17.0116 6.21967 16.7187L10.9384 12L6.21967 7.28131Z"
                                fill="currentColor"
                            />
                        </svg>
                    ) : (
                        <svg
                            width="18"
                            height="14"
                            viewBox="0 0 16 12"
                            fill="none"
                            xmlns="http://www.w3.org/2000/svg"
                        >
                            <path
                                fillRule="evenodd"
                                clipRule="evenodd"
                                d="M0.58 1C0.58 0.585 0.91 0.25 1.33 0.25H14.66C15.08 0.25 15.41 0.585 15.41 1C15.41 1.414 15.08 1.75 14.66 1.75H1.33C0.91 1.75 0.58 1.414 0.58 1ZM0.58 6C0.58 5.585 0.91 5.25 1.33 5.25H7.99C8.41 5.25 8.74 5.585 8.74 6C8.74 6.414 8.41 6.75 7.99 6.75H1.33C0.91 6.75 0.58 6.414 0.58 6ZM1.33 10.25C0.91 10.25 0.58 10.585 0.58 11C0.58 11.414 0.91 11.75 1.33 11.75H14.66C15.08 11.75 15.41 11.414 15.41 11C15.41 10.585 15.08 10.25 14.66 10.25H1.33Z"
                                fill="currentColor"
                            />
                        </svg>
                    )}
                </button>
            </div>

            {/* Right - reorganized, spacious */}
            <div className="flex items-center gap-2 lg:gap-3">
                {/* Desktop/Tablet right group - visible dès md pour pro */}
                <div className="hidden items-center gap-2 sm:gap-3 md:flex">
                    <UserSelector />
                    <div className="hidden h-6 w-px bg-gray-200 sm:block dark:bg-gray-700" />
                    <ThemeToggleButton />
                    <NotificationDropdown />
                    <div className="hidden h-6 w-px bg-gray-200 sm:block dark:bg-gray-700" />
                    <UserDropdown />
                </div>

                {/* Mobile trigger - seulement smartphone */}
                <button
                    onClick={toggleApplicationMenu}
                    className="flex h-10 w-10 items-center justify-center rounded-xl bg-gray-50 text-gray-600 md:hidden dark:bg-gray-800 dark:text-gray-300"
                    aria-label="Menu"
                >
                    <svg
                        width="20"
                        height="20"
                        viewBox="0 0 24 24"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                    >
                        <path
                            fillRule="evenodd"
                            clipRule="evenodd"
                            d="M6 10.5A1.5 1.5 0 1 1 6 13.5A1.5 1.5 0 0 1 6 10.5ZM12 10.5A1.5 1.5 0 1 1 12 13.5A1.5 1.5 0 0 1 12 10.5ZM18 10.5A1.5 1.5 0 1 1 18 13.5A1.5 1.5 0 0 1 18 10.5Z"
                            fill="currentColor"
                        />
                    </svg>
                </button>
            </div>

            {/* Mobile dropdown panel - seulement smartphone */}
            {isApplicationMenuOpen && (
                <div className="absolute top-[65px] right-0 left-0 z-30 flex flex-col gap-4 border-b border-gray-200 bg-white p-4 shadow-lg md:hidden dark:border-gray-800 dark:bg-gray-900">
                    <div className="flex flex-wrap items-center gap-3">
                        <UserSelector />
                    </div>
                    <div className="flex items-center justify-between gap-3 border-t border-gray-100 pt-3 dark:border-gray-800">
                        <div className="flex items-center gap-3">
                            <ThemeToggleButton />
                            <NotificationDropdown />
                        </div>
                        <UserDropdown />
                    </div>
                </div>
            )}
        </header>
    );
};

export default AppHeader;
