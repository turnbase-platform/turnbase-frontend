import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Stack } from "@astryxdesign/core/Stack";

/** The error state of a view or section: says what failed and offers the way out (View standard 3). */
export function LoadError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <Stack gap={2}>
      <Banner status="error" title={message} />
      <Button label="Retry" variant="secondary" onClick={onRetry} />
    </Stack>
  );
}
