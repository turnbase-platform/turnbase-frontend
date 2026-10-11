import { useParams } from "react-router";
import { useAuth } from "../auth/auth-context";
import { ProfileView } from "./ProfileView";
import { useProfile } from "./useProfile";

/** `/users/:username` — the profile (`useProfile`) in its view. */
export function ProfilePage() {
  const { username = "" } = useParams();
  // Keyed by username so navigating between profiles remounts this with fresh "loading" state
  // instead of resetting it inside an effect.
  return <ProfileForUsername key={username} username={username} />;
}

function ProfileForUsername({ username }: { username: string }) {
  const { principal } = useAuth();
  return <ProfileView username={username} profile={useProfile(username)} viewer={principal} />;
}
