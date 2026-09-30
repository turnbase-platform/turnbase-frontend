import { afterEach, describe, expect, it } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { InfoDocument } from "./InfoDocument";

afterEach(cleanup);

function renderDoc(source: string) {
  return render(<InfoDocument source={source} />).container;
}

describe("InfoDocument (FR-GDET-004, input-validation.md)", () => {
  it("renders structure: headings, lists, emphasis, code, tables", () => {
    const root = renderDoc(
      "## Rules\n\n- one\n- two\n\n**bold** and `code`\n\n```\nfenced\n```\n\n| a | b |\n|---|---|\n| 1 | 2 |\n",
    );
    expect(root.querySelector("h4")?.textContent).toBe("Rules"); // headingLevelStart 3 → `##` is h4
    expect(root.querySelectorAll("li")).toHaveLength(2);
    expect(root.querySelector("strong")?.textContent).toBe("bold");
    expect(root.textContent).toContain("fenced");
    expect(root.querySelector("table")).not.toBeNull();
  });

  it("never turns raw HTML into elements", () => {
    const root = renderDoc(
      '<script>alert(1)</script>\n\n<iframe src="https://evil.example"></iframe>\n\n<img src=x onerror="alert(1)">',
    );
    for (const tag of ["script", "iframe", "img", "object", "embed", "style"])
      expect(root.querySelector(tag), tag).toBeNull();
  });

  it("links: https only, hardened; other schemes keep the text but lose the link", () => {
    const root = renderDoc(
      "[ok](https://example.com) [js](javascript:alert(1)) [data](data:text/html,x) [rel](/relative)",
    );
    const anchors = root.querySelectorAll("a");
    expect(anchors).toHaveLength(1);
    expect(anchors[0].getAttribute("href")).toBe("https://example.com");
    expect(anchors[0].getAttribute("target")).toBe("_blank");
    expect(anchors[0].getAttribute("rel")).toBe("noopener noreferrer nofollow");
    expect(root.textContent).toContain("js");
  });

  it("resolves reference-style links on the AST before checking the scheme", () => {
    const root = renderDoc("[bad][1]\n\n[1]: javascript:alert(1)");
    expect(root.querySelector("a")).toBeNull();
  });

  it("images: https only, lazy, no referrer", () => {
    const root = renderDoc(
      "![a](https://example.com/a.png) ![b](http://example.com/b.png) ![c](data:image/png;base64,AA)",
    );
    const images = root.querySelectorAll("img");
    expect(images).toHaveLength(1);
    expect(images[0].getAttribute("loading")).toBe("lazy");
    expect(images[0].getAttribute("referrerpolicy")).toBe("no-referrer");
  });

  it("does not autolink bare URLs", () => {
    expect(renderDoc("see https://example.com now").querySelector("a")).toBeNull();
  });
});
