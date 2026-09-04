import { Theme } from "@astryxdesign/core/theme";
import { Button } from "@astryxdesign/core/Button";
import { neutralTheme } from "@astryxdesign/theme-neutral/built";

// shell-architecture.md §2: the shell mounts `<Theme>` once, at the root. `<LinkProvider>`
// (the other of "the two providers") is added in IMP-M6-02, which is what brings in
// react-router — there is no router yet for it to wrap.
export function App() {
  return (
    <Theme theme={neutralTheme}>
      <Button label="TurnBase" variant="primary" />
    </Theme>
  );
}
