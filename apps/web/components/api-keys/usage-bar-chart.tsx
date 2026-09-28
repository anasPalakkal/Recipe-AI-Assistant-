interface UsageBarChartProps {
  series: { date: string; requests: number }[];
  labelFormat: "weekday" | "date";
  highlightLast?: boolean;
}

export function UsageBarChart({ series, labelFormat, highlightLast = true }: UsageBarChartProps) {
  const max = Math.max(1, ...series.map((p) => p.requests));

  return (
    <div className="flex items-end gap-2" style={{ height: 200 }}>
      {series.map((point, i) => {
        const heightPct = (point.requests / max) * 100;
        const isLast = highlightLast && i === series.length - 1;
        return (
          <div key={point.date} className="flex min-w-0 flex-1 flex-col items-center gap-2">
            <div className="flex h-full w-full items-end">
              <div
                className={`w-full rounded-t-md transition-all ${isLast ? "bg-primary" : "bg-primary/20"}`}
                style={{ height: `${Math.max(heightPct, 2)}%` }}
                title={`${point.requests} requests`}
              />
            </div>
            <span className="text-xs text-muted-foreground">{formatLabel(point.date, labelFormat)}</span>
          </div>
        );
      })}
    </div>
  );
}

function formatLabel(dateStr: string, format: "weekday" | "date"): string {
  const date = new Date(`${dateStr}T00:00:00Z`);
  return format === "weekday"
    ? date.toLocaleDateString("en-US", { weekday: "short", timeZone: "UTC" })
    : String(date.getUTCDate());
}