import { RelationshipView } from "./RelationshipView";
import type { ProfileResponse } from "./profile-types";
import { useRelationship } from "./useRelationship";

/** The viewer's friend action on a profile: `useRelationship` in its view. */
export function RelationshipAction({ profile }: { profile: ProfileResponse }) {
  return <RelationshipView relationship={useRelationship(profile)} />;
}
