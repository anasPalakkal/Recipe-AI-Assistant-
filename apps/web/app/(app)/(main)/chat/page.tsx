import { ChatView } from "@/components/chat/chat-view";

export const dynamic = "force-dynamic";

export default function ChatIndexPage() {
  return <ChatView conversationId={null} initialMessages={[]} />;
}