import { prisma } from "../../lib/prisma.js";
import { NotFoundError } from "../../lib/errors.js";
import { MAX_ACTIVE_API_KEYS } from "../../lib/api-key.js";
import type { ApiKeyUsageQuery, DashboardResponse, UsageResponse, UsageSeriesPoint } from "@recipeai/shared";

const RANGE_DAYS: Record<ApiKeyUsageQuery["range"], number> = { "7d": 7, "30d": 30, "90d": 90 };

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

export async function getUsage(userId: string, query: ApiKeyUsageQuery): Promise<UsageResponse> {
  if (query.keyId) {
    const owned = await prisma.apiKey.findFirst({ where: { id: query.keyId, userId } });
    if (!owned) throw new NotFoundError("API key not found");
  }

  const keys = await prisma.apiKey.findMany({
    where: { userId, ...(query.keyId ? { id: query.keyId } : {}) },
    select: { id: true, name: true },
  });

  if (keys.length === 0) {
    return { series: buildEmptySeries(RANGE_DAYS[query.range]), rows: [] };
  }

  const keyNameById = new Map(keys.map((k) => [k.id, k.name]));
  const since = utcDaysAgo(RANGE_DAYS[query.range]);

  const records = await prisma.usageRecord.findMany({
    where: { apiKeyId: { in: keys.map((k) => k.id) }, createdAt: { gte: since } },
    select: { apiKeyId: true, statusCode: true, errorCode: true, createdAt: true },
  });

  const series = buildEmptySeries(RANGE_DAYS[query.range]);
  const seriesIndexByDate = new Map(series.map((point, i) => [point.date, i]));

  const rowsByBucket = new Map<string, UsageRowAccumulator>();

  for (const record of records) {
    const date = utcDayKey(record.createdAt);

    const seriesIndex = seriesIndexByDate.get(date);
    if (seriesIndex !== undefined) series[seriesIndex].requests += 1;

    const bucketKey = `${date}:${record.apiKeyId}`;
    let bucket = rowsByBucket.get(bucketKey);
    if (!bucket) {
      bucket = { date, apiKeyId: record.apiKeyId, requests: 0, rateLimited: 0, quotaExceeded: 0 };
      rowsByBucket.set(bucketKey, bucket);
    }
    bucket.requests += 1;
    if (record.errorCode === "RATE_LIMITED") bucket.rateLimited += 1;
    if (record.errorCode === "QUOTA_EXCEEDED") bucket.quotaExceeded += 1;
  }

  const rows = Array.from(rowsByBucket.values())
    .map((bucket) => ({ ...bucket, keyName: keyNameById.get(bucket.apiKeyId) ?? "Unknown key" }))
    .sort((a, b) => (a.date === b.date ? a.keyName.localeCompare(b.keyName) : b.date.localeCompare(a.date)));

  return { series, rows };
}

interface UsageRowAccumulator {
  date: string;
  apiKeyId: string;
  requests: number;
  rateLimited: number;
  quotaExceeded: number;
}

export async function getDashboard(userId: string): Promise<DashboardResponse> {
  const activeKeys = await prisma.apiKey.findMany({ where: { userId, revokedAt: null } });

  if (activeKeys.length === 0) {
    return {
      requestsThisMonth: 0,
      monthlyQuotaTotal: 0,
      activeKeyCount: 0,
      maxActiveKeys: MAX_ACTIVE_API_KEYS,
      rateLimitedLast30Days: 0,
      last7DaysSeries: buildEmptySeries(7),
    };
  }

  const activeKeyIds = activeKeys.map((k) => k.id);
  const monthlyQuotaTotal = activeKeys.reduce((sum, k) => sum + k.monthlyQuota, 0);

  const now = new Date();
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
  const thirtyDaysAgo = utcDaysAgo(30);
  const sevenDaysAgo = utcDaysAgo(7);

  const [requestsThisMonth, rateLimitedLast30Days, recentRecords] = await Promise.all([
    prisma.usageRecord.count({
      where: { apiKeyId: { in: activeKeyIds }, createdAt: { gte: monthStart } },
    }),
    prisma.usageRecord.count({
      where: { apiKeyId: { in: activeKeyIds }, createdAt: { gte: thirtyDaysAgo }, errorCode: "RATE_LIMITED" },
    }),
    prisma.usageRecord.findMany({
      where: { apiKeyId: { in: activeKeyIds }, createdAt: { gte: sevenDaysAgo } },
      select: { createdAt: true },
    }),
  ]);

  const last7DaysSeries = buildEmptySeries(7);
  const seriesIndexByDate = new Map(last7DaysSeries.map((point, i) => [point.date, i]));
  for (const record of recentRecords) {
    const index = seriesIndexByDate.get(utcDayKey(record.createdAt));
    if (index !== undefined) last7DaysSeries[index].requests += 1;
  }

  return {
    requestsThisMonth,
    monthlyQuotaTotal,
    activeKeyCount: activeKeys.length,
    maxActiveKeys: MAX_ACTIVE_API_KEYS,
    rateLimitedLast30Days,
    last7DaysSeries,
  };
}