import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { useToast } from "@astryxdesign/core/Toast";
import { denialMessage } from "../../shared/api";
import { formatSort, parseSort } from "../../ui";
import { joinRoom, listRooms, type ListRoomsParams } from "./roomsApi";
import type { RoomListEnvelope, RoomListRow } from "./rooms-types";

export const PAGE_SIZE = 25;

/**
 * `room-rest-api.md` §3: `sort` accepts exactly five fields. `createdAt` is the server's default
 * when `sort` is omitted — it is not an accepted value, so asking for it by name is a 400. The
 * default is therefore a sixth, client-only choice that sends no `sort` at all.
 */
export const NEWEST = "newest";

export type RoomStatusFilter = "ALL" | "LOBBY" | "IN_PROGRESS";

export type RoomsState =
  { status: "loading" } | { status: "loaded"; result: RoomListEnvelope } | { status: "error" };

/**
 * VW-ROOMS-001…005. Owns the query, the reload counter and the join in flight; every filter, sort
 * and page is a server round trip (FR-LIST-005: the list is never polled).
 */
export function useRooms() {
  const navigate = useNavigate();
  const showToast = useToast();
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<RoomStatusFilter>("ALL");
  const [sort, setSort] = useState(formatSort(NEWEST, "desc"));
  const [page, setPage] = useState(1);
  const [size, setSize] = useState(PAGE_SIZE);
  const [reload, setReload] = useState(0);
  const [state, setState] = useState<RoomsState>({ status: "loading" });
  const [joining, setJoining] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    const { field } = parseSort(sort);
    const params: ListRoomsParams = {
      search: search.length > 0 ? search : undefined,
      status: status === "ALL" ? undefined : [status],
      sort: field === NEWEST ? undefined : sort,
      page,
      size,
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
  }, [search, status, sort, page, size, reload]);

  // VW-ROOMS-005: the card goes away when the slot is released. Refresh once, just after the grace
  // period the server reported has run out.
  const graceSeconds =
    state.status === "loaded" ? (state.result.reservedSlot?.graceRemainingSeconds ?? null) : null;
  useEffect(() => {
    if (graceSeconds === null) return;
    const timer = setTimeout(
      () => {
        setReload((n) => n + 1);
      },
      (graceSeconds + 1) * 1000,
    );
    return () => {
      clearTimeout(timer);
    };
  }, [graceSeconds, reload]);

  // A changed filter restarts at page 1: the old page number means nothing for a new result set.
  function refine<T>(set: (value: T) => void) {
    return (value: T) => {
      set(value);
      setPage(1);
    };
  }

  const filterCount = status === "ALL" ? 0 : 1;

  return {
    state,
    search,
    status,
    sort,
    page,
    size,
    joining,
    /** Filters in the panel; the search box is not one of them. */
    filterCount,
    /** Everything that narrows the list, the search included. */
    appliedCount: filterCount + (search ? 1 : 0),
    setSearch: refine(setSearch),
    setStatus: refine(setStatus),
    setSort: refine(setSort),
    setSize: refine(setSize),
    setPage,
    clearFilters: () => {
      setSearch("");
      setStatus("ALL");
      setPage(1);
    },
    refresh: () => {
      setState((current) => (current.status === "error" ? { status: "loading" } : current));
      setReload((n) => n + 1);
    },
    join: (row: RoomListRow, role: "PLAYER" | "SPECTATOR") => {
      setJoining(row.roomId);
      joinRoom(row.roomId, role)
        .then(({ result }) => navigate(`/rooms/${result.room.roomId}`))
        .catch((failure: unknown) => {
          // The flags are advisory (FR-LIST-003a): the room may have filled since the list loaded.
          showToast({ type: "error", body: denialMessage(failure, "Could not join the room.") });
          setJoining(null);
          setReload((n) => n + 1);
        });
    },
    joinByCode: (code: string) => {
      void navigate(`/rooms/join/${encodeURIComponent(code)}`);
    },
    rejoin: (roomId: string) => {
      void navigate(`/rooms/${roomId}`);
    },
  };
}

export type Rooms = ReturnType<typeof useRooms>;
