import { serverFetch } from "@/lib/api-client";
import type { DashboardResponse } from "@recipeai/shared";
import { CreateKeyDialog } from "@/components/api-keys/create-key-dialog";
import { UsageBarChart } from "@/components/api-keys/usage-bar-chart";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
    const dashboard = await serverFetch<DashboardResponse>("/internal/api-keys/dashboard");

    return (
        <div className="p-6 md:p-8">
            <div className="mb-6 flex items-start justify-between gap-4">
                <div>
                    <h1 className="font-serif text-2xl font-semibold">Dashboard</h1>
                    <p className="mt-1 text-sm text-muted-foreground">
                        Monthly quota resets on {formatQuotaReset()} (UTC)
                    </p>
                </div>
                <CreateKeyDialog />
            </div>

            <div className="mb-6 grid gap-4 sm:grid-cols-3">
                <StatCard
                    label="Quota used"
                    value={dashboard.requestsThisMonth.toLocaleString()}
                    sub={dashboard.monthlyQuotaTotal > 0 ? `of ${dashboard.monthlyQuotaTotal.toLocaleString()} quota` : "no active keys"}
                    progress={
                        dashboard.monthlyQuotaTotal > 0
                            ? Math.min(dashboard.requestsThisMonth / dashboard.monthlyQuotaTotal, 1)
                            : undefined
                    }
                />
                <StatCard label="Active keys" value={String(dashboard.activeKeyCount)} sub={`of ${dashboard.maxActiveKeys} allowed`} />
                <StatCard label="Rate-limited requests" value={String(dashboard.rateLimitedLast30Days)} sub="last 30 days" />
            </div>

            <div className="rounded-2xl border bg-card p-6">
                <div className="mb-4 flex items-center justify-between">
                    <h2 className="font-serif text-lg font-medium">Requests, last 7 days</h2>
                    <span className="text-sm text-muted-foreground">All keys combined</span>
                </div>
                <UsageBarChart series={dashboard.last7DaysSeries} labelFormat="weekday" />
            </div>
        </div>
    );
}

function formatQuotaReset(): string {
    const now = new Date();
    const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 1));
    return next.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

function StatCard({ label, value, sub, progress }: { label: string; value: string; sub: string; progress?: number }) {
    return (
        <div className="rounded-2xl border bg-card p-5">
            <p className="text-sm text-muted-foreground">{label}</p>
            <p className="mt-2 font-serif text-3xl font-semibold">{value}</p>
            <p className="mt-1 text-sm text-muted-foreground">{sub}</p>
            {progress !== undefined && (
                <div className="mt-3 h-1.5 w-full overflow-hidden rounded-full bg-muted">
                    <div className="h-full rounded-full bg-primary" style={{ width: `${progress * 100}%` }} />
                </div>
            )}
        </div>
    );
}