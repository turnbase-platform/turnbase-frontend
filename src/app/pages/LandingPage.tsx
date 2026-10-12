import { GuestButton } from "../../features/auth/GuestButton";
import { AppearanceControl } from "../AppearanceControl";
import { LandingView } from "./LandingView";
import { useLandingPage } from "./useLandingPage";

export function LandingPage() {
  const { showActions, openTour } = useLandingPage();
  return (
    <LandingView
      showActions={showActions}
      guest={<GuestButton variant="primary" size="lg" />}
      appearance={<AppearanceControl />}
      onTour={openTour}
    />
  );
}
