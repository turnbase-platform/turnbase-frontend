import type { GameStartFailureReason, GameStartPhase, GameStartStatus } from "./rooms-types";

/** `START_GAME` is still being worked on: the lobby shows progress and offers no second Start. */
export function isStartInProgress(status: GameStartStatus | null): boolean {
  return status !== null && status.phase !== "FAILED";
}

/** One line per phase — what is happening and, where it is slow, why that is normal. */
export const START_PHASE_TEXT: Record<Exclude<GameStartPhase, "FAILED">, string> = {
  STARTING: "Starting the game…",
  WAITING_FOR_HOST:
    "Waiting for a game server to come online. This can take up to a minute right after the platform has started.",
  LOADING_GAME:
    "Loading the game on the game server. The first game after a server start takes a few seconds longer.",
  RETRYING: "The game server did not answer. Trying again…",
};

/** What went wrong and what to do about it, per failure reason. */
export const START_FAILURE_TEXT: Record<GameStartFailureReason, string> = {
  NO_HOST_AVAILABLE:
    "No game server is available right now. It may still be starting — try again in a minute.",
  HOST_UNRESPONSIVE:
    "The game server did not respond and has been set aside. Try again in a minute.",
  SESSION_CREATION_FAILED: "The game could not be set up. Try again.",
};

export function describeStartFailure(reason: GameStartFailureReason | undefined): string {
  return reason ? START_FAILURE_TEXT[reason] : "The game could not be started. Try again.";
}
