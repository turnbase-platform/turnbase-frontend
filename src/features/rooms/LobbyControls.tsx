import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Text } from "@astryxdesign/core/Text";
import { ICopy, IPlay } from "../../ui";
import { InviteFriendsButton } from "./InviteFriendsButton";
import styles from "./LobbyControls.module.css";

/**
 * The lobby's top card. The host sees the invite code, the ways to share it and Start game, with
 * the reasons the game cannot start yet (FR-TEAM-009); everyone else sees that the host decides.
 */
export function LobbyControls({
  roomId,
  inviteCode,
  unmet,
  starting = false,
  onShareInvite,
  onStart,
}: {
  roomId: string;
  /** Present only for the host (`room-rest-api.md` §4). */
  inviteCode?: string;
  /** Why the game cannot start; `null` when the viewer is not the host. */
  unmet: string[] | null;
  /** A `START_GAME` is in progress — a second one would only queue behind it. */
  starting?: boolean;
  onShareInvite: () => void;
  onStart: () => void;
}) {
  if (unmet === null)
    return (
      <Card padding={5} elevation="med">
        <Text color="secondary">
          {starting ? "The host has started the game." : "Waiting for the host to start the game."}
        </Text>
      </Card>
    );
  return (
    <Card padding={5} elevation="med">
      <div className={styles.controls}>
        <div className={styles.top}>
          {inviteCode && (
            <div>
              <Text type="supporting" color="secondary">
                Room code
              </Text>
              <div className={styles.code}>{inviteCode}</div>
            </div>
          )}
          <div className={styles.buttons}>
            {inviteCode && (
              <Button
                label="Copy link"
                variant="secondary"
                icon={<ICopy />}
                onClick={onShareInvite}
              />
            )}
            <InviteFriendsButton roomId={roomId} />
            <Button
              label="Start game"
              variant="primary"
              icon={<IPlay />}
              isDisabled={unmet.length > 0 || starting}
              onClick={onStart}
            />
          </div>
        </div>
        {unmet.length > 0 && (
          <ul aria-label="Why the game cannot start yet" className={styles.unmet}>
            {unmet.map((reason) => (
              <li key={reason}>
                <Text type="supporting" color="secondary">
                  {reason}
                </Text>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
