// Signals between the room's tabs and what they hold. Window events rather
// than shared state: the chat and its pressure ticker live inside a panel
// RoomTabs renders as a child it doesn't otherwise talk to.

/** Ask the room's tabs to switch (e.g. the pressure ticker → "stats"). */
export const ROOM_TAB_EVENT = "rivaly:room-tab";

/** Something new dropped in the room's chat — a message, a match moment, a pressure alert. */
export const CHAT_ACTIVITY_EVENT = "rivaly:chat-activity";

export interface ChatActivity {
  kind: "message" | "moment" | "alert";
  /** Short line for the jump pill ("MCI are all over them"). */
  text?: string;
  /** Team colour for an alert. */
  colour?: string;
}

export function announceChatActivity(detail: ChatActivity) {
  window.dispatchEvent(new CustomEvent<ChatActivity>(CHAT_ACTIVITY_EVENT, { detail }));
}
