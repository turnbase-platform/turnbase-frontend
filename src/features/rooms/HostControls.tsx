import { Button } from "@astryxdesign/core/Button";
import { ICrown, IX } from "../../ui";

/** The host's two commands on another participant; spectators cannot be handed the room. */
export function HostControls({
  name,
  onTransfer,
  onKick,
}: {
  name: string;
  onTransfer?: () => void;
  onKick: () => void;
}) {
  return (
    <>
      {onTransfer && (
        <Button
          size="sm"
          variant="ghost"
          isIconOnly
          icon={<ICrown size={14} />}
          label={`Transfer host to ${name}`}
          onClick={onTransfer}
        />
      )}
      <Button
        size="sm"
        variant="ghost"
        isIconOnly
        icon={<IX size={14} />}
        label={`Kick ${name}`}
        onClick={onKick}
      />
    </>
  );
}
