import { useSidebar } from '../context/SidebarContext';

const Backdrop: React.FC = () => {
    const { isMobileOpen, toggleMobileSidebar } = useSidebar();

    if (!isMobileOpen) return null;

    return (
        <div
            className="fixed inset-x-0 top-16 bottom-0 z-30 bg-gray-900/30 backdrop-blur-sm lg:hidden"
            onClick={toggleMobileSidebar}
        />
    );
};

export default Backdrop;
