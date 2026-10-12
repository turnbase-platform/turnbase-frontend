import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { EmptyState } from "@astryxdesign/core/EmptyState";
import { Selector } from "@astryxdesign/core/Selector";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import {
  FilterButton,
  FilterPanel,
  IPlus,
  IRefresh,
  ISearch,
  ListPage,
  PageBar,
  ScrollPanel,
  SortControl,
} from "../../ui";
import { NEWEST, type RoomStatusFilter, type Rooms } from "./useRooms";
import { JoinCodePanel } from "./JoinCodePanel";
import { RoomRow } from "./RoomRow";
import styles from "./RoomsView.module.css";

// `room-rest-api.md` §3: the server's whitelist, plus the client-only default that sends none.
const SORT_LABELS: Record<string, string> = {
  [NEWEST]: "Newest",
  gameName: "Game",
  playerCount: "Players now",
  minPlayers: "Min players",
  maxPlayers: "Max players",
  status: "Status",
};

const STATUS_OPTIONS: { value: RoomStatusFilter; label: string }[] = [
  { value: "ALL", label: "Any status" },
  { value: "LOBBY", label: "Lobby" },
  { value: "IN_PROGRESS", label: "In progress" },
];

const PAGE_SIZES = [10, 25, 50, 100] as const;

/** VW-ROOMS-001…005: the active rooms as a list page. It renders what `useRooms` hands it. */
export function RoomsView({
  rooms,
  filtersOpen,
  onToggleFilters,
}: {
  rooms: Rooms;
  filtersOpen: boolean;
  onToggleFilters: () => void;
}) {
  const { state } = rooms;
  const total = state.status === "loaded" ? state.result.pagination.totalElements : 0;
  return (
    <ListPage
      title="Rooms"
      subtitle="Join a room that is waiting for players, or watch one in progress."
      toolbar={
        <>
          <div className={styles.search}>
            <TextInput
              label="Search rooms"
              isLabelHidden
              placeholder="Game or host"
              startIcon={ISearch}
              hasClear
              value={rooms.search}
              onChange={rooms.setSearch}
            />
          </div>
          <FilterButton
            open={filtersOpen}
            count={rooms.filterCount}
            onClick={onToggleFilters}
            controls="rooms-filters"
          />
          <SortControl
            fields={SORT_LABELS}
            fixed={[NEWEST]}
            sort={rooms.sort}
            onChange={rooms.setSort}
          />
          <PageBar
            page={rooms.page}
            size={rooms.size}
            total={total}
            sizes={PAGE_SIZES}
            noun="rooms"
            onPage={rooms.setPage}
            onSize={rooms.setSize}
          />
        </>
      }
      actions={
        <>
          <Button label="Refresh" variant="secondary" icon={<IRefresh />} onClick={rooms.refresh} />
          <Button
            label="Create room"
            variant="primary"
            icon={<IPlus />}
            href="/games"
            width="100%"
          />
        </>
      }
      aside={<JoinCodePanel onSubmit={rooms.joinByCode} />}
    >
      {filtersOpen && (
        <FilterPanel id="rooms-filters" count={rooms.appliedCount} onClear={rooms.clearFilters}>
          <div className={styles.filters}>
            <Selector
              label="Status"
              options={STATUS_OPTIONS}
              value={rooms.status}
              onChange={(value) => {
                rooms.setStatus(value as RoomStatusFilter);
              }}
            />
          </div>
        </FilterPanel>
      )}
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
              if (state.result.reservedSlot) rooms.rejoin(state.result.reservedSlot.roomId);
            }}
          />
        </Banner>
      )}
      <ScrollPanel label="Rooms">
        <Rows rooms={rooms} />
      </ScrollPanel>
    </ListPage>
  );
}

function Rows({ rooms }: { rooms: Rooms }) {
  const { state } = rooms;
  if (state.status === "loading")
    return (
      <div className={styles.status}>
        <Text>Loading…</Text>
      </div>
    );
  if (state.status === "error")
    return (
      <Banner
        status="error"
        collapsible={false}
        title="Could not load the rooms. Please try again."
      >
        <Button label="Try again" variant="secondary" onClick={rooms.refresh} />
      </Banner>
    );

  const { content } = state.result;
  if (content.length === 0)
    return (
      <EmptyState
        title="No rooms to join right now"
        headingLevel={2}
        description="Make one from the Games page, or loosen a filter."
        actions={
          rooms.appliedCount > 0 ? (
            <Button label="Clear filters" variant="secondary" onClick={rooms.clearFilters} />
          ) : undefined
        }
      />
    );

  return (
    <ul className={styles.list} key={`${String(state.result.pagination.page)}|${rooms.sort}`}>
      {content.map((row, index) => (
        <RoomRow
          key={row.roomId}
          row={row}
          index={index}
          joining={rooms.joining === row.roomId}
          onJoin={rooms.join}
        />
      ))}
    </ul>
  );
}
