import { describe, expect, it } from "vitest";
import { frameFor, SECTIONS } from "./frame";

describe("frameFor", () => {
  it("lets the landing run edge to edge", () => {
    expect(frameFor("/")).toBe("bare");
  });

  it("gives a room wide space, but not the room list or the join page", () => {
    expect(frameFor("/rooms/r-123")).toBe("wide");
    expect(frameFor("/rooms")).toBe("normal");
    expect(frameFor("/rooms/join/NOVA-7Q")).toBe("normal");
  });

  it("gives everything else the standard column", () => {
    for (const path of ["/games", "/games/tictactoe", "/friends", "/settings", "/login"]) {
      expect(frameFor(path)).toBe("normal");
    }
  });
});

describe("SECTIONS", () => {
  it("runs Games, Rooms, Friends, Users, Settings", () => {
    expect([...SECTIONS]).toEqual(["/games", "/rooms", "/friends", "/users", "/settings"]);
  });
});
