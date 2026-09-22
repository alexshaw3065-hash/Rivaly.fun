// Minimal Server-Sent Events reader over fetch.
//
// Hand-rolled rather than using the `eventsource` package for two reasons:
// no dependency, and full control over stall detection. TxLINE sends
// heartbeats while idle, so "no bytes at all for N seconds" is a reliable
// signal that a connection has died silently — which the EventSource spec
// gives no hook for.

export interface SseMessage {
  id?: string;
  event?: string;
  data: string;
}

export interface SseOptions {
  url: string;
  headers: Record<string, string>;
  /** Abort and let the caller reconnect if nothing arrives for this long. */
  stallTimeoutMs: number;
  onMessage: (msg: SseMessage) => void | Promise<void>;
  /** Called on every byte received, heartbeat or not. */
  onActivity?: () => void;
  signal?: AbortSignal;
}

/**
 * Consume one SSE connection until it ends, stalls, or is aborted.
 * Returns the reason it stopped so the caller can decide how to back off.
 */
export async function consumeSse(opts: SseOptions): Promise<"closed" | "stalled" | "aborted"> {
  const controller = new AbortController();
  const onOuterAbort = () => controller.abort();
  opts.signal?.addEventListener("abort", onOuterAbort, { once: true });

  let stalled = false;
  let stallTimer: NodeJS.Timeout | undefined;
  const armStall = () => {
    if (stallTimer) clearTimeout(stallTimer);
    stallTimer = setTimeout(() => {
      stalled = true;
      controller.abort();
    }, opts.stallTimeoutMs);
  };

  try {
    const res = await fetch(opts.url, {
      headers: { ...opts.headers, Accept: "text/event-stream", "Cache-Control": "no-cache" },
      signal: controller.signal,
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new SseHttpError(res.status, body.slice(0, 200));
    }
    if (!res.body) throw new Error("stream response had no body");

    armStall();
    const decoder = new TextDecoder();
    let buffer = "";

    // Node's fetch body is an async-iterable byte stream.
    for await (const chunk of res.body as unknown as AsyncIterable<Uint8Array>) {
      opts.onActivity?.();
      armStall();
      buffer += decoder.decode(chunk, { stream: true });

      // Events are separated by a blank line. Normalise CRLF first so a
      // proxy rewriting line endings can't hide the delimiter.
      buffer = buffer.replace(/\r\n/g, "\n");
      let sep: number;
      while ((sep = buffer.indexOf("\n\n")) !== -1) {
        const raw = buffer.slice(0, sep);
        buffer = buffer.slice(sep + 2);
        const msg = parseEvent(raw);
        if (msg) await opts.onMessage(msg);
      }
    }
    return stalled ? "stalled" : "closed";
  } catch (e) {
    if (stalled) return "stalled";
    if (opts.signal?.aborted) return "aborted";
    if (e instanceof SseHttpError) throw e;
    if ((e as { name?: string })?.name === "AbortError") return "aborted";
    throw e;
  } finally {
    if (stallTimer) clearTimeout(stallTimer);
    opts.signal?.removeEventListener("abort", onOuterAbort);
  }
}

export class SseHttpError extends Error {
  constructor(
    readonly status: number,
    body: string,
  ) {
    super(`stream responded ${status}: ${body}`);
    this.name = "SseHttpError";
  }
}

function parseEvent(raw: string): SseMessage | null {
  let id: string | undefined;
  let event: string | undefined;
  const dataLines: string[] = [];

  for (const line of raw.split("\n")) {
    // Comment lines (": keepalive") are the heartbeat — they reset the stall
    // timer via onActivity but carry nothing to dispatch.
    if (line.startsWith(":") || line.length === 0) continue;
    const colon = line.indexOf(":");
    const field = colon === -1 ? line : line.slice(0, colon);
    const value = colon === -1 ? "" : line.slice(colon + 1).replace(/^ /, "");
    if (field === "id") id = value;
    else if (field === "event") event = value;
    else if (field === "data") dataLines.push(value);
  }

  if (dataLines.length === 0) return null;
  return { id, event, data: dataLines.join("\n") };
}
