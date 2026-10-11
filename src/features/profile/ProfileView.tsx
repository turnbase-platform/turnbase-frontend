import type { ReactNode } from "react";
import { Avatar } from "@astryxdesign/core/Avatar";
import { Banner } from "@astryxdesign/core/Banner";
import { Heading } from "@astryxdesign/core/Heading";
import { Link } from "@astryxdesign/core/Link";
import { Text } from "@astryxdesign/core/Text";
import { NotFoundPage } from "../../app/pages/NotFoundPage";
import { LoadError } from "../../shared/LoadError";
import { HistorySection } from "../history/HistorySection";
import type { Principal } from "../auth/auth-context";
import { RelationshipAction } from "./RelationshipAction";
import { FriendsSection, UploadedGamesSection } from "./ProfileSections";
import { StatisticsSection } from "./StatisticsSection";
import type { Profile } from "./useProfile";
import styles from "./ProfileView.module.css";

/** One person's name above whatever else the page shows. */
function Header({ username, children }: { username: string; children?: ReactNode }) {
  return (
    <header className={styles.header}>
      <Avatar name={username} size="xl" tooltip={false} />
      <div className={styles.name}>
        <Heading level={1} type="display-2">
          {username}
        </Heading>
      </div>
      {children && <div className={styles.actions}>{children}</div>}
    </header>
  );
}

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
        <Header username={username} />
        <LoadError message="Could not load this profile." onRetry={profile.retry} />
      </div>
    );
  }

  const { profile: loaded } = state;

  // FR-ACCT-009: the soft-deleted placeholder — no other information shown.
  if (loaded.deleted) {
    return (
      <div className={styles.page}>
        <Header username={loaded.username} />
        <Text>This account no longer exists.</Text>
      </div>
    );
  }

  // FR-GUEST-010 / FR-PROF-002: a guest profile shows only the username, to anyone.
  if (loaded.kind !== "REGISTERED") {
    return (
      <div className={styles.page}>
        <Header username={loaded.username} />
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
      <Header username={loaded.username}>
        {isOwner && <Link href="/settings">Edit profile</Link>}
        {/* VW-PROF-006/007: friend actions are Registered-only. The server also sends a Guest
            viewer a `relationshipState`, so the viewer's kind is checked here, not inferred. */}
        {!isOwner && viewer?.kind === "REGISTERED" && loaded.relationshipState && (
          <RelationshipAction profile={loaded} />
        )}
      </Header>
      {isPrivateToViewer ? (
        <Banner status="info" title="This profile is private." />
      ) : (
        <div className={styles.sections}>
          {sections.includes("statistics") && <StatisticsSection username={loaded.username} />}
          {sections.includes("gameHistory") && <HistorySection username={loaded.username} />}
          {sections.includes("friends") && <FriendsSection username={loaded.username} />}
          {sections.includes("uploadedGames") && (
            <UploadedGamesSection username={loaded.username} />
          )}
        </div>
      )}
    </div>
  );
}
