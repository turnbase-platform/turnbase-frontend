import { apiFetch } from "../../shared/api";
import type { AccountResponse, PrivacySettings } from "./settings-types";

/** `rest-conventions.md` § Authentication. */
export function fetchAccount(): Promise<AccountResponse> {
  return apiFetch<AccountResponse>("/api/users/me");
}

/** `200` carries the identity only, not {@link AccountResponse}; read `GET /api/users/me` after it. */
export function updateAccount(
  fields: Partial<{ username: string; email: string; currentPassword: string }>,
): Promise<unknown> {
  return apiFetch<unknown>("/api/users/me", { method: "PATCH", body: fields });
}

export interface ChangePasswordBody {
  currentPassword: string;
  newPassword: string;
  confirmNewPassword: string;
}

export function changePassword(body: ChangePasswordBody): Promise<undefined> {
  return apiFetch<undefined>("/api/users/me/password", { method: "POST", body });
}

export function updatePrivacy(fields: Partial<PrivacySettings>): Promise<PrivacySettings> {
  return apiFetch<PrivacySettings>("/api/users/me/privacy", { method: "PATCH", body: fields });
}

export function addPasswordMethod(password: string, confirmPassword: string): Promise<undefined> {
  return apiFetch<undefined>("/api/users/me/auth-methods/password", {
    method: "POST",
    body: { password, confirmPassword },
  });
}

export function completeGoogleLink(): Promise<{ authMethods: AccountResponse["authMethods"] }> {
  return apiFetch<{ authMethods: AccountResponse["authMethods"] }>(
    "/api/users/me/auth-methods/google",
    { method: "POST" },
  );
}

export function removeAuthMethod(method: "PASSWORD" | "GOOGLE"): Promise<undefined> {
  return apiFetch<undefined>(`/api/users/me/auth-methods/${method}`, { method: "DELETE" });
}

/** `currentPassword` is required when the account has a password method (`IMP-GATE-99`). */
export function deleteAccount(currentPassword?: string): Promise<undefined> {
  return apiFetch<undefined>("/api/users/me", {
    method: "DELETE",
    ...(currentPassword === undefined ? {} : { body: { currentPassword } }),
  });
}
