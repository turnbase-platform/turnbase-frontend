import { GuestButton } from "../../features/auth/GuestButton";
import { LandingView } from "./LandingView";
import { useLandingPage } from "./useLandingPage";

export function LandingPage() {
  const { showActions } = useLandingPage();
  return <LandingView showActions={showActions} guest={<GuestButton size="lg" />} />;
}
