import { serverFetch } from "@/lib/api-client";
import type { ApiKeySummary } from "@recipeai/shared";
import { CreateKeyDialog } from "@/components/api-keys/create-key-dialog";
import { ApiKeyCard } from "@/components/api-keys/api-key-card";

export const dynamic = "force-dynamic";

export default async function ApiKeysPage() {
  const keys = await serverFetch<ApiKeySummary[]>("/internal/api-keys");
  const activeKeys = keys.filter((k) => !k.revokedAt);

  return (
    <div className="p-6 md:p-8">
      <div className="mb-6 flex items-start justify-between gap-4">
        <div>
          <h1 className="font-serif text-2xl font-semibold">API keys</h1>
          <p className="mt-1 text-sm text-muted-foreground">Authenticate requests to the RecipeAI API. Keep your keys secret</p>
        </div>
        <CreateKeyDialog />
      </div>

      {activeKeys.length === 0 ? (
        <p className="rounded-2xl border border-dashed p-8 text-center text-sm text-muted-foreground">
          No active API keys yet. Create one to start using the RecipeAI API.
        </p>
      ) : (
        <div className="space-y-3">
          {activeKeys.map((key) => (
            <ApiKeyCard key={key.id} apiKey={key} />
          ))}
        </div>
      )}
    </div>
  );
}