export type PeriodKey = 'monthly' | 'quarterly' | 'annually';

interface ChartTabProps {
    value: PeriodKey;
    onChange: (v: PeriodKey) => void;
}

const ChartTab: React.FC<ChartTabProps> = ({ value, onChange }) => {
    const getButtonClass = (option: PeriodKey) =>
        value === option
            ? 'shadow-theme-xs text-gray-900 dark:text-white bg-white dark:bg-gray-800'
            : 'text-gray-500 dark:text-gray-400';

    return (
        <div className="flex items-center gap-0.5 rounded-lg bg-gray-100 p-0.5 dark:bg-gray-900">
            <button
                onClick={() => onChange('monthly')}
                className={`text-theme-sm w-full rounded-md px-3 py-2 font-medium hover:text-gray-900 dark:hover:text-white ${getButtonClass(
                    'monthly',
                )}`}
            >
                Mensuel
            </button>

            <button
                onClick={() => onChange('quarterly')}
                className={`text-theme-sm w-full rounded-md px-3 py-2 font-medium hover:text-gray-900 dark:hover:text-white ${getButtonClass(
                    'quarterly',
                )}`}
            >
                Trimestriel
            </button>

            <button
                onClick={() => onChange('annually')}
                className={`text-theme-sm w-full rounded-md px-3 py-2 font-medium hover:text-gray-900 dark:hover:text-white ${getButtonClass(
                    'annually',
                )}`}
            >
                Annuel
            </button>
        </div>
    );
};

export default ChartTab;
