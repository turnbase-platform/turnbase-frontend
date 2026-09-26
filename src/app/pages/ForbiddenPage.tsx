import { Heading } from "@astryxdesign/core/Heading";
import { Link } from "@astryxdesign/core/Link";
import { Stack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";

/** VW-REDIR-003 / NFR-USAB-002: a Guest reaching a Registered-only view. */
export function ForbiddenPage() {
  return (
    <Stack gap={2} padding={6}>
      <Heading level={1}>Not available to guests</Heading>
      <Text>This feature requires a registered account.</Text>
      <Text>
        <Link href="/register">Create an account</Link> to use it.
      </Text>
    </Stack>
  );
}
