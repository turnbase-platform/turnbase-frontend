import { useEffect, useState } from "react";
import { useParams } from "react-router";
import { Banner } from "@astryxdesign/core/Banner";
import { Heading } from "@astryxdesign/core/Heading";
import { Link } from "@astryxdesign/core/Link";
import { Stack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { Token } from "@astryxdesign/core/Token";
import { NotFoundPage } from "../../app/pages/NotFoundPage";
import { ApiError } from "../../shared/api";
import { formatDate } from "../../shared/format";
import { InfoDocument } from "../../shared/InfoDocument";
import { getGame } from "./catalogApi";
import type { GameDetail } from "./catalog-types";
import { BadgeLabel } from "./BadgeLabel";
import { CreateRoomButton } from "./CreateRoomButton";

type LoadState =
  | { status: "loading" }
  | { status: "loaded"; game: GameDetail }
  | { status: "not-found" } // FR-GDET-008: invisible and nonexistent are indistinguishable
  | { status: "gone" } // FR-GDET-007
  | { status: "error" };

/** VW-GDET-001…003 / FR-GDET-001…009. */
export function GameDetailPage() {
  const { id = "" } = useParams();
  // Keyed so navigating between games remounts with fresh "loading" state.
  return <GameDetailFor key={id} gameId={id} />;
}

function GameDetailFor({ gameId }: { gameId: string }) {
  const [state, setState] = useState<LoadState>({ status: "loading" });

  useEffect(() => {
    let cancelled = false;
    getGame(gameId)
      .then((game) => {
        if (!cancelled) setState({ status: "loaded", game });
      })
      .catch((error: unknown) => {
        if (cancelled) return;
        if (error instanceof ApiError && error.status === 404) setState({ status: "not-found" });
        else if (error instanceof ApiError && error.status === 410) setState({ status: "gone" });
        else setState({ status: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [gameId]);

  if (state.status === "loading")
    return (
      <Stack gap={2} padding={6}>
        <Text>Loading…</Text>
      </Stack>
    );
  if (state.status === "not-found") return <NotFoundPage />;
  if (state.status === "gone")
    return (
      <Stack gap={2} padding={6}>
        <Heading level={1}>Game removed</Heading>
        <Text>This game no longer exists.</Text>
        <Link href="/games">Back to the catalog</Link>
      </Stack>
    );
  if (state.status === "error")
    return (
      <Stack gap={2} padding={6}>
        <Banner status="error" title="Could not load this game. Please try again." />
      </Stack>
    );

  const { game } = state;
  return (
    <Stack gap={5} padding={6}>
      <Stack gap={2}>
        <Stack direction="horizontal" gap={3}>
          <Heading level={1}>{game.title}</Heading>
          <BadgeLabel badge={game.badge} />
        </Stack>
        <Text>
          By <Link href={`/users/${game.authorUsername}`}>{game.authorUsername}</Link> · version{" "}
          {game.version}
        </Text>
        <CreateRoomButton gameId={game.gameId} supportsSpectators={game.supportsSpectators} />
      </Stack>

      <Stack gap={2}>
        <Heading level={2}>Details</Heading>
        <Stack as="ul" gap={1}>
          <li>
            Players: {game.minPlayers}
            {game.maxPlayers === game.minPlayers ? "" : `–${String(game.maxPlayers)}`}
          </li>
          <li>AI players: {game.supportsAi ? "supported" : "not supported"}</li>
          <li>Spectators: {game.supportsSpectators ? "supported" : "not supported"}</li>
          <li>Created: {formatDate(game.createdAt)}</li>
          <li>Last updated: {formatDate(game.updatedAt)}</li>
        </Stack>
        {game.tags.length > 0 && (
          <Stack direction="horizontal" gap={1}>
            {game.tags.map((tag) => (
              <Token key={tag} label={tag} />
            ))}
          </Stack>
        )}
      </Stack>

      {/* FR-GDET-003: the Markdown document when the game ships one, else the short description.
          `null` — not an empty string — is how the API says "absent". */}
      <Stack gap={2}>
        <Heading level={2}>About</Heading>
        {game.infoDocMarkdown === null ? (
          <Text>{game.shortDescription}</Text>
        ) : (
          <InfoDocument source={game.infoDocMarkdown} />
        )}
      </Stack>

      {/* VW-GDET-002 / FR-GDET-005: loaded once with the page, never pushed. */}
      <Stack gap={2}>
        <Heading level={2}>Statistics</Heading>
        <Stack as="ul" gap={1}>
          <li>Players in active rooms now: {game.activePlayerCount}</li>
          <li>Completed sessions: {game.completedSessionCount}</li>
        </Stack>
      </Stack>
    </Stack>
  );
}
