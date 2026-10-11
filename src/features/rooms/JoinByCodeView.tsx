import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Link } from "@astryxdesign/core/Link";
import { Stack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { CardPage } from "../../ui";
import type { JoinState } from "./useJoinByCode";

/** VW-JOIN-001…003: the invite screen. It renders the state `useJoinByCode` hands it. */
export function JoinByCodeView({
  state,
  onEnter,
}: {
  state: JoinState;
  onEnter: (role: "PLAYER" | "SPECTATOR") => void;
}) {
  return (
    <CardPage title="Join a room">
      {(state.status === "resolving" || state.status === "joining") && <Text>Joining…</Text>}
      {state.status === "choose" && (
        <Stack gap={3}>
          <Text>{`Join ${state.room.gameName}, hosted by ${state.room.hostUsername}, as:`}</Text>
          <Stack direction="horizontal" gap={2}>
            <Button
              label="Player"
              variant="primary"
              onClick={() => {
                onEnter("PLAYER");
              }}
            />
            <Button
              label="Spectator"
              variant="secondary"
              onClick={() => {
                onEnter("SPECTATOR");
              }}
            />
          </Stack>
        </Stack>
      )}
      {state.status === "failed" && (
        <Stack gap={3}>
          <Banner status="error" title={state.reason} />
          <Link href="/rooms">Browse active rooms</Link>
        </Stack>
      )}
    </CardPage>
  );
}
