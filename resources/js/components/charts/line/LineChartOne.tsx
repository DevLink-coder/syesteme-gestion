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
const series = [
    {
        name: 'Sales',
        color: '#465fff',
        values: [180, 190, 170, 160, 175, 165, 170, 205, 230, 210, 240, 235],
    },
    {
        name: 'Revenue',
        color: '#9CB9FF',
        values: [40, 30, 50, 40, 55, 40, 70, 100, 110, 120, 150, 140],
    },
];

export default function LineChartOne() {
    const coords = (values: number[]) =>
        values
            .map((value, index) => {
                const x = 45 + index * 82;
                const y = 245 - (value / 260) * 210;
                return `${x},${y}`;
            })
            .join(' ');

    return (
        <div className="custom-scrollbar max-w-full overflow-x-auto">
            <svg
                viewBox="0 0 1050 290"
                className="min-w-[1000px]"
                role="img"
                aria-label="Ventes et revenus par mois"
            >
                {[0, 1, 2, 3, 4].map((line) => (
                    <line
                        key={line}
                        x1="35"
                        x2="1020"
                        y1={35 + line * 52}
                        y2={35 + line * 52}
                        className="stroke-gray-200 dark:stroke-gray-700"
                        strokeDasharray="4 5"
                    />
                ))}
                {series.map((item) => (
                    <g key={item.name}>
                        <polyline
                            points={coords(item.values)}
                            fill="none"
                            stroke={item.color}
                            strokeWidth="3"
                            strokeLinejoin="round"
                            strokeLinecap="round"
                        />
                        {item.values.map((value, index) => (
                            <circle
                                key={`${item.name}-${index}`}
                                cx={45 + index * 82}
                                cy={245 - (value / 260) * 210}
                                r="4"
                                fill={item.color}
                            >
                                <title>{`${item.name} ${months[index]}: ${value}`}</title>
                            </circle>
                        ))}
                    </g>
                ))}
                {months.map((month, index) => (
                    <text
                        key={month}
                        x={45 + index * 82}
                        y="278"
                        textAnchor="middle"
                        className="fill-gray-500 text-[12px]"
                    >
                        {month}
                    </text>
                ))}
            </svg>
        </div>
    );
}
