import { SegmentedControl, SegmentedControlItem } from "@astryxdesign/core/SegmentedControl";
import { Stack } from "@astryxdesign/core/Stack";
import { Switch } from "@astryxdesign/core/Switch";
import { Text } from "@astryxdesign/core/Text";
import type { Privacy } from "./usePrivacy";

type Visibility = "PUBLIC" | "FRIENDS_ONLY" | "HIDDEN";
type VisibilityField =
  "historyVisibility" | "statsVisibility" | "gamesVisibility" | "friendsVisibility";

const PUBLIC_OR_HIDDEN: readonly Visibility[] = ["PUBLIC", "HIDDEN"];
const WITH_FRIENDS: readonly Visibility[] = ["PUBLIC", "FRIENDS_ONLY", "HIDDEN"];
const LABELS: Record<Visibility, string> = {
  PUBLIC: "Public",
  FRIENDS_ONLY: "Friends only",
  HIDDEN: "Hidden",
};

/** VW-SET-006a: each profile section is named on screen beside its own control. */
const SECTIONS: readonly {
  field: VisibilityField;
  title: string;
  options: readonly Visibility[];
}[] = [
  { field: "historyVisibility", title: "Game history", options: PUBLIC_OR_HIDDEN },
  { field: "statsVisibility", title: "Statistics", options: PUBLIC_OR_HIDDEN },
  { field: "gamesVisibility", title: "Uploaded games", options: PUBLIC_OR_HIDDEN },
  { field: "friendsVisibility", title: "Friends list", options: WITH_FRIENDS },
];

export function PrivacyView({ privacy: state }: { privacy: Privacy }) {
  const { privacy, isBusy, save } = state;
  return (
    <Stack gap={3}>
      <Switch
        label="Make my profile private"
        description="A private profile hides every section from everyone but you."
        value={privacy.profilePrivate}
        isLoading={isBusy}
        changeAction={(checked) => {
          save({ profilePrivate: checked });
        }}
      />
      {!privacy.profilePrivate &&
        SECTIONS.map(({ field, title, options }) => (
          <Stack key={field} gap={1}>
            <Text>{title}</Text>
            <SegmentedControl
              label={`${title} visibility`}
              value={privacy[field]}
              onChange={(value) => {
                save({ [field]: value });
              }}
            >
              {options.map((option) => (
                <SegmentedControlItem key={option} value={option} label={LABELS[option]} />
              ))}
            </SegmentedControl>
          </Stack>
        ))}
      <Switch
        label="Block friend requests"
        value={privacy.blockFriendRequests}
        isLoading={isBusy}
        changeAction={(checked) => {
          save({ blockFriendRequests: checked });
        }}
      />
    </Stack>
  );
}
