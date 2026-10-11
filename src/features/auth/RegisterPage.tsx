import { RegisterView } from "./RegisterView";
import { useRegisterForm } from "./useRegisterForm";

export function RegisterPage() {
  return <RegisterView form={useRegisterForm()} />;
}
