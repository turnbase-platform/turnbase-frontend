import { Heading } from "@astryxdesign/core/Heading";
import { Link } from "@astryxdesign/core/Link";
import { Stack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";

export function NotFoundPage() {
  return (
    <Stack gap={2} padding={6}>
      <Heading level={1}>Page not found</Heading>
      <Text>
        There is nothing at this address. <Link href="/">Back to the start</Link>.
      </Text>
    </Stack>
  );
}
