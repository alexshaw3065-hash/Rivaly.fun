import type { ChatMessage } from "@/lib/types";
import { profileById } from "@/lib/mock-data";
import { Avatar } from "./avatar";

export function ChatMessageRow({ message }: { message: ChatMessage }) {
  if (message.kind === "system") {
    return (
      <p className="enter-row py-1 text-center font-mono text-[11px] text-muted">
        {message.body}
      </p>
    );
  }

  const author = message.userId ? profileById(message.userId) : undefined;
  if (!author) return null;

  return (
    <div className="enter-row flex items-start gap-2.5 py-1.5">
      <Avatar name={author.displayName} size={26} />
      <p className="text-sm leading-snug text-foreground">
        <span className="font-medium">{author.displayName}</span>{" "}
        <span className="text-muted">{message.body}</span>
      </p>
    </div>
  );
}
