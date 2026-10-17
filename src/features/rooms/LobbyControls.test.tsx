import { describe, expect, it, vi } from "vitest";
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { authWrapper, fakeAuth } from "../../test/authWrapper";
import { REGISTERED } from "../../test/fakeApi";
import { LobbyControls } from "./LobbyControls";

const wrapper = authWrapper(fakeAuth(REGISTERED));

function setup(unmet: string[] | null, inviteCode?: string, starting = false) {
  const onStart = vi.fn();
  const onShareInvite = vi.fn();
  render(
    <LobbyControls
      roomId="r-1"
      inviteCode={inviteCode}
      unmet={unmet}
      starting={starting}
      onShareInvite={onShareInvite}
      onStart={onStart}
    />,
    { wrapper },
  );
  return { onStart, onShareInvite };
}

describe("LobbyControls", () => {
  it("disables Start while a start is in progress, and tells a guest the host has started", () => {
    setup([], "K7", true);
    expect(screen.getByRole("button", { name: "Start game" })).toBeDisabled();
  });

  it("tells a non-host that the host has started the game", () => {
    setup(null, undefined, true);
    expect(screen.getByText("The host has started the game.")).toBeInTheDocument();
  });

  it("shows the host the code, the share control and an enabled Start", async () => {
    const { onStart, onShareInvite } = setup([], "K7");
    expect(screen.getByText("K7")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "Copy link" }));
    expect(onShareInvite).toHaveBeenCalled();
    await userEvent.click(screen.getByRole("button", { name: "Start game" }));
    expect(onStart).toHaveBeenCalled();
    expect(screen.queryByLabelText("Why the game cannot start yet")).toBeNull();
  });

  it("disables Start and lists why while a condition is unmet", () => {
    setup(["bob is not ready."], "K7");
    expect(screen.getByRole("button", { name: "Start game" })).toBeDisabled();
    expect(screen.getByLabelText("Why the game cannot start yet")).toHaveTextContent(
      "bob is not ready.",
    );
  });

  it("tells a player the host decides, with no controls", () => {
    setup(null);
    expect(screen.getByText("Waiting for the host to start the game.")).toBeInTheDocument();
    expect(screen.queryByRole("button")).toBeNull();
  });
});
