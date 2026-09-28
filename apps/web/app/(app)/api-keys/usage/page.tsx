import Link from "next/link";
import { serverFetch } from "@/lib/api-client";
import type { ApiKeySummary, UsageResponse, UsageRange } from "@recipeai/shared";
import { UsageBarChart } from "@/components/api-keys/usage-bar-chart";
import { cn } from "cn";

export const dynamic = "force-dynamic";

const RANGES: UsageRange[] = ["7d", "30d", "90d"];
const RANGE_LABELS: Record<UsageRange, string> = { "7d": "7 days", "30d": "30 days", "90d": "90 days" };

interface UsagePageProps {
  searchParams: Promise<{ range?: string; keyId?: string }>;
}

export default async function UsagePage({ searchParams }: UsagePageProps) {
  const params = await searchParams;
  const range: UsageRange = RANGES.includes(params.range as UsageRange) ? (params.range as UsageRange) : "7d";
  const keyId = params.keyId;

  const query = new URLSearchParams({ range });
  if (keyId) query.set("keyId", keyId);

  const [usage, keys] = await Promise.all([
    serverFetch<UsageResponse>(`/internal/api-keys/usage?${query.toString()}`),
    serverFetch<ApiKeySummary[]>("/internal/api-keys"),
  ]);
  const activeKeys = keys.filter((k) => !k.revokedAt);

  function filterHref(next: { range?: UsageRange; keyId?: string | null }): string {
    const p = new URLSearchParams();
    p.set("range", next.range ?? range);
    const nextKeyId = next.keyId === undefined ? keyId : next.keyId;
    if (nextKeyId) p.set("keyId", nextKeyId);
    return `/api-keys/usage?${p.toString()}`;
  }

  return (
    <div className="p-6 md:p-8">
      <h1 className="font-serif text-2xl font-semibold">Usage</h1>
      <p className="mt-1 text-sm text-muted-foreground">Detailed request history by key and date range</p>

      <div className="mt-5 flex flex-wrap gap-2">
        <FilterPill href={filterHref({ keyId: null })} active={!keyId} label="All keys" />
        {activeKeys.map((key) => (
          <FilterPill key={key.id} href={filterHref({ keyId: key.id })} active={keyId === key.id} label={key.name} />
        ))}
        <span className="mx-1 self-center text-muted-foreground">·</span>
        {RANGES.map((r) => (
          <FilterPill key={r} href={filterHref({ range: r })} active={range === r} label={RANGE_LABELS[r]} />
        ))}
      </div>

      <div className="mt-6 rounded-2xl border bg-card p-6">
        <h2 className="mb-4 font-serif text-lg font-medium">Requests per day</h2>
        <UsageBarChart series={usage.series} labelFormat={range === "7d" ? "weekday" : "date"} highlightLast={false} />
      </div>

      <div className="mt-6 overflow-x-auto rounded-2xl border bg-card">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b text-left text-muted-foreground">
              <th className="px-4 py-3 font-medium">Date</th>
              <th className="px-4 py-3 font-medium">Key</th>
              <th className="px-4 py-3 font-medium">Requests</th>
              <th className="px-4 py-3 font-medium">Rate limited</th>
              <th className="px-4 py-3 font-medium">Quota exceeded</th>
            </tr>
          </thead>
          <tbody>
            {usage.rows.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  No requests in this range.
                </td>
              </tr>
            ) : (
              usage.rows.map((row) => (
                <tr key={`${row.date}-${row.apiKeyId}`} className="border-b last:border-0">
                  <td className="px-4 py-3">
                    {new Date(`${row.date}T00:00:00Z`).toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" })}
                  </td>
                  <td className="px-4 py-3">{row.keyName}</td>
                  <td className="px-4 py-3">{row.requests}</td>
                  <td className="px-4 py-3">{row.rateLimited}</td>
                  <td className="px-4 py-3">{row.quotaExceeded}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FilterPill({ href, active, label }: { href: string; active: boolean; label: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "rounded-full border px-3 py-1.5 text-sm transition-colors",
        active ? "border-primary bg-primary/10 text-primary" : "text-muted-foreground hover:bg-accent",
      )}
    >
      {label}
    </Link>
  );
}