interface UsageBarChartProps {
    series: { date: string; requests: number }[];
    labelFormat: "weekday" | "date";
    highlightLast?: boolean;
}

const MAX_LABELS = 8;

export function UsageBarChart({ series, labelFormat, highlightLast = true }: UsageBarChartProps) {
    const max = Math.max(1, ...series.map((p) => p.requests));
    const labelStep = Math.ceil(series.length / MAX_LABELS);
    const gap = series.length > 14 ? "gap-0.5" : "gap-2";

    return (
        <div className={`flex ${gap}`} style={{ height: 220 }}>
            {series.map((point, i) => {
                const heightPct = (point.requests / max) * 100;
                const isLast = highlightLast && i === series.length - 1;
                const showLabel = (series.length - 1 - i) % labelStep === 0;

                return (
                    <div key={point.date} className="flex min-w-0 flex-1 flex-col gap-2">
                        <div className="flex min-h-0 flex-1 items-end">
                            <div
                                className={`w-full rounded-t-sm ${isLast ? "bg-primary" : "bg-primary/20"}`}
                                style={{ height: `${Math.max(heightPct, 2)}%` }}
                                title={`${formatLabel(point.date, "date")}: ${point.requests} ${point.requests === 1 ? "request" : "requests"
                                    }`}
                            />
                        </div>
                        <div className="flex h-4 justify-center">
                            {showLabel && (
                                <span className="whitespace-nowrap text-xs text-muted-foreground">
                                    {formatLabel(point.date, labelFormat)}
                                </span>
                            )}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function formatLabel(dateStr: string, format: "weekday" | "date"): string {
    const date = new Date(`${dateStr}T00:00:00Z`);
    return date.toLocaleDateString("en-US", {
        ...(format === "weekday" ? { weekday: "short" } : { month: "short", day: "numeric" }),
        timeZone: "UTC",
    });
}