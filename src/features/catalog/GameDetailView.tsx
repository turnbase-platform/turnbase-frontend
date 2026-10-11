import { Banner } from "@astryxdesign/core/Banner";
import { Card } from "@astryxdesign/core/Card";
import { Heading } from "@astryxdesign/core/Heading";
import { Link } from "@astryxdesign/core/Link";
import { Text } from "@astryxdesign/core/Text";
import { Token } from "@astryxdesign/core/Token";
import { NotFoundPage } from "../../app/pages/NotFoundPage";
import { formatDate } from "../../shared/format";
import { InfoDocument } from "../../shared/InfoDocument";
import { IArrow, IUsers } from "../../ui";
import type { GameDetailState } from "./useGameDetail";
import { BadgeLabel } from "./BadgeLabel";
import { CreateRoomButton } from "./CreateRoomButton";
import styles from "./GameDetailView.module.css";

/** VW-GDET-001…003 / FR-GDET-001…009: one game, or the reason there is none. */
export function GameDetailView({ state }: { state: GameDetailState }) {
  if (state.status === "loading")
    return (
      <div className={styles.page}>
        <Text>Loading…</Text>
      </div>
    );
  if (state.status === "not-found") return <NotFoundPage />;
  if (state.status === "gone")
    return (
      <div className={styles.page}>
        <Heading level={1} type="display-3">
          Game removed
        </Heading>
        <Text>This game no longer exists.</Text>
        <Link href="/games">Back to the catalog</Link>
      </div>
    );
  if (state.status === "error")
    return (
      <div className={styles.page}>
        <Banner status="error" title="Could not load this game. Please try again." />
      </div>
    );

  const { game } = state;
  const players =
    game.minPlayers === game.maxPlayers
      ? String(game.minPlayers)
      : `${String(game.minPlayers)}–${String(game.maxPlayers)}`;
  return (
    <div className={styles.page}>
      <section className={styles.hero}>
        <Link href="/games" hasUnderline>
          <span className={styles.back}>
            <IArrow size={16} />
            All games
          </span>
        </Link>
        <div className={styles.title}>
          <Heading level={1} type="display-2">
            {game.title}
          </Heading>
          <BadgeLabel badge={game.badge} />
        </div>
        <Text color="secondary">
          By <Link href={`/users/${game.authorUsername}`}>{game.authorUsername}</Link> · version{" "}
          {game.version}
        </Text>
        <div className={styles.chips}>
          <span className={styles.chip}>
            <IUsers size={14} />
            {players} players
          </span>
          {game.tags.map((tag) => (
            <Token key={tag} label={tag} />
          ))}
        </div>
        {/* A flex child would stretch to the row; this one keeps the button its own width. */}
        <div className={styles.cta}>
          <CreateRoomButton gameId={game.gameId} supportsSpectators={game.supportsSpectators} />
        </div>
      </section>

      <div className={styles.grid}>
        {/* FR-GDET-003: the Markdown document when the game ships one, else the short
            description. `null` — not an empty string — is how the API says "absent". */}
        <Card padding={5}>
          <div className={styles.section}>
            <Heading level={2} type="display-3">
              About
            </Heading>
            {game.infoDocMarkdown === null ? (
              <Text>{game.shortDescription}</Text>
            ) : (
              <InfoDocument source={game.infoDocMarkdown} />
            )}
          </div>
        </Card>

        <div className={styles.side}>
          <Card padding={5}>
            <div className={styles.section}>
              <Heading level={2} type="display-3">
                Details
              </Heading>
              <ul className={styles.list}>
                <li>Players: {players}</li>
                <li>AI players: {game.supportsAi ? "supported" : "not supported"}</li>
                <li>Spectators: {game.supportsSpectators ? "supported" : "not supported"}</li>
                <li>Created: {formatDate(game.createdAt)}</li>
                <li>Last updated: {formatDate(game.updatedAt)}</li>
              </ul>
            </div>
          </Card>
          {/* VW-GDET-002 / FR-GDET-005: loaded once with the page, never pushed. */}
          <Card padding={5}>
            <div className={styles.section}>
              <Heading level={2} type="display-3">
                Statistics
              </Heading>
              <ul className={styles.list}>
                <li>Players in active rooms now: {game.activePlayerCount}</li>
                <li>Completed sessions: {game.completedSessionCount}</li>
              </ul>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
