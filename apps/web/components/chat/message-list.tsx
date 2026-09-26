import type { MessageResponse } from "@recipeai/shared";
import { RecipeMessageCard } from "./recipe-message-card";
import { ImageAnalysisCard } from "./image-analysis-card";

interface MessageListProps {
  messages: MessageResponse[];
  pendingPrompt: string | null;
  pendingImagePreview: string | null;
  regeneratingId: string | null;
  onRegenerate: (messageId: string) => void;
  onSave: (messageId: string) => void;
}

export function MessageList({
  messages,
  pendingPrompt,
  pendingImagePreview,
  regeneratingId,
  onRegenerate,
  onSave,
}: MessageListProps) {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-4">
      {messages.map((message) => {
        if (message.role === "USER") {
          return (
            <UserBubble
              key={message.id}
              content={message.content}
              imageUrl={message.userImageUrl}
            />
          );
        }
        if (message.responseType === "RECIPE" && message.recipeDraft) {
          return (
            <RecipeMessageCard
              key={message.id}
              message={message}
              isRegenerating={regeneratingId === message.id}
              onRegenerate={() => onRegenerate(message.id)}
              onSave={() => onSave(message.id)}
            />
          );
        }
        if (message.responseType === "IMAGE_ANALYSIS" && message.imageAnalysis) {
          return <ImageAnalysisCard key={message.id} analysis={message.imageAnalysis} />;
        }
        return <AssistantBubble key={message.id} content={message.content ?? ""} />;
      })}
      {(pendingPrompt || pendingImagePreview) && (
        <>
          <UserBubble content={pendingPrompt} imageUrl={pendingImagePreview} />
          <AssistantThinking />
        </>
      )}
    </div>
  );
}

function UserBubble({ content, imageUrl }: { content: string | null; imageUrl: string | null }) {
  return (
    <div className="ml-auto flex max-w-[80%] flex-col items-end gap-2">
      {imageUrl && (
        <img src={imageUrl} alt="Uploaded photo" className="h-48 w-48 rounded-2xl object-cover" />
      )}
      {content && (
        <div className="rounded-2xl bg-primary px-4 py-2 text-sm text-primary-foreground">
          {content}
        </div>
      )}
    </div>
  );
}

function AssistantBubble({ content }: { content: string }) {
  return <div className="max-w-[80%] rounded-2xl bg-muted px-4 py-2 text-sm">{content}</div>;
}

function AssistantThinking() {
  return (
    <div className="flex w-fit items-center gap-1 rounded-2xl bg-muted px-4 py-3">
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.3s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground [animation-delay:-0.15s]" />
      <span className="h-1.5 w-1.5 animate-bounce rounded-full bg-muted-foreground" />
    </div>
  );
}