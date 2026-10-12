import { useState } from "react";
import { Pane, PillTabs } from "../../ui";
import { HistorySection } from "../history/HistorySection";
import { FriendsSection, UploadedGamesSection } from "./ProfileSections";
import { StatisticsSection } from "./StatisticsSection";
import type { ProfileSection } from "./profile-types";
import styles from "./ProfileBody.module.css";

const TABS: readonly { section: ProfileSection; label: string }[] = [
  { section: "statistics", label: "Stats" },
  { section: "gameHistory", label: "History" },
  { section: "friends", label: "Friends" },
  { section: "uploadedGames", label: "Uploaded games" },
];

const PANEL = "profile-panel";

/** The sections the viewer may see, one tab each, one panel on screen at a time (VW-PROF-003). */
export function ProfileBody({
  username,
  sections,
}: {
  username: string;
  sections: readonly ProfileSection[];
}) {
  const tabs = TABS.filter((t) => sections.includes(t.section));
  const [selected, setSelected] = useState<ProfileSection | null>(null);
  const current = tabs.find((t) => t.section === selected) ?? tabs.at(0);
  if (!current) return null;
  return (
    <div className={styles.body}>
      <PillTabs
        block
        label="Profile sections"
        value={current.section}
        items={tabs.map((t) => ({ value: t.section, label: t.label }))}
        panelId={PANEL}
        onChange={(value) => {
          setSelected(value as ProfileSection);
        }}
      />
      <div id={PANEL} role="tabpanel" aria-label={current.label}>
        <Pane id={current.section}>
          {current.section === "statistics" && <StatisticsSection username={username} />}
          {current.section === "gameHistory" && <HistorySection username={username} />}
          {current.section === "friends" && <FriendsSection username={username} />}
          {current.section === "uploadedGames" && <UploadedGamesSection username={username} />}
        </Pane>
      </div>
    </div>
  );
}
