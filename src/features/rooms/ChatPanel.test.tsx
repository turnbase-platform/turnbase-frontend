import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ChatPanel } from "./ChatPanel";
import type { RoomConnection } from "./roomSocket";
import type { ChatMessageEnvelope, RoomStateSnapshot } from "./rooms-types";

afterEach(cleanup);

const team = {
  teamId: "t-1",
  templateName: "Team",
  configuredSize: 1,
  index: 0,
  memberIds: ["u-1"],
};

const snapshot = (extra: Partial<RoomStateSnapshot> = {}): RoomStateSnapshot => ({
  roomId: "r-1",
  state: "LOBBY",
  gameId: "g-1",
  gameName: "Tic-Tac-Toe",
  spectatingEnabled: true,
  spectatorCapacity: 8,
  hostId: "u-1",
  players: [
    {
      playerId: "u-1",
      username: "alice",
      teamId: "t-1",
      ready: false,
      connected: true,
      joinOrder: 1,
    },
  ],
  aiPlayers: [],
  spectators: [{ playerId: "u-5", username: "sam" }],
  teams: [],
  parameters: {},
  disconnectedPlayers: [],
  sessionId: null,
  gameFrontendUrl: null,
  ...extra,
});

const message = (
  id: string,
  channel: "ROOM" | "TEAM",
  at: string,
  text: string,
): ChatMessageEnvelope["payload"] => ({
  messageId: id,
  channel,
  teamId: channel === "TEAM" ? "t-1" : null,
  authorId: "u-2",
  authorUsername: "bob",
  text,
  serverTimestamp: at,
});

function setup(
  snap: RoomStateSnapshot,
  userId: string,
  messages: ChatMessageEnvelope["payload"][] = [],
) {
  const sendChatMessage = vi.fn();
  const connection = { sendChatMessage } as unknown as RoomConnection;
  render(<ChatPanel snapshot={snap} userId={userId} messages={messages} connection={connection} />);
  return sendChatMessage;
}

describe("ChatPanel", () => {
  it("renders nothing for a spectator", () => {
    setup(snapshot(), "u-5");
    expect(screen.queryByText("Chat")).toBeNull();
    expect(screen.queryByLabelText("Message the room")).toBeNull();
  });

  it("merges both channels into one log sorted by server timestamp, tagged by channel", () => {
    setup(snapshot({ teams: [team] }), "u-1", [
      message("m2", "TEAM", "2026-10-01T10:00:02Z", "second"),
      message("m1", "ROOM", "2026-10-01T10:00:01Z", "first"),
    ]);
    const items = screen.getAllByRole("listitem").map((item) => item.textContent);
    expect(items).toEqual(["[Room] bob: first", "[Team] bob: second"]);
  });

  it("offers no switcher when the game declares no teams, and sends to ROOM", async () => {
    const send = setup(snapshot(), "u-1");
    expect(screen.queryByText("Team")).toBeNull();
    await userEvent.type(screen.getByLabelText("Message the room"), "hi{Enter}");
    expect(send).toHaveBeenCalledWith("ROOM", "hi");
  });

  it("offers the switcher to a team member and sends to the chosen channel", async () => {
    const send = setup(snapshot({ teams: [team] }), "u-1");
    await userEvent.click(screen.getByRole("radio", { name: "Team" }));
    await userEvent.type(screen.getByLabelText("Message your team"), "go{Enter}");
    expect(send).toHaveBeenCalledWith("TEAM", "go");
  });

  it("does not send an empty message", async () => {
    const send = setup(snapshot(), "u-1");
    await userEvent.click(screen.getByRole("button", { name: "Send" }));
    expect(send).not.toHaveBeenCalled();
  });
});
