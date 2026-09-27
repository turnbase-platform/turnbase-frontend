/** `rest-conventions.md` § Authentication — *The account representation*. */
export interface AccountResponse {
  userId: string;
  username: string;
  email: string;
  emailSource: "SELF" | "OAUTH";
  usernameChangeableAt: string | null;
  emailChangeableAt: string | null;
  authMethods: ("PASSWORD" | "GOOGLE")[];
  privacy: PrivacySettings;
}

/** `data-model-accounts.md` §4 — the `user_privacy_settings` value set. */
export interface PrivacySettings {
  profilePrivate: boolean;
  historyVisibility: "PUBLIC" | "HIDDEN";
  statsVisibility: "PUBLIC" | "HIDDEN";
  gamesVisibility: "PUBLIC" | "HIDDEN";
  friendsVisibility: "PUBLIC" | "FRIENDS_ONLY" | "HIDDEN";
  blockFriendRequests: boolean;
}
