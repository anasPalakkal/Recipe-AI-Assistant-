import type {
  ApiKeySummary,
  CreatedApiKeyResponse,
  CreateApiKeyInput,
  DashboardResponse,
  UsageResponse,
  UsageRange,
} from "@recipeai/shared";
import { apiGet, apiPost, apiDelete } from "./request";

export function listApiKeys(): Promise<ApiKeySummary[]> {
  return apiGet<ApiKeySummary[]>("/api/api-keys");
}

export function createApiKey(input: CreateApiKeyInput): Promise<CreatedApiKeyResponse> {
  return apiPost<CreatedApiKeyResponse>("/api/api-keys", input);
}

export function revokeApiKey(id: string): Promise<void> {
  return apiDelete<void>(`/api/api-keys/${id}`);
}

export function getDashboard(): Promise<DashboardResponse> {
  return apiGet<DashboardResponse>("/api/api-keys/dashboard");
}

export function getUsage(range: UsageRange, keyId?: string): Promise<UsageResponse> {
  const params = new URLSearchParams({ range });
  if (keyId) params.set("keyId", keyId);
  return apiGet<UsageResponse>(`/api/api-keys/usage?${params.toString()}`);
}