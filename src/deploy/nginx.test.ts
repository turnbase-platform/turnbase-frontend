/// <reference types="node" />
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

// IMP-M6-02 / IMP-GATE-74: the Frontend container's nginx emits the shell's CSP, and its
// `frame-src` is *derived* at start from the games-origin template (game-asset-serving.md §6.3).
// This runs the two real artefacts the image ships — the sourced entrypoint script and the
// template — through the same envsubst step the nginx image runs, so the test and the container
// cannot disagree about what is served. (Requires `envsubst`, which the CI runners carry.)

// Vitest runs from the repository root (`npm test`).
const file = (name: string) => resolve(process.cwd(), "nginx", name);
const template = readFileSync(file("default.conf.template"), "utf8");

/** Runs the entrypoint script, then renders the template exactly as the image's step does. */
function render(env: Record<string, string>): { config: string; vars: Record<string, string> } {
  const names = [
    "TURNBASE_FRAME_SRC",
    "TURNBASE_GAME_HOST_REGEX",
    "TURNBASE_PLATFORM_HOST",
    "TURNBASE_FRONTEND_UPSTREAM",
  ];
  const script = `. "${file("15-derive-origins.envsh")}"; ${names
    .map((name) => `printf '%s=%s\\n' ${name} "$${name}"`)
    .join("; ")}`;
  const cleanEnv = { PATH: process.env.PATH ?? "", ...env };
  const output = execFileSync("sh", ["-c", script], { env: cleanEnv, encoding: "utf8" });
  const vars = Object.fromEntries(
    output
      .trim()
      .split("\n")
      .map((line) => [line.slice(0, line.indexOf("=")), line.slice(line.indexOf("=") + 1)]),
  );
  const config = execFileSync(
    "envsubst",
    [
      "$TURNBASE_FRAME_SRC $TURNBASE_GAME_HOST_REGEX $TURNBASE_PLATFORM_HOST $TURNBASE_FRONTEND_UPSTREAM",
    ],
    {
      env: { ...cleanEnv, ...vars },
      input: template,
      encoding: "utf8",
    },
  );
  return { config, vars };
}

const frameSrc = (config: string) => /frame-src ([^;"]+)/.exec(config)?.[1];

describe("frame-src derivation (game-asset-serving.md §6.3)", () => {
  it("replaces {gameId} with * for a per-game template", () => {
    const { config } = render({
      TURNBASE_GAME_FRONTEND_ORIGIN_TEMPLATE: "http://{gameId}.games.localhost:8080",
    });
    expect(frameSrc(config)).toBe("http://*.games.localhost:8080");
  });

  it("uses a constant (shared-origin) template verbatim", () => {
    const { config } = render({
      TURNBASE_GAME_FRONTEND_ORIGIN_TEMPLATE: "https://games.example.net",
    });
    expect(frameSrc(config)).toBe("https://games.example.net");
  });

  it("replaces every occurrence, wherever {gameId} sits", () => {
    const { config } = render({
      TURNBASE_GAME_FRONTEND_ORIGIN_TEMPLATE: "https://{gameId}.g.example.net",
    });
    expect(frameSrc(config)).toBe("https://*.g.example.net");
  });

  it("defaults to the local origin when nothing is configured", () => {
    const { config } = render({});
    expect(frameSrc(config)).toBe("http://*.games.localhost:8080");
  });

  it("is written once: the template holds a placeholder, never a value", () => {
    expect(template.match(/frame-src [^;\n]*;/g)).toEqual(["frame-src ${TURNBASE_FRAME_SRC};"]);
  });
});

describe("the served Content-Security-Policy (shell-architecture.md §6)", () => {
  const { config } = render({});
  const policy = /set \$shell_csp "([^"]+)";/.exec(config)?.[1] ?? "";
  const served = config.match(/add_header Content-Security-Policy \$shell_csp always;/g) ?? [];
  const directives = policy.split("; ");

  it("carries every directive of §6, on the shell document, `always`", () => {
    expect(served).toHaveLength(2); // the shell routes and the static/404 fallback
    expect(directives).toEqual([
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self'",
      "img-src 'self' data: https:",
      "font-src 'self'",
      "connect-src 'self'",
      "frame-src http://*.games.localhost:8080",
      "frame-ancestors 'none'",
      "form-action 'self'",
      "base-uri 'none'",
      "object-src 'none'",
    ]);
  });

  it("allows neither inline nor eval script", () => {
    expect(policy).not.toContain("unsafe-inline");
    expect(policy).not.toContain("unsafe-eval");
  });
});

describe("routing (local-environment.md §1)", () => {
  it("selects the shell by the platform origin's host — scheme and port removed", () => {
    expect(render({}).vars.TURNBASE_PLATFORM_HOST).toBe("turnbase.localhost");
    expect(
      render({ TURNBASE_PLATFORM_ORIGIN: "https://app.example.com:8443/" }).vars
        .TURNBASE_PLATFORM_HOST,
    ).toBe("app.example.com");
    expect(render({ TURNBASE_PLATFORM_ORIGIN: "https://app.example.com" }).config).toContain(
      "server_name app.example.com;",
    );
  });

  it("proxies to the configured upstream, defaulting to platform:8080", () => {
    expect(render({}).config).toContain("proxy_pass http://platform:8080;");
    expect(render({ TURNBASE_FRONTEND_UPSTREAM: "monolith:9000" }).config).toContain(
      "proxy_pass http://monolith:9000;",
    );
  });

  it("proxies exactly /auth/google and /auth/callback — never an /auth/ prefix (IMP-GATE-76)", () => {
    const { config } = render({});
    const locations = [...config.matchAll(/^\s*location\s+(.+?)\s*\{/gm)].map((m) => m[1]);
    expect(locations).toEqual(
      expect.arrayContaining(["= /auth/google", "= /auth/callback", "/api/", "/ws"]),
    );
    expect(locations.filter((location) => location.includes("/auth"))).toEqual([
      "= /auth/google",
      "= /auth/callback",
    ]);
  });

  it("leaves nginx's own variables alone", () => {
    const { config } = render({});
    for (const variable of ["$http_upgrade", "$connection_upgrade", "$http_host", "$uri"]) {
      expect(config).toContain(variable);
    }
    expect(config).not.toMatch(/\$\{TURNBASE_/);
  });

  it("does not buffer the notification stream", () => {
    const { config } = render({});
    const block = /location = \/api\/notifications\/stream \{[^}]*\}/.exec(config)?.[0] ?? "";
    expect(block).toContain("proxy_buffering off;");
  });

  it("sends the upgrade headers on /ws", () => {
    const { config } = render({});
    const block = /location \/ws \{[^}]*\}/.exec(config)?.[0] ?? "";
    expect(block).toContain("proxy_set_header Upgrade $http_upgrade;");
    expect(block).toContain("proxy_set_header Connection $connection_upgrade;");
    expect(block).toContain("proxy_set_header Host $http_host;");
  });
});

describe("forwarded client address (rate-limiting.md § Client identity, IMP-M10-05)", () => {
  const { config } = render({});
  const lines = config.split("\n").filter((line) => line.includes("X-Forwarded-For"));

  it("sets X-Forwarded-For wherever it proxies (fall-through, server, /ws)", () => {
    expect(lines).toHaveLength(3);
  });

  it("overwrites the header with the observed peer, never appending a client value", () => {
    for (const line of lines) {
      expect(line.trim()).toBe("proxy_set_header X-Forwarded-For $remote_addr;");
    }
    expect(config).not.toContain("proxy_add_x_forwarded_for");
  });
});

describe("the gRPC registry is not on the public edge (IMP-M10-06)", () => {
  const { config } = render({});
  const servers = config.split(/^server \{/m).slice(1);

  it("refuses /turnbase.gamehost.v1.* with 404 in the fall-through and the platform server", () => {
    expect(servers).toHaveLength(2);
    for (const server of servers) {
      const block = /location \^~ \/turnbase\.gamehost\.v1\. \{([^}]*)\}/.exec(server)?.[1] ?? "";
      expect(block.trim()).toBe("return 404;");
    }
  });

  it("never proxies a registry path", () => {
    const locations = [...config.matchAll(/^\s*location\s+(.+?)\s*\{/gm)].map((m) => m[1]);
    expect(locations.filter((l) => l.includes("gamehost"))).toHaveLength(2);
    expect(config).not.toMatch(/grpc_pass/);
  });
});

describe("known hosts only (IMP-M10-18)", () => {
  const { config, vars } = render({});
  const fallThrough = config.split(/^server \{/m)[1];

  it("derives the games-host regex from the origin template", () => {
    expect(vars.TURNBASE_GAME_HOST_REGEX).toBe("[a-z0-9-]+\\.games\\.localhost");
    expect(
      render({ TURNBASE_GAME_FRONTEND_ORIGIN_TEMPLATE: "https://games.example.net:8443/x" }).vars
        .TURNBASE_GAME_HOST_REGEX,
    ).toBe("games\\.example\\.net");
  });

  it("admits only the games origin to the fall-through and refuses the rest with 421", () => {
    expect(config).toMatch(/~\*\^\[a-z0-9-\]\+\\\.games\\\.localhost\$ 1;/);
    expect(config).toMatch(/map \$host \$known_game_host \{\s+default 0;/);
    expect(/if \(\$known_game_host = 0\) \{\s*return 421;\s*\}/.test(fallThrough)).toBe(true);
  });

  it("the nginx regex matches a game host and rejects foreign ones", () => {
    const re = new RegExp(`^${vars.TURNBASE_GAME_HOST_REGEX}$`, "i");
    expect(re.test("tictactoe.games.localhost")).toBe(true);
    for (const host of ["evil.example.com", "games.localhost", "x.games.localhost.evil.com", ""]) {
      expect(re.test(host)).toBe(false);
    }
  });
});

describe("hardening headers (IMP-M10-18)", () => {
  const { config } = render({});

  it("ships all four beside the CSP, on both shell locations, `always`", () => {
    for (const header of [
      'X-Content-Type-Options "nosniff"',
      'Referrer-Policy "strict-origin-when-cross-origin"',
      'X-Frame-Options "DENY"',
      "Strict-Transport-Security $hsts",
    ]) {
      expect(
        config.match(new RegExp(`add_header ${header.replace(/[$]/g, "\\$")} always;`, "g")),
      ).toHaveLength(2);
    }
  });

  it("sends HSTS only for requests that arrived over TLS", () => {
    expect(config).toMatch(
      /map \$http_x_forwarded_proto \$hsts \{\s+default '';\s+https\s+'max-age=31536000; includeSubDomains';/,
    );
  });
});
