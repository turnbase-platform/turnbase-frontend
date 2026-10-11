import { useState } from "react";
import { useToast } from "@astryxdesign/core/Toast";
import { ApiError } from "../../shared/api";
import { removeFriend, sendFriendRequest } from "../friends/friendsApi";
import type { ProfileResponse, RelationshipState } from "./profile-types";

/**
 * VW-PROF-006/007: the viewer's friend actions on someone else's profile. The state starts from
 * the profile's `relationshipState` and moves with what the server answers.
 */
export function useRelationship(profile: ProfileResponse) {
  const [state, setState] = useState<RelationshipState | undefined>(profile.relationshipState);
  const [isBusy, setIsBusy] = useState(false);
  const showToast = useToast();

  function fail(action: string) {
    showToast({ type: "error", body: `Could not ${action}. Please try again.` });
    setIsBusy(false);
  }

  return {
    state,
    isBusy,
    add: () => {
      setIsBusy(true);
      sendFriendRequest(profile.username)
        .then((result) => {
          setState(result.outcome === "FRIENDS" ? "FRIENDS" : "REQUEST_SENT");
          setIsBusy(false);
        })
        .catch((error: unknown) => {
          // FR-SOC-021 / social-rest-api.md §3: a refused send is `422` with a generic detail.
          // Say so rather than "try again" — retrying will not change the answer.
          if (error instanceof ApiError && error.status === 422) {
            showToast({
              type: "error",
              body: error.problem.detail ?? "This friend request could not be sent.",
            });
            setIsBusy(false);
            return;
          }
          fail("send the friend request");
        });
    },
    remove: () => {
      if (!profile.userId) return;
      setIsBusy(true);
      removeFriend(profile.userId)
        .then(() => {
          setState("NONE");
          setIsBusy(false);
        })
        .catch(() => {
          fail("remove this friend");
        });
    },
  };
}

export type Relationship = ReturnType<typeof useRelationship>;
