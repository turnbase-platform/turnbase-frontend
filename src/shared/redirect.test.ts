import { describe, expect, it } from "vitest";
import { DEFAULT_LANDING, safeRedirect } from "./redirect";

describe("safeRedirect (VW-REDIR-005/006, NFR-SEC-001)", () => {
  it.each([
    ["/rooms", "/rooms"],
    ["/rooms/abcd?tab=chat#top", "/rooms/abcd?tab=chat#top"],
    ["/", "/"],
    ["/users/alice", "/users/alice"],
  ])("keeps the internal path %s", (raw, expected) => {
    expect(safeRedirect(raw)).toBe(expected);
  });

  it.each([
    ["absent", null],
    ["undefined", undefined],
    ["empty", ""],
    ["a relative path", "rooms"],
    ["an absolute URL", "https://evil.example/"],
    ["a protocol-relative URL — the trap a bare startsWith('/') accepts", "//evil.example"],
    ["a protocol-relative URL with a path", "//evil.example/rooms"],
    ["a backslash the browser reads as a slash", "/\\evil.example"],
    ["a backslash anywhere", "/rooms\\..\\..\\x"],
    ["a tab that the URL parser strips, leaving //", "/\t/evil.example"],
    ["a newline", "/rooms\nSet-Cookie: x=1"],
    ["a javascript: URL", "javascript:alert(1)"],
    ["a data: URL", "data:text/html,x"],
  ])("falls closed to /rooms for %s", (_name, raw) => {
    expect(safeRedirect(raw)).toBe(DEFAULT_LANDING);
    expect(DEFAULT_LANDING).toBe("/rooms");
  });
});
