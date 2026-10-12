import { Banner } from "@astryxdesign/core/Banner";
import { Button } from "@astryxdesign/core/Button";
import { Text } from "@astryxdesign/core/Text";
import { NotFoundPage } from "../../app/pages/NotFoundPage";
import { LoadError } from "../../shared/LoadError";
import type { Principal } from "../auth/auth-context";
import { RelationshipAction } from "./RelationshipAction";
import { ProfileBody } from "./ProfileBody";
import { ProfileHead } from "./ProfileHead";
import type { Profile } from "./useProfile";
import styles from "./ProfileView.module.css";

/** VW-PROF-001…008 / FR-PROF-001…008, FR-ACCT-009…010, FR-GUEST-010. */
export function ProfileView({
  username,
  profile,
  viewer,
}: {
  username: string;
  profile: Profile;
  viewer: Principal | null;
}) {
  const { state } = profile;

  if (state.status === "loading") {
    return (
      <div className={styles.page}>
        <Text>Loading…</Text>
      </div>
    );
  }
  if (state.status === "not-found") return <NotFoundPage />;
  if (state.status === "error") {
    return (
      <div className={styles.page}>
        <ProfileHead username={username} />
        <LoadError message="Could not load this profile." onRetry={profile.retry} />
      </div>
    );
  }

  const { profile: loaded } = state;

  // FR-ACCT-009: the soft-deleted placeholder — no other information shown.
  if (loaded.deleted) {
    return (
      <div className={styles.page}>
        <ProfileHead username={loaded.username} />
        <Text>This account no longer exists.</Text>
      </div>
    );
  }

  // FR-GUEST-010 / FR-PROF-002: a guest profile shows only the username, to anyone.
  if (loaded.kind !== "REGISTERED") {
    return (
      <div className={styles.page}>
        <ProfileHead username={loaded.username} />
      </div>
    );
  }

  const isOwner = viewer?.username === loaded.username;
  const sections = loaded.visibleSections ?? [];
  // FR-PROF-007 exempts the owner: the server only ever sends an empty `visibleSections` for a
  // private profile to a non-owner viewer, so an empty array here can only be that case.
  const isPrivateToViewer = loaded.profilePrivate === true && sections.length === 0;

  return (
    <div className={styles.page}>
      <ProfileHead username={loaded.username} relationship={loaded.relationshipState}>
        {isOwner && <Button label="Edit profile" variant="secondary" href="/settings" />}
        {/* VW-PROF-006/007: friend actions are Registered-only. The server also sends a Guest
            viewer a `relationshipState`, so the viewer's kind is checked here, not inferred. */}
        {!isOwner && viewer?.kind === "REGISTERED" && loaded.relationshipState && (
          <RelationshipAction profile={loaded} />
        )}
      </ProfileHead>
      {isPrivateToViewer ? (
        <Banner status="info" title="This profile is private." />
      ) : (
        <ProfileBody username={loaded.username} sections={sections} />
      )}
    </div>
  );
}
