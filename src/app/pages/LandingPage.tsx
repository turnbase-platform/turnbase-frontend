import { Button } from "@astryxdesign/core/Button";
import { Heading } from "@astryxdesign/core/Heading";
import { Stack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { useAuth } from "../../features/auth/auth-context";
import { GuestButton } from "../../features/auth/GuestButton";

/** VW-LAND-001…004. The three calls to action are removed, not disabled, once signed in
 * (NFR-USAB-001). */
export function LandingPage() {
  const { tier } = useAuth();
  return (
    <Stack gap={4} maxWidth={720} padding={6}>
      <Heading level={1}>Turn-based games, together</Heading>
      <Text>
        TurnBase hosts multiplayer turn-based games in your browser. Browse the catalog, open a
        room, invite your friends and play — with in-room chat and a history of every game.
      </Text>
      <Stack as="ul" gap={1}>
        <li>A catalog of official games, plus games uploaded by the community</li>
        <li>Rooms with invite links and friend invitations</li>
        <li>Friends, profiles and game history</li>
      </Stack>
      {tier === "unauth" && (
        <Stack direction="horizontal" gap={2}>
          <Button label="Log in" variant="primary" href="/login" />
          <Button label="Register" variant="secondary" href="/register" />
          <GuestButton />
        </Stack>
      )}
    </Stack>
  );
}
