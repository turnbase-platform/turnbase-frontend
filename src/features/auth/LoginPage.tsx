import { LoginView } from "./LoginView";
import { useLoginForm } from "./useLoginForm";

export function LoginPage() {
  return <LoginView form={useLoginForm()} />;
}
