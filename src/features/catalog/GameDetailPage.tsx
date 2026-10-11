import { useParams } from "react-router";
import { GameDetailView } from "./GameDetailView";
import { useGameDetail } from "./useGameDetail";

/** VW-GDET-001…003 / FR-GDET-001…009. */
export function GameDetailPage() {
  const { id = "" } = useParams();
  // Keyed so navigating between games remounts with fresh "loading" state.
  return <GameDetailFor key={id} gameId={id} />;
}

function GameDetailFor({ gameId }: { gameId: string }) {
  return <GameDetailView state={useGameDetail(gameId)} />;
}
