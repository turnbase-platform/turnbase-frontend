// Test-only: a fixed account and the mocks every settings hook test shares.
import type { AccountResponse } from "./settings-types";

export const ACCOUNT: AccountResponse = {
  userId: "u-1",
  username: "alice",
  email: "alice@example.com",
  emailSource: "SELF",
  usernameChangeableAt: null,
  emailChangeableAt: null,
  authMethods: ["PASSWORD"],
  privacy: {
    profilePrivate: false,
    historyVisibility: "PUBLIC",
    statsVisibility: "PUBLIC",
    gamesVisibility: "PUBLIC",
    friendsVisibility: "PUBLIC",
    blockFriendRequests: false,
  },
};
