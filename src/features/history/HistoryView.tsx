import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Heading } from "@astryxdesign/core/Heading";
import { Link } from "@astryxdesign/core/Link";
import { Pagination } from "@astryxdesign/core/Pagination";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { GameCover, IChevron, ISearch } from "../../ui";
import { LoadError } from "../../shared/LoadError";
import { formatDate } from "../../shared/format";
import type { HistoryEntry } from "./history-types";
import { outcomeVariant } from "./outcomeTone";
import type { History } from "./useHistory";
import styles from "./HistoryView.module.css";

/** FR-HIST-020…027: the searchable, paged list of finished sessions. */
export function HistoryView({ history }: { history: History }) {
  const { state } = history;
  return (
    <div className={styles.view}>
      <div className={styles.search}>
        <TextInput
          label="Search history"
          placeholder="Game name"
          value={history.search}
          onChange={history.setSearch}
          startIcon={ISearch}
        />
      </div>
      {state.status === "loading" && <Text>Loading…</Text>}
      {state.status === "error" && (
        <LoadError message="Could not load game history." onRetry={history.retry} />
      )}
      {state.status === "loaded" &&
        (state.result.content.length === 0 ? (
          // FR-HIST-027: no entries, or none matching the search.
          <EmptyState title="No game history to show" isCompact />
        ) : (
          <>
            <ul className={styles.list} aria-label="Finished games">
              {state.result.content.map((entry, index) => (
                <HistoryCard
                  key={`${entry.gameId}-${entry.completedAt}-${String(index)}`}
                  entry={entry}
                  index={index}
                  isExpanded={history.expanded === index}
                  onToggle={() => {
                    history.toggle(index);
                  }}
                />
              ))}
            </ul>
            {state.result.pagination.totalPages > 1 && (
              <Pagination
                variant="input"
                label="History pages"
                page={state.result.pagination.page}
                totalPages={state.result.pagination.totalPages}
                pageSize={state.result.pagination.size}
                onChange={history.setPage}
              />
            )}
          </>
        ))}
    </div>
  );
}

function HistoryCard({
  entry,
  index,
  isExpanded,
  onToggle,
}: {
  entry: HistoryEntry;
  index: number;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  const hasDetails = entry.playerStats !== undefined || entry.teamStats !== undefined;
  return (
    <li className={styles.cell} style={{ "--i": index } as React.CSSProperties}>
      <Card padding={0}>
        <div className={styles.card}>
          <div className={styles.summary}>
            <GameCover gameId={entry.gameId} className={styles.thumb} />
            <div className={styles.game}>
              {/* FR-HIST-021/023: a link only while the game exists; the snapshot name otherwise. */}
              {entry.gameLinkable ? (
                <Link href={`/games/${entry.gameId}`} color="inherit">
                  <Text weight="semibold">{entry.gameName}</Text>
                </Link>
              ) : (
                <Text weight="semibold">{entry.gameName}</Text>
              )}
              <Text type="supporting" color="secondary">
                {formatDate(entry.completedAt)}
              </Text>
            </div>
            <Badge variant={outcomeVariant(entry.outcomeLabel)} label={entry.outcomeLabel} />
            <Button
              label={isExpanded ? "Hide details" : "Show details"}
              isIconOnly
              icon={<IChevron className={isExpanded ? styles.open : undefined} />}
              variant="ghost"
              aria-expanded={isExpanded}
              onClick={onToggle}
            />
          </div>
          {isExpanded && (
            <div className={styles.details}>
              {entry.playerStats && <StatsBlock title="Player stats" stats={entry.playerStats} />}
              {entry.teamStats && <StatsBlock title="Team stats" stats={entry.teamStats} />}
              {!hasDetails && <Text color="secondary">This game recorded no further details.</Text>}
            </div>
          )}
        </div>
      </Card>
    </li>
  );
}

function StatsBlock({ title, stats }: { title: string; stats: Record<string, unknown> }) {
  return (
    <div className={styles.stats}>
      <Heading level={3}>{title}</Heading>
      <dl className={styles.dl}>
        {Object.entries(stats).map(([key, value]) => (
          <div key={key} className={styles.stat}>
            <dt>
              <Text color="secondary">{key}</Text>
            </dt>
            {/* Game-defined values are rendered as text, whatever their JSON type. */}
            <dd>{typeof value === "string" ? value : JSON.stringify(value)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
