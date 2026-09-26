import type { ImageAnalysisResponse } from "@recipeai/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function ImageAnalysisCard({ analysis }: { analysis: ImageAnalysisResponse }) {
  if (analysis.type === "not_food") {
    return (
      <Card className="w-full">
        <CardContent className="pt-6 text-sm text-muted-foreground">
          That doesn't look like food — looks more like {analysis.detectedSubject}. Try a photo of a dish.
        </CardContent>
      </Card>
    );
  }

  if (analysis.type === "unclear") {
    return (
      <Card className="w-full">
        <CardContent className="pt-6 text-sm text-muted-foreground">
          {analysis.reason} Try a clearer, well-lit photo.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>{analysis.foodName}</CardTitle>
        <p className="text-sm text-muted-foreground">{analysis.description}</p>
      </CardHeader>
      <CardContent>
        <div className="mb-4">
          <h3 className="mb-2 text-sm font-semibold">Likely ingredients</h3>
          <ul className="list-disc space-y-1 pl-5 text-sm">
            {analysis.likelyIngredients.map((ingredient, i) => (
              <li key={i}>{ingredient}</li>
            ))}
          </ul>
        </div>
        <div>
          <h3 className="mb-2 text-sm font-semibold">
            Estimated nutrition <span className="font-normal text-muted-foreground">(per serving)</span>
          </h3>
          <div className="flex gap-4 text-sm text-muted-foreground">
            <span>{analysis.nutrition.calories} cal</span>
            <span>{analysis.nutrition.proteinGrams}g protein</span>
            <span>{analysis.nutrition.carbsGrams}g carbs</span>
            <span>{analysis.nutrition.fatGrams}g fat</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}