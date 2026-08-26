import type { ChatMessage } from "@/lib/types";
import { profileById } from "@/lib/mock-data";
import { Avatar } from "./avatar";

// Inert content only — entrance/exit motion belongs to the wrapping
// ChatFeedRows slot (see chat-feed-rows.tsx), not this row itself.
export function ChatMessageRow({ message }: { message: ChatMessage }) {
  if (message.kind === "system") {
    return (
      <p className="flex h-full items-center justify-center truncate text-center font-mono text-[11px] text-muted">
        {message.body}
      </p>
    );
  }

  const author = message.userId ? profileById(message.userId) : undefined;
  if (!author) return null;

  return (
    <div className="flex h-full items-center gap-2.5">
      <Avatar name={author.displayName} size={26} />
      <p className="min-w-0 flex-1 truncate text-sm leading-snug text-foreground">
        <span className="font-medium">{author.displayName}</span>{" "}
        <span className="text-muted">{message.body}</span>
      </p>
    </div>
  );
}
