import { profileById } from "@/lib/mock-data";
import type { DisplayChatMessage } from "@/lib/supabase/message-mapper";
import { Avatar } from "./avatar";

// Inert content only — entrance/exit motion belongs to the wrapping
// ChatFeedRows slot (see chat-feed-rows.tsx), not this row itself.
//
// Real messages carry their author denormalized (authorName/authorAvatarUrl
// — see message-mapper.ts); mock messages never set those fields, so this
// falls back to the old profileById lookup only then.
export function ChatMessageRow({ message }: { message: DisplayChatMessage }) {
  if (message.kind === "system") {
    return (
      <p className="flex h-full items-center justify-center truncate text-center font-mono text-[11px] text-muted">
        {message.body}
      </p>
    );
  }

  const displayName = message.authorName ?? (message.userId ? profileById(message.userId)?.displayName : undefined);
  if (!displayName) return null;

  return (
    <div className="flex h-full items-center gap-2.5">
      <Avatar name={displayName} size={26} imageUrl={message.authorAvatarUrl} />
      <p className="min-w-0 flex-1 truncate text-sm leading-snug text-foreground">
        <span className="font-medium">{displayName}</span>{" "}
        <span className="text-muted">{message.body}</span>
      </p>
    </div>
  );
}
