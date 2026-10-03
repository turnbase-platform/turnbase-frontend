import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { FakeEventSource, ANONYMOUS, installFakeApi } from "../../test/fakeApi";
import { renderAt } from "../../test/renderApp";

const entry = (extra: object = {}) => ({
  gameId: "g-1",
  gameName: "Chess",
  gameLinkable: true,
  completedAt: "2026-09-20T14:03:00Z",
  outcomeLabel: "Victory",
  playerStats: { movesPlayed: 41 },
  teamStats: { captures: 9 },
  ...extra,
});

const envelope = (content: unknown[], page = 1, totalPages = 1) => ({
  body: { content, pagination: { page, size: 25, totalElements: content.length, totalPages } },
});

const profile = {
  "GET /api/auth/session": ANONYMOUS,
  "GET /api/auth/providers": { body: { google: false } },
  "GET /api/users/alice": {
    body: {
      username: "alice",
      userId: "u-1",
      kind: "REGISTERED",
      visibleSections: ["gameHistory"],
    },
  },
};
const historyUrl = "/api/users/alice/history?page=1&size=25";

beforeEach(() => {
  FakeEventSource.reset();
  vi.stubGlobal("EventSource", FakeEventSource);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe("History tab (FR-HIST-020…027)", () => {
  it("FR-HIST-021: a card shows the linked game, outcome label and date", async () => {
    installFakeApi({ ...profile, [`GET ${historyUrl}`]: envelope([entry()]) });
    renderAt("/users/alice");

    expect(await screen.findByRole("link", { name: "Chess" })).toHaveAttribute(
      "href",
      "/games/g-1",
    );
    expect(screen.getByText("Victory")).toBeInTheDocument();
    expect(
      screen.getByText(new Date("2026-09-20T14:03:00Z").toLocaleDateString()),
    ).toBeInTheDocument();
  });

  it("FR-HIST-023: a deleted game is plain text, not a link", async () => {
    installFakeApi({
      ...profile,
      [`GET ${historyUrl}`]: envelope([entry({ gameLinkable: false })]),
    });
    renderAt("/users/alice");

    expect(await screen.findByText("Chess")).toBeInTheDocument();
    expect(screen.queryByRole("link", { name: "Chess" })).toBeNull();
  });

  it("FR-HIST-022: stats are collapsed, expand to labelled sections, and omit absent ones", async () => {
    installFakeApi({
      ...profile,
      [`GET ${historyUrl}`]: envelope([entry(), entry({ gameName: "Go", teamStats: undefined })]),
    });
    renderAt("/users/alice");
    const toggles = await screen.findAllByRole("button", { name: "Show details" });
    expect(screen.queryByText("Player stats")).toBeNull();

    await userEvent.click(toggles[0]);
    expect(screen.getByText("Player stats")).toBeInTheDocument();
    expect(screen.getByText("movesPlayed")).toBeInTheDocument();
    expect(screen.getByText("Team stats")).toBeInTheDocument();
    expect(screen.getByText("captures")).toBeInTheDocument();

    await userEvent.click(screen.getByRole("button", { name: "Hide details" }));
    expect(screen.queryByText("Player stats")).toBeNull();

    await userEvent.click((await screen.findAllByRole("button", { name: "Show details" }))[1]);
    expect(screen.getByText("Player stats")).toBeInTheDocument();
    expect(screen.queryByText("Team stats")).toBeNull();
  });

  it("FR-HIST-027: an empty content array shows the placeholder, not a blank tab", async () => {
    installFakeApi({ ...profile, [`GET ${historyUrl}`]: envelope([]) });
    renderAt("/users/alice");
    expect(await screen.findByText("No game history to show")).toBeInTheDocument();
  });

  it("FR-HIST-025: search drives the `search` parameter server-side", async () => {
    const api = installFakeApi({
      ...profile,
      [`GET ${historyUrl}`]: envelope([entry()]),
      "GET /api/users/alice/history?search=g&page=1&size=25": envelope([]),
    });
    renderAt("/users/alice");
    await screen.findByRole("link", { name: "Chess" });

    await userEvent.type(screen.getByLabelText("Search history"), "g");

    expect(await screen.findByText("No game history to show")).toBeInTheDocument();
    expect(api.calls.map((call) => call.path)).toContain(
      "/api/users/alice/history?search=g&page=1&size=25",
    );
  });

  it("FR-HIST-026: pagination drives `page`, not a client-held slice", async () => {
    const api = installFakeApi({
      ...profile,
      [`GET ${historyUrl}`]: envelope([entry()], 1, 2),
      "GET /api/users/alice/history?page=2&size=25": envelope(
        [entry({ gameName: "Go", gameId: "g-2" })],
        2,
        2,
      ),
    });
    renderAt("/users/alice");
    await screen.findByRole("link", { name: "Chess" });

    await userEvent.click(screen.getByRole("button", { name: /next/i }));

    expect(await screen.findByRole("link", { name: "Go" })).toBeInTheDocument();
    expect(api.calls.map((call) => call.path)).toContain("/api/users/alice/history?page=2&size=25");
  });
});
