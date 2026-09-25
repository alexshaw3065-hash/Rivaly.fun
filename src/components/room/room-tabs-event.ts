// Ask the room's tabs to switch (e.g. the pressure ticker → "stats").
// A window event rather than shared state: the ticker lives inside the chat,
// which RoomTabs renders as a child it doesn't otherwise talk to.
export const ROOM_TAB_EVENT = "rivaly:room-tab";
