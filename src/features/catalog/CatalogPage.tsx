import { Fragment, useEffect, useState } from "react";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Heading } from "@astryxdesign/core/Heading";
import { Link } from "@astryxdesign/core/Link";
import { NumberInput } from "@astryxdesign/core/NumberInput";
import { Pagination } from "@astryxdesign/core/Pagination";
import { Selector } from "@astryxdesign/core/Selector";
import { Stack } from "@astryxdesign/core/Stack";
import {
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableHeaderCell,
  TableRow,
} from "@astryxdesign/core/Table";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import type { ListEnvelope } from "../../shared/pagination";
import { formatDate } from "../../shared/format";
import { listGames, type CatalogQuery } from "./catalogApi";
import type { CatalogGame, CatalogSortField } from "./catalog-types";
import { BadgeLabel } from "./BadgeLabel";
import { CreateRoomButton } from "./CreateRoomButton";

const SORT_LABELS: Record<CatalogSortField, string> = {
  title: "Name",
  author: "Author",
  minPlayers: "Min players",
  maxPlayers: "Max players",
  version: "Version",
  createdAt: "Created",
  updatedAt: "Last updated",
};

const SORT_OPTIONS = (Object.keys(SORT_LABELS) as CatalogSortField[]).flatMap((field) => [
  { value: `${field},asc`, label: `${SORT_LABELS[field]} (ascending)` },
  { value: `${field},desc`, label: `${SORT_LABELS[field]} (descending)` },
]);

/** FR-CAT-004: "configurable", default 25. */
const PAGE_SIZE = 25;

type LoadState =
  | { status: "loading" }
  | { status: "loaded"; result: ListEnvelope<CatalogGame> }
  | { status: "error" };

/** VW-CAT-001…003 / FR-CAT-001…010. Every filter, sort and page is a server round trip. */
export function CatalogPage() {
  const [query, setQuery] = useState<CatalogQuery>({
    search: "",
    minPlayers: null,
    maxPlayers: null,
    sort: "createdAt",
    direction: "desc", // FR-CAT-007
    page: 1,
    size: PAGE_SIZE,
  });
  const [state, setState] = useState<LoadState>({ status: "loading" });
  // FR-CAT-003: one row expanded at a time.
  const [expanded, setExpanded] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    listGames(query)
      .then((result) => {
        if (!cancelled) setState({ status: "loaded", result });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [query]);

  // A changed filter restarts at page 1 — the old page number means nothing for a new result set.
  function refine(change: Partial<CatalogQuery>) {
    setQuery((previous) => ({ ...previous, ...change, page: 1 }));
    setExpanded(null);
  }

  return (
    <Stack gap={4} padding={6}>
      <Heading level={1}>Games</Heading>
      <Stack direction="horizontal" gap={3} wrap="wrap">
        <TextInput
          label="Search games"
          placeholder="Name, author or tag"
          value={query.search}
          onChange={(search) => {
            refine({ search });
          }}
        />
        <NumberInput
          label="Min players"
          value={query.minPlayers}
          min={1}
          isIntegerOnly
          hasClear
          onChange={(minPlayers) => {
            refine({ minPlayers: Number.isNaN(minPlayers) ? null : minPlayers });
          }}
        />
        <NumberInput
          label="Max players"
          value={query.maxPlayers}
          min={1}
          isIntegerOnly
          hasClear
          onChange={(maxPlayers) => {
            refine({ maxPlayers: Number.isNaN(maxPlayers) ? null : maxPlayers });
          }}
        />
        <Selector
          label="Sort by"
          options={SORT_OPTIONS}
          value={`${query.sort},${query.direction}`}
          onChange={(value) => {
            const [sort, direction] = value.split(",") as [CatalogSortField, "asc" | "desc"];
            refine({ sort, direction });
          }}
        />
      </Stack>
      <CatalogBody
        state={state}
        expanded={expanded}
        onToggle={(gameId) => {
          setExpanded((current) => (current === gameId ? null : gameId));
        }}
        onPage={(page) => {
          setQuery((previous) => ({ ...previous, page }));
          setExpanded(null);
        }}
      />
    </Stack>
  );
}

function CatalogBody({
  state,
  expanded,
  onToggle,
  onPage,
}: {
  state: LoadState;
  expanded: string | null;
  onToggle: (gameId: string) => void;
  onPage: (page: number) => void;
}) {
  if (state.status === "loading") return <Text>Loading…</Text>;
  if (state.status === "error")
    return <Banner status="error" title="Could not load the catalog. Please try again." />;

  const { content, pagination } = state.result;
  if (content.length === 0) return <EmptyState title="No games match your search" />;

  return (
    <Stack gap={3}>
      <div className="catalog-table">
        <Table dividers="rows">
          <TableHeader>
            <TableRow isHeaderRow>
              <TableHeaderCell>Game</TableHeaderCell>
              <TableHeaderCell>Author</TableHeaderCell>
              <TableHeaderCell>Players</TableHeaderCell>
              <TableHeaderCell>AI</TableHeaderCell>
              <TableHeaderCell>Spectators</TableHeaderCell>
              <TableHeaderCell>Version</TableHeaderCell>
              <TableHeaderCell>Created</TableHeaderCell>
              <TableHeaderCell>Updated</TableHeaderCell>
              <TableHeaderCell>Actions</TableHeaderCell>
            </TableRow>
          </TableHeader>
          <TableBody>
            {content.map((game) => (
              <Fragment key={game.gameId}>
                <TableRow>
                  <TableCell>
                    <Stack direction="horizontal" gap={2} wrap="wrap">
                      <Link href={`/games/${game.gameId}`} hasUnderline>
                        {game.title}
                      </Link>
                      <BadgeLabel badge={game.badge} />
                    </Stack>
                  </TableCell>
                  <TableCell>{game.authorUsername}</TableCell>
                  <TableCell>
                    {game.minPlayers === game.maxPlayers
                      ? String(game.minPlayers)
                      : `${String(game.minPlayers)}–${String(game.maxPlayers)}`}
                  </TableCell>
                  <TableCell>{game.supportsAi ? "Yes" : "No"}</TableCell>
                  <TableCell>{game.supportsSpectators ? "Yes" : "No"}</TableCell>
                  <TableCell>{game.version}</TableCell>
                  <TableCell>{formatDate(game.createdAt)}</TableCell>
                  <TableCell>{formatDate(game.updatedAt)}</TableCell>
                  <TableCell>
                    {/* Wraps rather than overflows: the cell clips what spills out of it (CA-04). */}
                    <Stack direction="horizontal" gap={2} wrap="wrap">
                      <Button
                        label={expanded === game.gameId ? "Hide description" : "Show description"}
                        variant="ghost"
                        aria-expanded={expanded === game.gameId}
                        onClick={() => {
                          onToggle(game.gameId);
                        }}
                      />
                      <CreateRoomButton
                        gameId={game.gameId}
                        supportsSpectators={game.supportsSpectators}
                      />
                    </Stack>
                  </TableCell>
                </TableRow>
                {expanded === game.gameId && (
                  <TableRow>
                    <TableCell colSpan={9}>
                      {/* Plain text: the catalog row's short description is never markup. */}
                      <Text>{game.shortDescription}</Text>
                    </TableCell>
                  </TableRow>
                )}
              </Fragment>
            ))}
          </TableBody>
        </Table>
      </div>
      {pagination.totalPages > 1 && (
        <Pagination
          variant="input"
          label="Catalog pages"
          page={pagination.page}
          totalPages={pagination.totalPages}
          pageSize={pagination.size}
          onChange={onPage}
        />
      )}
    </Stack>
  );
}
