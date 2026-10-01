import { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Heading } from "@astryxdesign/core/Heading";
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
import { useToast } from "@astryxdesign/core/Toast";
import { joinRoom, listRooms, type ListRoomsParams } from "./roomsApi";
import type { RoomListEnvelope, RoomListRow } from "./rooms-types";

const PAGE_SIZE = 25;

const SORT_LABELS: Record<string, string> = {
  createdAt: "Newest",
  gameName: "Game",
  playerCount: "Players now",
  minPlayers: "Min players",
  maxPlayers: "Max players",
  status: "Status",
};

const SORT_OPTIONS = Object.entries(SORT_LABELS).flatMap(([field, label]) => [
  { value: `${field},asc`, label: `${label} (ascending)` },
  { value: `${field},desc`, label: `${label} (descending)` },
]);

const STATUS_OPTIONS = [
  { value: "ALL", label: "Any status" },
  { value: "LOBBY", label: "Lobby" },
  { value: "IN_PROGRESS", label: "In progress" },
];

type LoadState =
  { status: "loading" } | { status: "loaded"; result: RoomListEnvelope } | { status: "error" };

/** VW-ROOMS-001…004. Filtering, sorting and paging are server round trips. */
export function RoomsPage() {
  const navigate = useNavigate();
  const showToast = useToast();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("ALL");
  const [sort, setSort] = useState("createdAt,desc"); // room-rest-api.md §3 default
  const [page, setPage] = useState(1);
  const [reload, setReload] = useState(0);
  const [state, setState] = useState<LoadState>({ status: "loading" });
  const [joining, setJoining] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const params: ListRoomsParams = {
      search: search.length > 0 ? search : undefined,
      status: status === "ALL" ? undefined : [status as "LOBBY" | "IN_PROGRESS"],
      sort,
      page,
      size: PAGE_SIZE,
    };
    listRooms(params)
      .then((result) => {
        if (!cancelled) setState({ status: "loaded", result });
      })
      .catch(() => {
        if (!cancelled) setState({ status: "error" });
      });
    return () => {
      cancelled = true;
    };
  }, [search, status, sort, page, reload]);

  const join = useCallback(
    (row: RoomListRow, role: "PLAYER" | "SPECTATOR") => {
      setJoining(row.roomId);
      joinRoom(row.roomId, role)
        .then(({ result }) => navigate(`/rooms/${result.room.roomId}`))
        .catch((failure: unknown) => {
          // The flags are advisory (FR-LIST-003a): the room may have filled since the list loaded.
          showToast({
            type: "error",
            body: failure instanceof Error ? failure.message : "Could not join the room.",
          });
          setJoining(null);
          setReload((n) => n + 1);
        });
    },
    [navigate, showToast],
  );

  return (
    <Stack gap={4} padding={6}>
      <Heading level={1}>Active rooms</Heading>
      <Stack direction="horizontal" gap={3}>
        <TextInput
          label="Search rooms"
          placeholder="Game or host"
          value={search}
          onChange={(value) => {
            setSearch(value);
            setPage(1);
          }}
        />
        <Selector
          label="Status"
          options={STATUS_OPTIONS}
          value={status}
          onChange={(value) => {
            setStatus(value);
            setPage(1);
          }}
        />
        <Selector
          label="Sort by"
          options={SORT_OPTIONS}
          value={sort}
          onChange={(value) => {
            setSort(value);
            setPage(1);
          }}
        />
        <Button
          label="Refresh"
          variant="secondary"
          onClick={() => {
            setReload((n) => n + 1);
          }}
        />
      </Stack>
      {state.status === "loaded" && state.result.reservedSlot && (
        <Banner
          status="info"
          collapsible={false}
          title={`You were disconnected from ${state.result.reservedSlot.gameName}. Your slot is held for ${String(state.result.reservedSlot.graceRemainingSeconds)} more seconds.`}
        >
          <Button
            label="Rejoin"
            variant="primary"
            onClick={() => {
              if (state.result.reservedSlot) {
                void navigate(`/rooms/${state.result.reservedSlot.roomId}`);
              }
            }}
          />
        </Banner>
      )}
      {state.status === "loading" && <Text>Loading…</Text>}
      {state.status === "error" && (
        <Banner status="error" title="Could not load the rooms. Please try again." />
      )}
      {state.status === "loaded" &&
        (state.result.content.length === 0 ? (
          <EmptyState title="No rooms to join right now" />
        ) : (
          <Stack gap={3}>
            <Table dividers="rows">
              <TableHeader>
                <TableRow isHeaderRow>
                  <TableHeaderCell>Game</TableHeaderCell>
                  <TableHeaderCell>Host</TableHeaderCell>
                  <TableHeaderCell>Status</TableHeaderCell>
                  <TableHeaderCell>Players</TableHeaderCell>
                  <TableHeaderCell>Spectators</TableHeaderCell>
                  <TableHeaderCell>Actions</TableHeaderCell>
                </TableRow>
              </TableHeader>
              <TableBody>
                {state.result.content.map((row) => (
                  <TableRow key={row.roomId}>
                    <TableCell>{row.gameName}</TableCell>
                    <TableCell>{row.hostUsername}</TableCell>
                    <TableCell>{row.state === "LOBBY" ? "Lobby" : "In progress"}</TableCell>
                    <TableCell>{`${String(row.playerCount)} / ${String(row.playerCapacity)}`}</TableCell>
                    <TableCell>
                      {row.spectatingSupported ? String(row.spectatorCount) : "—"}
                    </TableCell>
                    <TableCell>
                      <Stack direction="horizontal" gap={2}>
                        {row.canJoin && (
                          <Button
                            label="Join"
                            variant="primary"
                            aria-label={`Join ${row.gameName} hosted by ${row.hostUsername}`}
                            isLoading={joining === row.roomId}
                            onClick={() => {
                              join(row, "PLAYER");
                            }}
                          />
                        )}
                        {row.canSpectate && (
                          <Button
                            label="Spectate"
                            variant="secondary"
                            aria-label={`Spectate ${row.gameName} hosted by ${row.hostUsername}`}
                            isLoading={joining === row.roomId}
                            onClick={() => {
                              join(row, "SPECTATOR");
                            }}
                          />
                        )}
                      </Stack>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            {state.result.pagination.totalPages > 1 && (
              <Pagination
                variant="input"
                label="Room pages"
                page={state.result.pagination.page}
                totalPages={state.result.pagination.totalPages}
                pageSize={state.result.pagination.size}
                onChange={setPage}
              />
            )}
          </Stack>
        ))}
    </Stack>
  );
}
