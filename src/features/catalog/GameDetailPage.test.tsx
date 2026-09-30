import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cleanup, screen } from "@testing-library/react";
import { FakeEventSource, UNAUTHORIZED, installFakeApi } from "../../test/fakeApi";
import { renderAt } from "../../test/renderApp";

const detail = (extra: object = {}) => ({
  gameId: "g-1",
  title: "Chess",
  authorUsername: "TurnBase",
  shortDescription: "The classic game.",
  infoDocMarkdown: null,
  minPlayers: 2,
  maxPlayers: 2,
  supportsAi: true,
  supportsSpectators: true,
  tags: ["strategy"],
  version: "1.0.0",
  badge: "OFFICIAL",
  activePlayerCount: 4,
  completedSessionCount: 1284,
  createdAt: "2026-08-01T10:00:00Z",
  updatedAt: "2026-09-01T10:00:00Z",
  ...extra,
});

beforeEach(() => {
  FakeEventSource.reset();
  vi.stubGlobal("EventSource", FakeEventSource);
});

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

const anon = { "GET /api/auth/session": UNAUTHORIZED };

describe("GameDetailPage (VW-GDET-001…003, FR-GDET-001…009)", () => {
  it("FR-GDET-002/005: shows metadata, tags, badge and the player count", async () => {
    installFakeApi({ ...anon, "GET /api/games/g-1": { body: detail() } });
    renderAt("/games/g-1");

    expect(await screen.findByRole("heading", { level: 1, name: "Chess" })).toBeInTheDocument();
    expect(screen.getByText("strategy")).toBeInTheDocument();
    expect(screen.getByText("Official")).toBeInTheDocument();
    expect(screen.getByText(/Players in active rooms now: 4/)).toBeInTheDocument();
    expect(screen.getByText(/Completed sessions: 1284/)).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Create room" })).toBeNull(); // VW-GDET-003
  });

  it("FR-GDET-003: with no info document, the short description is shown", async () => {
    installFakeApi({ ...anon, "GET /api/games/g-1": { body: detail() } });
    renderAt("/games/g-1");
    expect(await screen.findByText("The classic game.")).toBeInTheDocument();
  });

  it("FR-GDET-003/004: an info document renders as Markdown, with raw HTML inert", async () => {
    installFakeApi({
      ...anon,
      "GET /api/games/g-1": {
        body: detail({
          infoDocMarkdown:
            "## How to play\n\n- move\n\n<script>alert(1)</script>\n\n[x](javascript:alert(1))",
        }),
      },
    });
    renderAt("/games/g-1");

    expect(await screen.findByRole("heading", { name: "How to play" })).toBeInTheDocument();
    expect(screen.getByText("move")).toBeInTheDocument();
    expect(document.querySelector("script")).toBeNull();
    expect(screen.queryByText("The classic game.")).toBeNull();
    expect(document.querySelector('a[href^="javascript"]')).toBeNull();
  });

  it("FR-GDET-007: a soft-deleted game says it no longer exists (410, not a generic 404)", async () => {
    installFakeApi({ ...anon, "GET /api/games/g-1": { status: 410, body: { type: "gone" } } });
    renderAt("/games/g-1");
    expect(await screen.findByText("This game no longer exists.")).toBeInTheDocument();
  });

  it("FR-GDET-008: an invisible game is the ordinary not-found page", async () => {
    installFakeApi({ ...anon, "GET /api/games/g-1": { status: 404, body: { type: "not-found" } } });
    renderAt("/games/g-1");
    expect(await screen.findByText("Page not found")).toBeInTheDocument();
  });
});
