"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { Drawer } from "vaul";
import { useCurrentUser } from "@/components/current-user-provider";
import { GifPicker } from "@/components/gif-picker";
import { TeamCrest } from "@/components/team-crest";
import { prepareChatPhoto, uploadChatPhoto } from "@/lib/cloudinary";
import { klipyCustomerId, klipyShared, type KlipyGif } from "@/lib/klipy";
import { useRealMatches } from "@/lib/use-real-matches";
import type { ChatAttachment } from "@/lib/supabase/message-mapper";
import { fetchCallableRooms, fetchQuotableRooms } from "@/lib/arena/data";
import { momentHeadline, type PostItem } from "@/lib/arena/model";
import type { ComposerPreset, ComposerRoom } from "@/lib/arena/composer-store";
import type { NewPost } from "@/lib/arena/data";

const MAX = 500;
const tidy = (t: string) => t.replace(/\n{3,}/g, "\n\n").trim();

type AttachedRoom = ComposerRoom;
export type RoomsLoader = (userId: string | null, matchId: string | null) => Promise<{ mine: AttachedRoom[]; others: AttachedRoom[] }>;

// Your stakes (possible calls) and open public rooms (possible quotes).
const loadRoomsFromDb: RoomsLoader = async (userId, matchId) => {
  const [mine, open] = await Promise.all([userId ? fetchCallableRooms(userId) : Promise.resolve([]), fetchQuotableRooms(matchId)]);
  const backed = new Set(mine.map((r) => r.id));
  return { mine, others: open.filter((r) => !backed.has(r.id)).map((r) => ({ id: r.id, prediction: r.prediction, side: null, matchId: r.matchId })) };
};

/**
 * Posting a take: text, a photo or GIF, and what it's about — a match, a
 * call on a room you've backed, a quote of any open room, or the moment it
 * answers. It opens already filled in with what the page is about, and
 * suggests the rest as one-tap chips; the full lists sit behind "More".
 */
export function ArenaComposer({
  open,
  onOpenChange,
  preset,
  onPost,
  loadRooms = loadRoomsFromDb,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  preset: ComposerPreset;
  onPost: (post: NewPost, optimistic: PostItem) => void;
  loadRooms?: RoomsLoader;
}) {
  const moment = preset.moment ?? null;
  const me = useCurrentUser();
  const { matches } = useRealMatches();
  const [body, setBody] = useState(preset.body ?? "");
  const [attachment, setAttachment] = useState<ChatAttachment | null>(preset.attachment ?? null);
  const [gifQuery, setGifQuery] = useState<{ slug: string; q: string } | null>(null);
  const [progress, setProgress] = useState<number | null>(null);
  const [matchId, setMatchId] = useState<string | null>(preset.room ? null : (preset.matchId ?? null));
  const [call, setCall] = useState<AttachedRoom | null>(preset.room ?? null);
  const [more, setMore] = useState(false);
  const [panel, setPanel] = useState<"gif" | "match" | "call" | null>(null);
  const [rooms, setRooms] = useState<{ mine: AttachedRoom[]; others: AttachedRoom[] } | null>(null);
  const [error, setError] = useState<string | null>(preset.error ?? null);
  const [now] = useState(() => Date.now());
  const fileRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    // Loaded on open: they feed both the suggestion chips and the Room list.
    if (!open || rooms) return;
    void loadRooms(me?.id ?? null, moment?.match.id ?? preset.matchId ?? null).then(setRooms);
  }, [open, me, rooms, moment, preset.matchId, loadRooms]);

  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    el.style.height = "auto";
    el.style.height = `${Math.min(el.scrollHeight, 220)}px`;
  }, [body, open]);

  const tagged = matches.find((m) => m.id === matchId) ?? null;
  // One-tap suggestions: the match this is about (or the live one), your
  // stakes on it (calls), and its busiest open room (a quote).
  const focusMatch = preset.matchId ?? matches.find((m) => m.status === "live")?.id ?? null;
  const focusMatchRow = matches.find((m) => m.id === focusMatch) ?? null;
  const byFocus = (list: AttachedRoom[]) => [...list.filter((r) => r.matchId === focusMatch), ...list.filter((r) => r.matchId !== focusMatch)];
  const suggestions = !moment && !call
    ? {
        match: focusMatchRow && matchId !== focusMatchRow.id ? focusMatchRow : null,
        calls: byFocus(rooms?.mine ?? []).slice(0, 2),
        quote: byFocus(rooms?.others ?? [])[0] ?? null,
      }
    : null;
  const hasSuggestions = !!suggestions && (!!suggestions.match || suggestions.calls.length > 0 || !!suggestions.quote);
  const pickable = matches.filter((m) => m.status === "live" || (m.status === "scheduled" && +new Date(m.kickoffAt) - now < 3 * 86_400_000)).slice(0, 30);
  const uploading = progress !== null && progress < 1;
  const canPost = !!me && !uploading && (tidy(body).length > 0 || !!attachment);

  async function pickPhoto(file: File) {
    if (!me) return;
    setError(null);
    try {
      const photo = await prepareChatPhoto(file);
      setGifQuery(null);
      setAttachment({ type: "image", ref: "", w: photo.w, h: photo.h, lqip: photo.lqip, local: photo.previewUrl, progress: 0 });
      setProgress(0);
      const ref = await uploadChatPhoto(photo.blob, `arena/${me.id}/${crypto.randomUUID()}`, (p) => {
        setProgress(p);
        setAttachment((a) => (a ? { ...a, progress: p } : a));
      });
      setAttachment({ type: "image", ref, w: photo.w, h: photo.h, lqip: photo.lqip, local: photo.previewUrl, progress: 1 });
      setProgress(1);
    } catch (e) {
      setAttachment(null);
      setProgress(null);
      setError(e instanceof Error ? e.message : "Couldn't add that photo.");
    }
  }

  function pickGif(gif: KlipyGif, q: string) {
    setAttachment({ type: "gif", ref: gif.slug, url: gif.video.url, w: gif.video.w, h: gif.video.h, lqip: gif.lqip });
    setGifQuery({ slug: gif.slug, q });
    setProgress(null);
    setPanel(null);
  }

  function submit() {
    if (!me || !canPost) return;
    const stored: ChatAttachment | null = attachment ? { type: attachment.type, ref: attachment.ref, w: attachment.w, h: attachment.h, lqip: attachment.lqip, url: attachment.url } : null;
    const post: NewPost = {
      id: crypto.randomUUID(),
      body: tidy(body).slice(0, MAX),
      attachment: stored,
      matchId: call ? null : moment ? moment.match.id : matchId,
      roomId: call?.id ?? null,
      side: call?.side ?? null,
      momentId: moment?.id ?? null,
      parentId: null,
    };
    const match = moment?.match ?? (tagged ? { id: tagged.id, home: tagged.homeTeam, away: tagged.awayTeam, competition: tagged.competition, sportId: tagged.sportId ?? null, status: tagged.status, homeScore: tagged.homeScore, awayScore: tagged.awayScore, kickoffAt: tagged.kickoffAt } : null);
    const optimistic: PostItem = {
      kind: "post",
      id: post.id,
      at: new Date().toISOString(),
      author: { id: me.id, username: me.username, name: me.displayName, avatar: me.avatarUrl },
      body: post.body,
      attachment: attachment ? { ...attachment } : null,
      side: post.side,
      match: call ? null : match,
      room: call ? { id: call.id, prediction: call.prediction, status: "open", pool: 0, yes: 0, no: 0, participants: 0, outcome: null, matchId: call.matchId, settledAt: null } : null,
      momentId: post.momentId,
      replies: 0,
      reactions: {},
      mine: [],
    };
    if (gifQuery) void klipyCustomerId(me.id).then((id) => klipyShared(gifQuery.slug, id, gifQuery.q));
    onPost(post, optimistic);
    onOpenChange(false);
  }

  const answering = moment ? momentHeadline(moment) : null;

  return (
    <Drawer.Root open={open} onOpenChange={onOpenChange} repositionInputs={false}>
      <Drawer.Portal>
        <Drawer.Overlay className="fixed inset-0 z-50 bg-black/60" />
        <Drawer.Content className="fixed inset-x-0 bottom-0 z-50 mx-auto flex max-h-[92dvh] max-w-xl flex-col rounded-t-3xl bg-surface outline-none ring-1 ring-border">
          <Drawer.Handle className="!mx-auto !mt-2.5 !mb-1 !h-1.5 !w-10 !rounded-full !bg-border-strong" />
          <Drawer.Title className="sr-only">Post a take</Drawer.Title>
          <div className="flex items-center justify-between px-4 pb-2 pt-1">
            <button type="button" onClick={() => onOpenChange(false)} className="text-[15px] text-muted">
              Cancel
            </button>
            <button
              type="button"
              onClick={submit}
              disabled={!canPost}
              className="rounded-full px-5 py-2 text-[15px] font-bold text-white transition-opacity disabled:opacity-40"
              style={{ background: "var(--rival-blue)" }}
            >
              {uploading ? "Uploading…" : "Post"}
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto px-4 pb-3">
            {answering && moment && (
              <div className="mb-2 flex items-center gap-2 rounded-xl px-3 py-2 text-[13px] ring-1 ring-border">
                <span className="font-bold uppercase text-foreground">{answering.title}</span>
                <span className="truncate text-muted">
                  {moment.match.home} {moment.payload.home ?? ""}–{moment.payload.away ?? ""} {moment.match.away}
                </span>
              </div>
            )}
            <textarea
              ref={boxRef}
              value={body}
              onChange={(e) => setBody(e.target.value)}
              maxLength={MAX}
              rows={3}
              autoFocus
              placeholder={call?.side ? `Why ${call.side.toUpperCase()}? Say it now, get the receipt later.` : call ? "Who's taking this on?" : moment ? "Your take on this…" : "What's your call?"}
              className="w-full resize-none bg-transparent text-[17px] leading-snug text-foreground placeholder:text-muted focus:outline-none"
            />
            {body.length > MAX - 60 && <p className="text-right font-mono text-[11px] text-muted">{MAX - body.length} left</p>}
            {attachment && (
              <div className="relative mt-2 inline-block">
                {attachment.type === "gif" ? (
                  <video src={attachment.url} autoPlay muted loop playsInline className="max-h-56 rounded-xl" />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={attachment.local ?? attachment.lqip} alt="" className="max-h-56 rounded-xl" />
                )}
                {uploading && (
                  <span className="absolute inset-x-2 bottom-2 h-1 overflow-hidden rounded-full bg-black/40">
                    <span className="block h-full bg-white transition-[width]" style={{ width: `${Math.round((progress ?? 0) * 100)}%` }} />
                  </span>
                )}
                <button
                  type="button"
                  onClick={() => {
                    setAttachment(null);
                    setProgress(null);
                    setGifQuery(null);
                  }}
                  aria-label="Remove"
                  className="absolute right-1.5 top-1.5 flex h-7 w-7 items-center justify-center rounded-full bg-black/70 text-white"
                >
                  ×
                </button>
              </div>
            )}
            {(call || tagged) && (
              <div className="mt-2 flex flex-wrap gap-2">
                {call && (
                  <Chip onClear={() => setCall(null)}>
                    <span className="font-bold uppercase" style={{ color: call.side === "yes" ? "var(--rival-blue)" : call.side === "no" ? "var(--rival-red)" : "var(--muted)" }}>
                      {call.side ?? "Room"}
                    </span>{" "}
                    {call.prediction}
                  </Chip>
                )}
                {tagged && !call && (
                  <Chip onClear={() => setMatchId(null)}>
                    <TeamCrest name={tagged.homeTeam} size={14} /> {tagged.homeTeam} v {tagged.awayTeam}
                  </Chip>
                )}
              </div>
            )}
            {error && <p className="mt-2 text-[13px] font-semibold text-rival-red">{error}</p>}
            {hasSuggestions && suggestions && (
              <div className="mt-3">
                <p className="text-[11px] font-bold uppercase tracking-wider text-muted">About</p>
                <div className="no-scrollbar -mx-4 mt-1.5 flex gap-2 overflow-x-auto px-4 pb-1">
                  {suggestions.match && (
                    <Suggestion onClick={() => setMatchId(suggestions.match!.id)}>
                      <TeamCrest name={suggestions.match.homeTeam} size={14} />
                      {suggestions.match.homeTeam} v {suggestions.match.awayTeam}
                    </Suggestion>
                  )}
                  {suggestions.calls.map((r) => (
                    <Suggestion key={r.id} onClick={() => setCall(r)}>
                      <span className="font-bold uppercase" style={{ color: r.side === "yes" ? "var(--rival-blue)" : "var(--rival-red)" }}>
                        Call {r.side}
                      </span>
                      <span className="max-w-[12rem] truncate">{r.prediction}</span>
                    </Suggestion>
                  ))}
                  {suggestions.quote && (
                    <Suggestion onClick={() => setCall(suggestions.quote)}>
                      <span className="font-bold uppercase text-muted">Quote</span>
                      <span className="max-w-[12rem] truncate">{suggestions.quote.prediction}</span>
                    </Suggestion>
                  )}
                </div>
              </div>
            )}

            {panel === "gif" && (
              <div className="mt-3">
                <GifPicker userId={me?.id} onPick={pickGif} />
              </div>
            )}
            {panel === "match" && (
              <div className="mt-3 flex max-h-60 flex-col overflow-y-auto rounded-xl ring-1 ring-border">
                {pickable.length === 0 && <p className="p-4 text-sm text-muted">No matches in the next few days.</p>}
                {pickable.map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => {
                      setMatchId(m.id);
                      setPanel(null);
                    }}
                    className="flex items-center gap-2 border-b border-border px-3 py-2.5 text-left text-[14px] last:border-0 hover:bg-foreground/5"
                  >
                    <TeamCrest name={m.homeTeam} size={18} />
                    <span className="min-w-0 flex-1 truncate text-foreground">
                      {m.homeTeam} v {m.awayTeam}
                    </span>
                    <span className="shrink-0 font-mono text-[11px] text-muted">
                      {m.status === "live" ? "LIVE" : new Date(m.kickoffAt).toLocaleString("en-GB", { weekday: "short", hour: "2-digit", minute: "2-digit" })}
                    </span>
                  </button>
                ))}
              </div>
            )}
            {panel === "call" && (
              <div className="mt-3 max-h-72 overflow-y-auto rounded-xl ring-1 ring-border">
                {rooms === null ? (
                  <p className="p-4 text-sm text-muted">Loading rooms…</p>
                ) : (
                  <>
                    <RoomGroup
                      title="Your calls"
                      hint={rooms.mine.length === 0 ? "Back a room and you can call it here — it comes back as a receipt when it settles." : "Backed with your stake — comes back as a receipt."}
                      rooms={rooms.mine}
                      onPick={(r) => {
                        setCall(r);
                        setPanel(null);
                      }}
                    />
                    <RoomGroup
                      title="Quote a room"
                      hint={rooms.others.length === 0 ? "No open public rooms right now." : "Share any open room — people join from your post."}
                      rooms={rooms.others}
                      onPick={(r) => {
                        setCall(r);
                        setPanel(null);
                      }}
                    />
                  </>
                )}
              </div>
            )}
          </div>
          <div className="flex items-center gap-1 border-t border-border px-2 py-2 pb-[max(env(safe-area-inset-bottom),8px)]">
            <Tool label="Photo" onClick={() => fileRef.current?.click()}>
              <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden>
                <rect x="2.5" y="4" width="15" height="12" rx="2.5" stroke="currentColor" strokeWidth="1.6" fill="none" />
                <circle cx="7.3" cy="8.3" r="1.4" fill="currentColor" />
                <path d="m3.5 14.5 4-4 3 3 2.2-2.2 3.8 3.7" stroke="currentColor" strokeWidth="1.6" fill="none" strokeLinejoin="round" strokeLinecap="round" />
              </svg>
            </Tool>
            <Tool label="GIF" active={panel === "gif"} onClick={() => setPanel((p) => (p === "gif" ? null : "gif"))}>
              <span className="rounded border-[1.6px] border-current px-1 text-[10px] font-black leading-[14px]">GIF</span>
            </Tool>
            {!moment && !more && (
              <button type="button" onClick={() => setMore(true)} className="ml-auto h-10 rounded-full px-3 text-[13px] font-semibold text-muted hover:text-foreground">
                More…
              </button>
            )}
            {!moment && more && (
              <Tool label="Tag a match" active={panel === "match"} onClick={() => setPanel((p) => (p === "match" ? null : "match"))}>
                <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden>
                  <circle cx="10" cy="10" r="7.5" stroke="currentColor" strokeWidth="1.6" fill="none" />
                  <path d="m10 6 3 2.2-1.1 3.5H8.1L7 8.2 10 6Z" fill="currentColor" />
                </svg>
              </Tool>
            )}
            {!moment && more && (
              <Tool label="Attach a room" active={panel === "call"} onClick={() => setPanel((p) => (p === "call" ? null : "call"))}>
                <span className="text-[13px] font-bold">Room</span>
              </Tool>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={(e) => {
                const f = e.target.files?.[0];
                e.target.value = "";
                if (f) void pickPhoto(f);
              }}
            />
          </div>
        </Drawer.Content>
      </Drawer.Portal>
    </Drawer.Root>
  );
}

function Tool({ label, active, onClick, children }: { label: string; active?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-pressed={active}
      className="flex h-10 min-w-10 items-center justify-center rounded-full px-2 transition-colors"
      style={{ color: active ? "var(--rival-blue)" : "var(--muted)", background: active ? "color-mix(in srgb, var(--rival-blue) 12%, transparent)" : "transparent" }}
    >
      {children}
    </button>
  );
}

function Chip({ children, onClear }: { children: React.ReactNode; onClear: () => void }) {
  return (
    <span className="inline-flex max-w-full items-center gap-1.5 rounded-full py-1 pl-2.5 pr-1 text-[13px] text-foreground ring-1 ring-border">
      <span className="flex min-w-0 items-center gap-1 truncate">{children}</span>
      <button type="button" onClick={onClear} aria-label="Remove" className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full text-muted hover:bg-foreground/10">
        ×
      </button>
    </span>
  );
}

function RoomGroup({ title, hint, rooms, onPick }: { title: string; hint: string; rooms: AttachedRoom[]; onPick: (r: AttachedRoom) => void }) {
  return (
    <div className="border-b border-border last:border-0">
      <p className="px-3 pt-3 text-[11px] font-bold uppercase tracking-wider text-muted">{title}</p>
      <p className="px-3 pb-2 text-[12px] text-muted">{hint}</p>
      {rooms.map((r) => (
        <button
          key={r.id}
          type="button"
          onClick={() => onPick(r)}
          className="flex w-full items-center gap-2 border-t border-border px-3 py-2.5 text-left text-[14px] hover:bg-foreground/5"
        >
          {r.side && (
            <span className="shrink-0 font-bold uppercase" style={{ color: r.side === "yes" ? "var(--rival-blue)" : "var(--rival-red)" }}>
              {r.side}
            </span>
          )}
          <span className="min-w-0 truncate text-foreground">{r.prediction}</span>
        </button>
      ))}
    </div>
  );
}

function Suggestion({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-8 shrink-0 items-center gap-1.5 rounded-full px-3 text-[13px] text-foreground ring-1 ring-border transition-colors hover:ring-border-strong active:scale-95"
    >
      {children}
    </button>
  );
}
