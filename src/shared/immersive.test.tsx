import { afterEach, describe, expect, it, vi } from "vitest";
import { cleanup, render } from "@testing-library/react";
import { ImmersiveProvider } from "./immersive";
import { useImmersive } from "./useImmersive";

afterEach(cleanup);

function Wants() {
  useImmersive();
  return null;
}

describe("useImmersive", () => {
  it("asks for the window while mounted and gives it back on unmount", () => {
    const set = vi.fn();
    const view = render(
      <ImmersiveProvider set={set}>
        <Wants />
      </ImmersiveProvider>,
    );
    expect(set).toHaveBeenLastCalledWith(true);
    view.unmount();
    expect(set).toHaveBeenLastCalledWith(false);
  });

  it("does nothing outside a provider", () => {
    expect(() => render(<Wants />)).not.toThrow();
  });
});
