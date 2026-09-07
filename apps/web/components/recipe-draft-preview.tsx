import type { RecipeDraft } from "@recipeai/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface RecipeDraftPreviewProps {
  draft: RecipeDraft;
}

export function RecipeDraftPreview({ draft }: RecipeDraftPreviewProps) {
  return (
    <div>
      <h2 className="mb-2 text-xl font-semibold">{draft.title}</h2>
      {draft.description && <p className="mb-4 text-muted-foreground">{draft.description}</p>}

      <div className="mb-4 flex gap-4 text-sm text-muted-foreground">
        {draft.servings && <span>{draft.servings} servings</span>}
        {draft.prepTimeMinutes && <span>{draft.prepTimeMinutes} min prep</span>}
        {draft.cookTimeMinutes && <span>{draft.cookTimeMinutes} min cook</span>}
      </div>

      <Card className="mb-4">
        <CardHeader>
          <CardTitle>Ingredients</CardTitle>
        </CardHeader>
        <CardContent>
          <ul className="list-disc space-y-1 pl-5">
            {draft.ingredients.map((ingredient, index) => (
              <li key={index}>
                {ingredient.quantity && `${ingredient.quantity} `}
                {ingredient.unit && `${ingredient.unit} `}
                {ingredient.name}
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Steps</CardTitle>
        </CardHeader>
        <CardContent>
          <ol className="list-decimal space-y-2 pl-5">
            {draft.steps.map((step, index) => (
              <li key={index}>{step.content}</li>
            ))}
          </ol>
        </CardContent>
      </Card>
    </div>
  );
}