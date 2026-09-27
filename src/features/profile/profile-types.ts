/** `profile-rest-api.md` §2: the sections a viewer may see, per `visibleSections`. */
export type ProfileSection = "gameHistory" | "statistics" | "friends" | "uploadedGames";

/** `profile-rest-api.md` §2.4 / `social-rest-api.md` §9. */
export type RelationshipState = "NONE" | "FRIENDS" | "REQUEST_SENT" | "REQUEST_RECEIVED";

/** `profile-rest-api.md` §2 — one envelope shape, fields present vary by case. */
export interface ProfileResponse {
  username: string;
  userId?: string;
  deleted?: true;
  kind?: "REGISTERED";
  profilePrivate?: boolean;
  visibleSections?: ProfileSection[];
  relationshipState?: RelationshipState;
}
