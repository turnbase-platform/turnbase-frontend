import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, fireEvent, render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ImmersiveProvider } from "../../shared/immersive";
import { RoomGame } from "./RoomGame";
import type { RoomConnection } from "./roomSocket";
import type { RoomStateSnapshot } from "./rooms-types";

vi.mock("../game/GameFrame", () => ({
  GameFrame: ({ fill }: { fill?: boolean }) => <div data-fill={fill}>frame</div>,
}));

// jsdom implements no pointer capture.
Object.assign(Element.prototype, {
  setPointerCapture: () => undefined,
  hasPointerCapture: () => false,
  releasePointerCapture: () => undefined,
});

afterEach(cleanup);

const snapshot = (extra: Partial<RoomStateSnapshot> = {}): RoomStateSnapshot =>
  ({
    roomId: "r-1",
    state: "IN_PROGRESS",
    gameName: "Tic-Tac-Toe",
    hostId: "u-1",
    players: [
      { playerId: "u-1", username: "alice", teamId: null, ready: true, connected: true },
      { playerId: "u-2", username: "bob", teamId: null, ready: true, connected: true },
    ],
    aiPlayers: [],
    spectators: [{ playerId: "u-5", username: "sam" }],
    spectatorCapacity: 8,
    spectatingEnabled: true,
    teams: [],
    parameters: {},
    ...extra,
  }) as unknown as RoomStateSnapshot;

const message = (id: string, text: string) => ({
  messageId: id,
  channel: "ROOM" as const,
  teamId: null,
  authorId: "u-2",
  authorUsername: "bob",
  text,
  serverTimestamp: "2026-10-27T10:00:00Z",
});

function setup(
  props: {
    snap?: RoomStateSnapshot;
    userId?: string;
    onLeave?: () => void;
    onReturnToLobby?: () => void;
    connected?: boolean;
  } = {},
) {
  const connection = {
    sendChatMessage: vi.fn(),
    sendHostCommand: vi.fn(),
    retryAttach: vi.fn(),
  } as unknown as RoomConnection;
  const set = vi.fn();
  const view = render(
    <ImmersiveProvider set={set}>
      <RoomGame
        snapshot={props.snap ?? snapshot()}
        game={{ sessionId: "s-1", gameFrontendUrl: "https://g.example/" }}
        userId={props.userId ?? "u-1"}
        connection={connection}
        connected={props.connected}
        chatMessages={[message("m-1", "good luck")]}
        onLeave={props.onLeave ?? vi.fn()}
        onReturnToLobby={props.onReturnToLobby ?? vi.fn()}
      />
    </ImmersiveProvider>,
  );
  return { connection, set, view };
}

const openPanel = () => userEvent.click(screen.getByRole("button", { name: "Room menu" }));

describe("RoomGame — the immersive room", () => {
  it("fills the window with the game, asks the shell for it, and shows only the dock", () => {
    const { set } = setup();
    expect(screen.getByText("frame")).toHaveAttribute("data-fill", "true");
    expect(set).toHaveBeenCalledWith(true);
    expect(screen.getAllByRole("button")).toHaveLength(1);
    expect(screen.queryByRole("region", { name: "Room" })).toBeNull();
  });

  it("gives the window back when it unmounts", () => {
    const { set, view } = setup();
    view.unmount();
    expect(set).toHaveBeenLastCalledWith(false);
  });

  it("opens the panel from the dock and closes it again with the mark or Escape", async () => {
    setup();
    const mark = screen.getByRole("button", { name: "Room menu" });
    expect(mark).toHaveAttribute("aria-expanded", "false");
    await userEvent.click(mark);
    expect(mark).toHaveAttribute("aria-expanded", "true");
    expect(screen.getByRole("region", { name: "Room" })).toBeInTheDocument();
    await userEvent.click(mark);
    expect(screen.queryByRole("region", { name: "Room" })).toBeNull();
    await userEvent.click(mark);
    await userEvent.keyboard("{Escape}");
    expect(screen.queryByRole("region", { name: "Room" })).toBeNull();
  });

  it("names the room and its state in the panel", async () => {
    setup();
    await openPanel();
    expect(screen.getByRole("heading", { name: "Tic-Tac-Toe" })).toBeInTheDocument();
    expect(screen.getByText("In progress")).toBeInTheDocument();
    expect(screen.getByText("1 watching")).toBeInTheDocument();
  });

  it("warns on the dock and in the panel while the connection is down", async () => {
    setup({ connected: false });
    expect(screen.getByRole("img", { name: "Connection lost" })).toBeInTheDocument();
    await openPanel();
    expect(screen.getByText(/Connection lost — reconnecting/)).toBeInTheDocument();
  });

  it("asks before leaving, and sends nothing on Stay", async () => {
    const onLeave = vi.fn();
    setup({ onLeave });
    await openPanel();
    await userEvent.click(screen.getByRole("button", { name: "Leave room" }));
    expect(onLeave).not.toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Stay" }));
    expect(screen.getByRole("button", { name: "Leave room" })).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Leave room" }));
    await userEvent.click(screen.getByRole("button", { name: "Leave" }));
    expect(onLeave).toHaveBeenCalledTimes(1);
  });

  it("offers the host transfer and kick, and a guest neither", async () => {
    const { view } = setup();
    await openPanel();
    expect(screen.getByRole("button", { name: "Kick bob" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Transfer host to bob" })).toBeInTheDocument();
    view.unmount();
    setup({ userId: "u-2" });
    await openPanel();
    expect(screen.queryByRole("button", { name: /^Kick/ })).toBeNull();
  });

  it("offers Return to lobby only once the match is over", async () => {
    const onReturnToLobby = vi.fn();
    const { view } = setup({ onReturnToLobby });
    await openPanel();
    expect(screen.queryByRole("button", { name: "Return to lobby" })).toBeNull();
    view.unmount();
    setup({ snap: snapshot({ state: "LOBBY" }), onReturnToLobby });
    await openPanel();
    expect(screen.getByText("Match over")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Return to lobby" }));
    expect(onReturnToLobby).toHaveBeenCalledTimes(1);
  });

  it("gives a spectator no chat and no Undock", async () => {
    setup({ userId: "u-5" });
    await openPanel();
    expect(screen.queryByRole("button", { name: "Undock chat" })).toBeNull();
    expect(screen.queryByLabelText("Message the room")).toBeNull();
  });
});

describe("RoomGame — the floating chat", () => {
  it("moves the chat out of the panel on Undock, and back on Dock", async () => {
    setup();
    await openPanel();
    const panel = screen.getByRole("region", { name: "Room" });
    expect(within(panel).getByText("good luck")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Undock chat" }));
    expect(within(panel).queryByText("good luck")).toBeNull();
    const floating = screen.getByRole("region", { name: "Room chat" });
    expect(within(floating).getByText("good luck")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Dock chat" }));
    expect(screen.queryByRole("region", { name: "Room chat" })).toBeNull();
    expect(within(panel).getByText("good luck")).toBeInTheDocument();
  });

  it("stays when the panel is shut", async () => {
    setup();
    await openPanel();
    await userEvent.click(screen.getByRole("button", { name: "Undock chat" }));
    await userEvent.click(screen.getByRole("button", { name: "Room menu" }));
    expect(screen.queryByRole("region", { name: "Room" })).toBeNull();
    expect(screen.getByRole("region", { name: "Room chat" })).toBeInTheDocument();
  });

  it("keeps a half-typed message across undocking and docking", async () => {
    setup();
    await openPanel();
    await userEvent.type(screen.getByLabelText("Message the room"), "gg");
    await userEvent.click(screen.getByRole("button", { name: "Undock chat" }));
    expect(screen.getByLabelText("Message the room")).toHaveValue("gg");
    await userEvent.click(screen.getByRole("button", { name: "Dock chat" }));
    expect(screen.getByLabelText("Message the room")).toHaveValue("gg");
  });

  it("sends from the floating window", async () => {
    const { connection } = setup();
    await openPanel();
    await userEvent.click(screen.getByRole("button", { name: "Undock chat" }));
    await userEvent.type(screen.getByLabelText("Message the room"), "hello{Enter}");
    expect(connection.sendChatMessage).toHaveBeenCalledWith("ROOM", "hello");
  });

  it("moves with the arrow keys from its title bar and stays in the viewport", async () => {
    setup();
    await openPanel();
    await userEvent.click(screen.getByRole("button", { name: "Undock chat" }));
    const floating = screen.getByRole("region", { name: "Room chat" });
    const bar = screen.getByRole("group", { name: /Chat window/ });
    // jsdom has no layout: give the window a size and a place to move from.
    Object.defineProperty(floating, "offsetWidth", { value: 300 });
    Object.defineProperty(floating, "offsetHeight", { value: 200 });
    floating.getBoundingClientRect = () => ({ left: 100, top: 100 }) as DOMRect;

    fireEvent.keyDown(bar, { key: "ArrowRight" });
    expect(floating.style.left).toBe("116px");
    expect(floating.style.top).toBe("100px");

    for (let i = 0; i < 100; i += 1) fireEvent.keyDown(bar, { key: "ArrowDown", shiftKey: true });
    expect(parseInt(floating.style.top, 10)).toBe(window.innerHeight - 200 - 8);
  });
});
