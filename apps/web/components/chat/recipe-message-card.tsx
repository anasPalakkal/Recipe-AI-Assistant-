"use client";

import Link from "next/link";
import type { MessageResponse } from "@recipeai/shared";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button, buttonVariants } from "@/components/ui/button";
import { HugeiconsIcon } from "@hugeicons/react";
import { Copy01Icon, RefreshIcon, BookmarkAdd02Icon } from "@hugeicons/core-free-icons";

interface RecipeMessageCardProps {
    message: MessageResponse;
    isRegenerating: boolean;
    onRegenerate: () => void;
    onSave: () => void;
}

export function RecipeMessageCard({
    message,
    isRegenerating,
    onRegenerate,
    onSave,
}: RecipeMessageCardProps) {
    const draft = message.recipeDraft;
    if (!draft) return null;

    const recipe = draft;

    function handleCopy() {
        const text = [
            recipe.title,
            recipe.description ?? "",
            "",
            "Ingredients:",
            ...recipe.ingredients.map(
                (i) => `- ${[i.quantity, i.unit, i.name].filter(Boolean).join(" ")}`,
            ),
            "",
            "Steps:",
            ...recipe.steps.map((s, idx) => `${idx + 1}. ${s.content}`),
        ].join("\n");
        void navigator.clipboard.writeText(text);
    }

    return (
        <Card className={`w-full transition-opacity ${isRegenerating ? "opacity-60" : ""}`}>
            <CardHeader>
                <CardTitle>{recipe.title}</CardTitle>
                {recipe.description && (
                    <p className="text-sm text-muted-foreground">{recipe.description}</p>
                )}
            </CardHeader>
            <CardContent>
                {message.imageUrl && (
                    <img
                        src={message.imageUrl}
                        alt={recipe.title}
                        className="mb-4 h-48 w-full rounded-lg object-cover"
                    />
                )}

                <div className="mb-4 flex gap-4 text-sm text-muted-foreground">
                    {recipe.servings && <span>{recipe.servings} servings</span>}
                    {recipe.prepTimeMinutes && <span>{recipe.prepTimeMinutes} min prep</span>}
                    {recipe.cookTimeMinutes && <span>{recipe.cookTimeMinutes} min cook</span>}
                </div>

                <div className="mb-4">
                    <h3 className="mb-2 text-sm font-semibold">Ingredients</h3>
                    <ul className="list-disc space-y-1 pl-5 text-sm">
                        {recipe.ingredients.map((ingredient, index) => (
                            <li key={index}>
                                {ingredient.quantity && `${ingredient.quantity} `}
                                {ingredient.unit && `${ingredient.unit} `}
                                {ingredient.name}
                            </li>
                        ))}
                    </ul>
                </div>

                <div className="mb-4">
                    <h3 className="mb-2 text-sm font-semibold">Steps</h3>
                    <ol className="list-decimal space-y-2 pl-5 text-sm">
                        {recipe.steps.map((step, index) => (
                            <li key={index}>{step.content}</li>
                        ))}
                    </ol>
                </div>

                {message.imageAttributionName && (
                    <p className="mb-4 text-xs text-muted-foreground">
                        Photo by{" "}
                        {message.imageAttributionUrl ? (
                            <a href={message.imageAttributionUrl} target="_blank" rel="noreferrer" className="underline">
                                {message.imageAttributionName}
                            </a>
                        ) : (
                            message.imageAttributionName
                        )}
                    </p>
                )}

                <div className="flex flex-wrap gap-2">
                    <Button variant="outline" size="sm" onClick={handleCopy} className="gap-1.5">
                        <HugeiconsIcon icon={Copy01Icon} size={16} />
                        Copy
                    </Button>
                    <Button
                        variant="outline"
                        size="sm"
                        onClick={onRegenerate}
                        disabled={isRegenerating}
                        className="gap-1.5"
                    >
                        <HugeiconsIcon icon={RefreshIcon} size={16} className={isRegenerating ? "animate-spin" : ""} />
                        {isRegenerating ? "Regenerating..." : "Regenerate"}
                    </Button>
                    {message.savedRecipeId ? (
                        <Link
                            href={`/recipes/${message.savedRecipeId}`}
                            className={buttonVariants({ variant: "secondary", size: "sm" })}
                        >
                            View saved recipe
                        </Link>
                    ) : (
                        <Button size="sm" onClick={onSave} disabled={isRegenerating} className="gap-1.5">
                            <HugeiconsIcon icon={BookmarkAdd02Icon} size={16} />
                            Save recipe
                        </Button>
                    )}
                </div>
            </CardContent>
        </Card>
    );
}