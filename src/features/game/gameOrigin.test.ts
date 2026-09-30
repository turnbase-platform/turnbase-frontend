import { describe, expect, it } from "vitest";
import { trustedGameOrigin } from "./gameOrigin";

describe("trustedGameOrigin", () => {
  it("is the origin of the absolute URL, without path", () => {
    expect(trustedGameOrigin("http://chess.games.localhost:8080/play/abc?x=1")).toBe(
      "http://chess.games.localhost:8080",
    );
  });

  it.each(["/relative/path", "not a url", "javascript:alert(1)", "data:text/html,x"])(
    "rejects %s",
    (value) => {
      expect(trustedGameOrigin(value)).toBeNull();
    },
  );
});
