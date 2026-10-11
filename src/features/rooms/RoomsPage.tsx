import { useState } from "react";
import { RoomsView } from "./RoomsView";
import { useRooms } from "./useRooms";

/** VW-ROOMS-001…005: the hook's data in the list-page view. */
export function RoomsPage() {
  const rooms = useRooms();
  const [filtersOpen, setFiltersOpen] = useState(false);
  return (
    <RoomsView
      rooms={rooms}
      filtersOpen={filtersOpen}
      onToggleFilters={() => {
        setFiltersOpen((open) => !open);
      }}
    />
  );
}
