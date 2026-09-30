import { useEffect, useState } from "react";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Heading } from "@astryxdesign/core/Heading";
import { Link } from "@astryxdesign/core/Link";
import { Pagination } from "@astryxdesign/core/Pagination";
import { Stack } from "@astryxdesign/core/Stack";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { formatDate } from "../../shared/format";
import type { ListEnvelope } from "../../shared/pagination";
import { fetchHistory } from "./historyApi";
import type { HistoryEntry } from "./history-types";

type LoadState =
  | { status: "loading" }
  | { status: "loaded"; result: ListEnvelope<HistoryEntry> }
  | { status: "error" };

/** The profile's History tab: FR-HIST-020…027. */
export function HistorySection({ username }: { username: string }) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [expanded, setExpanded] = useState<number | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetchHistory(username, { search, page })
      .then((result) => {
        if (!cancelled) setState({ status: "loaded", result });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [username, search, page]);

  return (
    <Stack gap={2}>
      <Heading level={2}>Game history</Heading>
      <TextInput
        label="Search history"
        placeholder="Game name"
        value={search}
        onChange={(value) => {
          setSearch(value);
          setPage(1);
          setExpanded(null);
        }}
      />
      {state.status === "loading" && <Text>Loading…</Text>}
      {state.status === "error" && (
        <Banner status="error" title="Could not load game history. Please try again." />
      )}
      {state.status === "loaded" &&
        (state.result.content.length === 0 ? (
          // FR-HIST-027: no entries, or none matching the search.
          <EmptyState title="No game history to show" isCompact />
        ) : (
          <>
            <Stack gap={2}>
              {state.result.content.map((entry, index) => (
                <HistoryCard
                  key={`${entry.gameId}-${entry.completedAt}-${String(index)}`}
                  entry={entry}
                  isExpanded={expanded === index}
                  onToggle={() => {
                    setExpanded((current) => (current === index ? null : index));
                  }}
                />
              ))}
            </Stack>
            {state.result.pagination.totalPages > 1 && (
              <Pagination
                variant="input"
                label="History pages"
                page={state.result.pagination.page}
                totalPages={state.result.pagination.totalPages}
                pageSize={state.result.pagination.size}
                onChange={(next) => {
                  setPage(next);
                  setExpanded(null);
                }}
              />
            )}
          </>
        ))}
    </Stack>
  );
}

function HistoryCard({
  entry,
  isExpanded,
  onToggle,
}: {
  entry: HistoryEntry;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  return (
    <Card padding={3}>
      <Stack gap={2}>
        <Stack direction="horizontal" gap={3}>
          {/* FR-HIST-021/023: a link only while the game exists; the snapshot name otherwise. */}
          {entry.gameLinkable ? (
            <Link href={`/games/${entry.gameId}`}>{entry.gameName}</Link>
          ) : (
            <Text weight="semibold">{entry.gameName}</Text>
          )}
          <Text>{entry.outcomeLabel}</Text>
          <Text>{formatDate(entry.completedAt)}</Text>
          <Button
            label={isExpanded ? "Hide details" : "Show details"}
            variant="ghost"
            aria-expanded={isExpanded}
            onClick={onToggle}
          />
        </Stack>
        {isExpanded && (
          <>
            {entry.playerStats && <StatsBlock title="Player stats" stats={entry.playerStats} />}
            {entry.teamStats && <StatsBlock title="Team stats" stats={entry.teamStats} />}
          </>
        )}
      </Stack>
    </Card>
  );
}

function StatsBlock({ title, stats }: { title: string; stats: Record<string, unknown> }) {
  return (
    <Stack gap={1}>
      <Heading level={3}>{title}</Heading>
      <Stack as="dl" gap={1}>
        {Object.entries(stats).map(([key, value]) => (
          <Stack key={key} direction="horizontal" gap={2}>
            <dt>{key}</dt>
            {/* Game-defined values are rendered as text, whatever their JSON type. */}
            <dd>{typeof value === "string" ? value : JSON.stringify(value)}</dd>
          </Stack>
        ))}
      </Stack>
    </Stack>
  );
}
