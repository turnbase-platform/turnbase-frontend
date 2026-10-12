import { Card } from "@astryxdesign/core/Card";
import { Heading } from "@astryxdesign/core/Heading";
import { Link } from "@astryxdesign/core/Link";
import { Text } from "@astryxdesign/core/Text";
import { formatDate } from "../../shared/format";
import { Chip, GameCover, IUsers } from "../../ui";
import type { CatalogGame } from "./catalog-types";
import { BadgeLabel } from "./BadgeLabel";
import { CreateRoomButton } from "./CreateRoomButton";
import { playerRange } from "./playerRange";
import styles from "./GameCard.module.css";

/**
 * FR-CAT-002 / FR-CAT-008…010: one catalog entry as a card. The title is the link (FR-CAT-009) and
 * stretches over the whole card, so the card opens the game and "Create room" — a sibling, never
 * nested in the link — stays a button of its own. The short description is always shown, which is
 * what FR-CAT-003's row expansion existed to reveal.
 */
export function GameCard({ game, index = 0 }: { game: CatalogGame; index?: number }) {
  return (
    <div className={styles.cell} style={{ "--i": index } as React.CSSProperties}>
      <Card padding={0} elevation="low">
        <div className={styles.card}>
          <GameCover gameId={game.gameId} />
          <div className={styles.titleRow}>
            <div className={styles.title}>
              <Heading level={2}>
                <Link href={`/games/${game.gameId}`} color="inherit">
                  {game.title}
                </Link>
              </Heading>
            </div>
            <BadgeLabel badge={game.badge} />
          </div>
          <Text type="supporting" color="secondary">
            By {game.authorUsername} · version {game.version}
          </Text>
          <Text color="secondary" maxLines={2}>
            {game.shortDescription}
          </Text>
          <div className={styles.chips}>
            <Chip icon={<IUsers size={14} />}>{playerRange(game)}</Chip>
            <Chip>{game.supportsAi ? "AI" : "No AI"}</Chip>
            <Chip>{game.supportsSpectators ? "Spectators" : "No spectators"}</Chip>
          </div>
          <Text type="supporting" color="secondary">
            Created {formatDate(game.createdAt)} · Updated {formatDate(game.updatedAt)}
          </Text>
          <CreateRoomButton
            gameId={game.gameId}
            supportsSpectators={game.supportsSpectators}
            variant="secondary"
          />
        </div>
      </Card>
    </div>
  );
}
