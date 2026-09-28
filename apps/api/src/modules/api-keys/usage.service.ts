import { prisma } from "../../lib/prisma.js";
import { NotFoundError } from "../../lib/errors.js";
import { MAX_ACTIVE_API_KEYS } from "../../lib/api-key.js";
import { USAGE_ERROR_CODE } from "../../lib/usage-error-codes.js";
import type {
  ApiKeyUsageQuery,
  DashboardResponse,
  UsageResponse,
  UsageRow,
  UsageSeriesPoint,
} from "@recipeai/shared";

const RANGE_DAYS: Record<ApiKeyUsageQuery["range"], number> = { "7d": 7, "30d": 30, "90d": 90 };

type UsageRowAccumulator = Omit<UsageRow, "keyName">;

function utcDayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

function utcDaysAgo(days: number): Date {
  const now = new Date();
  const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  start.setUTCDate(start.getUTCDate() - (days - 1));
  return start;
}

// Every day in range gets a bucket, including zero-request days — a bar
// chart with gaps silently mislabels its x-axis otherwise.
function buildEmptySeries(days: number): UsageSeriesPoint[] {
  const series: UsageSeriesPoint[] = [];
  const start = utcDaysAgo(days);
  for (let i = 0; i < days; i++) {
    const d = new Date(start);
    d.setUTCDate(d.getUTCDate() + i);
    series.push({ date: utcDayKey(d), requests: 0 });
  }
  return series;
}

function countByDay(series: UsageSeriesPoint[], timestamps: Date[]): void {
  const pointByDate = new Map(series.map((point) => [point.date, point]));
  for (const timestamp of timestamps) {
    const point = pointByDate.get(utcDayKey(timestamp));
    if (point) point.requests += 1;
  }
}

export async function getUsage(userId: string, query: ApiKeyUsageQuery): Promise<UsageResponse> {
  const days = RANGE_DAYS[query.range];

  if (query.keyId) {
    const owned = await prisma.apiKey.findFirst({ where: { id: query.keyId, userId } });
    if (!owned) throw new NotFoundError("API key not found");
  }

  const keys = await prisma.apiKey.findMany({
    where: { userId, ...(query.keyId ? { id: query.keyId } : {}) },
    select: { id: true, name: true },
  });

  const series = buildEmptySeries(days);
  if (keys.length === 0) return { series, rows: [] };

  const keyNameById = new Map(keys.map((k) => [k.id, k.name]));

  const records = await prisma.usageRecord.findMany({
    where: { apiKeyId: { in: keys.map((k) => k.id) }, createdAt: { gte: utcDaysAgo(days) } },
    select: { apiKeyId: true, errorCode: true, createdAt: true },
  });

  countByDay(series, records.map((r) => r.createdAt));

  const rowsByBucket = new Map<string, UsageRowAccumulator>();
  for (const record of records) {
    const date = utcDayKey(record.createdAt);
    const bucketKey = `${date}:${record.apiKeyId}`;

    let bucket = rowsByBucket.get(bucketKey);
    if (!bucket) {
      bucket = { date, apiKeyId: record.apiKeyId, requests: 0, rateLimited: 0, quotaExceeded: 0 };
      rowsByBucket.set(bucketKey, bucket);
    }

    bucket.requests += 1;
    if (record.errorCode === USAGE_ERROR_CODE.RATE_LIMITED) bucket.rateLimited += 1;
    if (record.errorCode === USAGE_ERROR_CODE.QUOTA_EXCEEDED) bucket.quotaExceeded += 1;
  }

  const rows: UsageRow[] = Array.from(rowsByBucket.values())
    .map((bucket) => ({ ...bucket, keyName: keyNameById.get(bucket.apiKeyId) ?? "Unknown key" }))
    .sort((a, b) => (a.date === b.date ? a.keyName.localeCompare(b.keyName) : b.date.localeCompare(a.date)));

  return { series, rows };
}

export async function getDashboard(userId: string): Promise<DashboardResponse> {
  const activeKeys = await prisma.apiKey.findMany({ where: { userId, revokedAt: null } });
  const last7DaysSeries = buildEmptySeries(7);

  if (activeKeys.length === 0) {
    return {
      requestsThisMonth: 0,
      monthlyQuotaTotal: 0,
      activeKeyCount: 0,
      maxActiveKeys: MAX_ACTIVE_API_KEYS,
      rateLimitedLast30Days: 0,
      last7DaysSeries,
    };
  }

  const activeKeyIds = activeKeys.map((k) => k.id);
  const monthlyQuotaTotal = activeKeys.reduce((sum, k) => sum + k.monthlyQuota, 0);

  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));

  const [requestsThisMonth, rateLimitedLast30Days, recentRecords] = await Promise.all([
    // Rate-limited requests are rejected before the quota counter is
    // incremented, so they are excluded to keep this number comparable
    // to monthlyQuotaTotal. The OR is required: SQL "<>" never matches
    // NULL, so a bare `not` filter would drop every successful request.
    prisma.usageRecord.count({
      where: {
        apiKeyId: { in: activeKeyIds },
        createdAt: { gte: monthStart },
        OR: [{ errorCode: null }, { errorCode: { not: USAGE_ERROR_CODE.RATE_LIMITED } }],
      },
    }),
    prisma.usageRecord.count({
      where: {
        apiKeyId: { in: activeKeyIds },
        createdAt: { gte: utcDaysAgo(30) },
        errorCode: USAGE_ERROR_CODE.RATE_LIMITED,
      },
    }),
    prisma.usageRecord.findMany({
      where: { apiKeyId: { in: activeKeyIds }, createdAt: { gte: utcDaysAgo(7) } },
      select: { createdAt: true },
    }),
  ]);

  countByDay(last7DaysSeries, recentRecords.map((r) => r.createdAt));

  return {
    requestsThisMonth,
    monthlyQuotaTotal,
    activeKeyCount: activeKeys.length,
    maxActiveKeys: MAX_ACTIVE_API_KEYS,
    rateLimitedLast30Days,
    last7DaysSeries,
  };
}