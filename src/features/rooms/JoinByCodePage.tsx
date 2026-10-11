import { useParams } from "react-router";
import { JoinByCodeView } from "./JoinByCodeView";
import { useJoinByCode } from "./useJoinByCode";

/** VW-JOIN-001…003 / FR-JOIN-003…006: the hook's state in the invite screen. */
export function JoinByCodePage() {
  const { code = "" } = useParams();
  const { state, enter } = useJoinByCode(code);
  return <JoinByCodeView state={state} onEnter={enter} />;
}
