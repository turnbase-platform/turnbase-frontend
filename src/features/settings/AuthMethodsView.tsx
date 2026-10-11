import { Button } from "@astryxdesign/core/Button";
import { List, ListItem } from "@astryxdesign/core/List";
import { Stack } from "@astryxdesign/core/Stack";
import { VisuallyHidden } from "@astryxdesign/core/VisuallyHidden";
import type { AuthMethods } from "./useAuthMethods";

const NAMES = { PASSWORD: "Password", GOOGLE: "Google" } as const;

export function AuthMethodsView({ auth }: { auth: AuthMethods }) {
  return (
    <Stack gap={3}>
      <List header={<VisuallyHidden>Sign-in methods</VisuallyHidden>} hasDividers>
        {auth.methods.map((method) => (
          <ListItem
            key={method}
            label={NAMES[method]}
            endContent={
              auth.canRemove ? (
                <Button
                  label="Remove"
                  aria-label={`Remove ${NAMES[method]}`}
                  variant="ghost"
                  isLoading={auth.isBusy}
                  onClick={() => {
                    auth.remove(method);
                  }}
                />
              ) : undefined
            }
          />
        ))}
      </List>
      {auth.canLinkGoogle && (
        <Button
          as="a"
          href="/auth/google?intent=link"
          label="Link Google account"
          variant="secondary"
        />
      )}
    </Stack>
  );
}
