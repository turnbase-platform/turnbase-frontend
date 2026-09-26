import { Heading } from "@astryxdesign/core/Heading";
import { Stack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";

/** Stands in for a view a later work item builds; the route and its tier already exist. */
export function PlaceholderPage({ title }: { title: string }) {
  return (
    <Stack gap={2} padding={6}>
      <Heading level={1}>{title}</Heading>
      <Text>This view is not available yet.</Text>
    </Stack>
  );
}
