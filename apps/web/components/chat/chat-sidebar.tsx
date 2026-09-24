"use client";

import { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { HugeiconsIcon } from "@hugeicons/react";
import {
    PlusSignIcon,
    PinIcon,
    Delete02Icon,
    PencilEdit02Icon,
    MoreVerticalIcon,
    Book02Icon,
} from "@hugeicons/core-free-icons";
import type { ConversationSummary } from "@recipeai/shared";
import type { PublicUser } from "@/lib/api/auth";
import * as chatApi from "@/lib/api/chat";
import { logout } from "@/lib/api/auth";
import { useChatList } from "@/components/chat/chat-list-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
    Dialog,
    DialogContent,
    DialogFooter,
    DialogHeader,
    DialogTitle,
} from "@/components/ui/dialog";

interface ChatSidebarProps {
    user: PublicUser | null;
    onNavigate?: () => void;
}

export function ChatSidebar({ user, onNavigate }: ChatSidebarProps) {
    const router = useRouter();
    const params = useParams<{ id?: string }>();
    const activeId = params?.id;

    const { conversations, upsertConversation, removeConversation } = useChatList();
    const [editingId, setEditingId] = useState<string | null>(null);
    const [editValue, setEditValue] = useState("");
    const [deleteTarget, setDeleteTarget] = useState<ConversationSummary | null>(null);
    const [busy, setBusy] = useState(false);

    const pinned = conversations.filter((c) => c.pinned);
    const recent = conversations.filter((c) => !c.pinned);

    function handleNewChat() {
        router.push("/chat");
        onNavigate?.();
    }

    async function handleTogglePin(conversation: ConversationSummary) {
        const updated = await chatApi.updateConversation(conversation.id, {
            pinned: !conversation.pinned,
        });
        upsertConversation(updated);
    }

    function startEditing(conversation: ConversationSummary) {
        setEditingId(conversation.id);
        setEditValue(conversation.title ?? "");
    }

    function cancelEditing() {
        setEditingId(null);
        setEditValue("");
    }

    async function commitEditing() {
        if (!editingId) return;
        const trimmed = editValue.trim();
        const original = conversations.find((c) => c.id === editingId);

        if (!trimmed || trimmed === (original?.title ?? "")) {
            cancelEditing();
            return;
        }

        setBusy(true);
        try {
            const updated = await chatApi.updateConversation(editingId, { title: trimmed });
            upsertConversation(updated);
        } finally {
            setBusy(false);
            cancelEditing();
        }
    }

    async function confirmDelete() {
        if (!deleteTarget) return;

        setBusy(true);
        try {
            await chatApi.deleteConversation(deleteTarget.id);
            removeConversation(deleteTarget.id);
            if (activeId === deleteTarget.id) router.push("/chat");
            setDeleteTarget(null);
        } finally {
            setBusy(false);
        }
    }

    async function handleLogout() {
        await logout();
        router.push("/login");
    }

    return (
        <div className="flex h-full flex-col p-3">
            <div className="mb-4 flex items-center gap-2 px-1">
                <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary font-serif text-sm font-bold text-primary-foreground">
                    R
                </div>
                <span className="font-serif text-lg font-semibold">RecipeAI</span>
            </div>

            <Link
                href="/recipes"
                onClick={onNavigate}
                className="mb-3 flex items-center gap-2 rounded-md px-2 py-1.5 text-sm text-sidebar-foreground hover:bg-sidebar-accent"
            >
                <HugeiconsIcon icon={Book02Icon} size={18} />
                Recipes
            </Link>

            <Button onClick={handleNewChat} className="mb-4 justify-start gap-2">
                <HugeiconsIcon icon={PlusSignIcon} size={18} />
                New chat
            </Button>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto">
                {pinned.length > 0 && (
                    <ChatGroup
                        label="Pinned"
                        items={pinned}
                        activeId={activeId}
                        editingId={editingId}
                        editValue={editValue}
                        busy={busy}
                        onNavigate={onNavigate}
                        onTogglePin={handleTogglePin}
                        onStartEditing={startEditing}
                        onEditValueChange={setEditValue}
                        onCommitEditing={commitEditing}
                        onCancelEditing={cancelEditing}
                        onDelete={setDeleteTarget}
                    />
                )}
                {recent.length > 0 && (
                    <ChatGroup
                        label="Recent"
                        items={recent}
                        activeId={activeId}
                        editingId={editingId}
                        editValue={editValue}
                        busy={busy}
                        onNavigate={onNavigate}
                        onTogglePin={handleTogglePin}
                        onStartEditing={startEditing}
                        onEditValueChange={setEditValue}
                        onCommitEditing={commitEditing}
                        onCancelEditing={cancelEditing}
                        onDelete={setDeleteTarget}
                    />
                )}
                {conversations.length === 0 && (
                    <p className="px-2 text-sm text-muted-foreground">No chats yet.</p>
                )}
            </div>

            {user && (
                <div className="mt-3 border-t pt-3">
                    <div className="flex items-center justify-between px-1">
                        <span className="truncate text-sm text-muted-foreground">{user.email}</span>
                        <Button variant="ghost" size="sm" onClick={handleLogout}>
                            Log out
                        </Button>
                    </div>
                </div>
            )}

            <Dialog open={deleteTarget !== null} onOpenChange={(open) => !open && setDeleteTarget(null)}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Delete "{deleteTarget?.title ?? "Untitled chat"}"?</DialogTitle>
                    </DialogHeader>
                    <p className="text-sm text-muted-foreground">
                        This will permanently delete the chat and its messages.
                    </p>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setDeleteTarget(null)}>
                            Cancel
                        </Button>
                        <Button variant="destructive" onClick={confirmDelete} disabled={busy}>
                            Delete
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}

interface ChatGroupProps {
    label: string;
    items: ConversationSummary[];
    activeId?: string;
    editingId: string | null;
    editValue: string;
    busy: boolean;
    onNavigate?: () => void;
    onTogglePin: (conversation: ConversationSummary) => void;
    onStartEditing: (conversation: ConversationSummary) => void;
    onEditValueChange: (value: string) => void;
    onCommitEditing: () => void;
    onCancelEditing: () => void;
    onDelete: (conversation: ConversationSummary) => void;
}

function ChatGroup({
    label,
    items,
    activeId,
    editingId,
    editValue,
    busy,
    onNavigate,
    onTogglePin,
    onStartEditing,
    onEditValueChange,
    onCommitEditing,
    onCancelEditing,
    onDelete,
}: ChatGroupProps) {
    return (
        <div>
            <p className="mb-1 px-2 text-xs font-medium uppercase text-muted-foreground">{label}</p>
            <div className="space-y-0.5">
                {items.map((conversation) => {
                    const isEditing = editingId === conversation.id;

                    return (
                        <div
                            key={conversation.id}
                            className={`group flex items-center rounded-md px-2 py-1.5 text-sm hover:bg-sidebar-accent ${activeId === conversation.id ? "bg-sidebar-accent" : ""
                                }`}
                        >
                            {isEditing ? (
                                <Input
                                    value={editValue}
                                    onChange={(e) => onEditValueChange(e.target.value)}
                                    onBlur={onCommitEditing}
                                    onKeyDown={(e) => {
                                        if (e.key === "Enter") {
                                            e.preventDefault();
                                            onCommitEditing();
                                        } else if (e.key === "Escape") {
                                            e.preventDefault();
                                            onCancelEditing();
                                        }
                                    }}
                                    maxLength={100}
                                    autoFocus
                                    disabled={busy}
                                    className="h-6 flex-1 px-1 py-0 text-sm"
                                />
                            ) : (
                                <>
                                    <Link
                                        href={`/chat/${conversation.id}`}
                                        onClick={onNavigate}
                                        className="min-w-0 flex-1 truncate"
                                    >
                                        {conversation.title ?? "Untitled chat"}
                                    </Link>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger
                                            className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md opacity-0 hover:bg-accent group-hover:opacity-100 data-[state=open]:opacity-100 data-popup-open:opacity-100"
                                            aria-label="Chat options"
                                        >
                                            <HugeiconsIcon icon={MoreVerticalIcon} size={16} />
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem onClick={() => onTogglePin(conversation)}>
                                                <HugeiconsIcon icon={PinIcon} size={16} className="mr-2" />
                                                {conversation.pinned ? "Unpin" : "Pin"}
                                            </DropdownMenuItem>
                                            <DropdownMenuItem onClick={() => onStartEditing(conversation)}>
                                                <HugeiconsIcon icon={PencilEdit02Icon} size={16} className="mr-2" />
                                                Rename
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() => onDelete(conversation)}
                                                variant="destructive"
                                            >
                                                <HugeiconsIcon icon={Delete02Icon} size={16} className="mr-2" />
                                                Delete
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </>
                            )}
                        </div>
                    );
                })}
            </div>
        </div>
    );
}