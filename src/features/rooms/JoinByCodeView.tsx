import { Banner } from "@astryxdesign/core/Banner";
import { Link } from "@astryxdesign/core/Link";
import { Text } from "@astryxdesign/core/Text";
import { CardPage } from "../../ui";
import { InviteCard } from "./InviteCard";
import type { JoinState } from "./useJoinByCode";

/** VW-JOIN-001…003: the invite screen. It renders the state `useJoinByCode` hands it. */
export function JoinByCodeView({
  code,
  state,
  onEnter,
}: {
  code: string;
  state: JoinState;
  onEnter: (role: "PLAYER" | "SPECTATOR") => void;
}) {
  if (state.status === "choose") {
    return <InviteCard room={state.room} code={code} onEnter={onEnter} />;
  }
  if (state.status === "failed") {
    return (
      <CardPage
        title="We couldn’t find that room"
        subtitle="Check the code with your friend, or browse open rooms."
      >
        <Banner status="error" title={state.reason} />
        <Link href="/rooms">Browse active rooms</Link>
      </CardPage>
    );
  }
  return (
    <CardPage title="Join a room">
      <Text>Joining…</Text>
    </CardPage>
  );
}
