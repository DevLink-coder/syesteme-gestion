const months = [
    'Jan',
    'Feb',
    'Mar',
    'Apr',
    'May',
    'Jun',
    'Jul',
    'Aug',
    'Sep',
    'Oct',
    'Nov',
    'Dec',
];
const values = [168, 385, 201, 298, 187, 195, 291, 110, 215, 390, 280, 112];
const maxValue = Math.max(...values);

export default function BarChartOne() {
    return (
        <div className="custom-scrollbar max-w-full overflow-x-auto">
            <div
                className="relative grid h-56 min-w-[1000px] grid-cols-12 items-end gap-4 border-b border-gray-200 px-8 dark:border-gray-700"
                role="img"
                aria-label="Ventes par mois"
            >
                {[25, 50, 75].map((tick) => (
                    <div
                        key={tick}
                        className="pointer-events-none absolute right-0 left-0 border-t border-dashed border-gray-200 dark:border-gray-700"
                        style={{ bottom: `${tick}%` }}
                    />
                ))}
                {values.map((value, index) => (
                    <div
                        key={months[index]}
                        className="z-10 flex h-full flex-col items-center justify-end gap-2"
                    >
                        <div
                            className="bg-brand-500 w-10 rounded-t-md"
                            style={{ height: `${(value / maxValue) * 100}%` }}
                            title={`${months[index]}: ${value}`}
                        />
                        <span className="text-xs text-gray-500 dark:text-gray-400">
                            {months[index]}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}
