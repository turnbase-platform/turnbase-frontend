import { useState } from "react";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import { TextInput } from "@astryxdesign/core/TextInput";
import { ILink } from "../../ui";
import styles from "./JoinCodePanel.module.css";

/** The shortest code worth sending to the server; the real check is the server's (VW-JOIN-003). */
const MIN_CODE = 4;

/** "Got a code?": paste an invite code and go to its join page. The code itself is resolved there. */
export function JoinCodePanel({ onSubmit }: { onSubmit: (code: string) => void }) {
  const [code, setCode] = useState("");
  const trimmed = code.trim();
  return (
    <Card padding={5} elevation="med">
      <form
        className={styles.panel}
        noValidate
        onSubmit={(event) => {
          event.preventDefault();
          if (trimmed.length >= MIN_CODE) onSubmit(trimmed);
        }}
      >
        <Heading level={2} type="display-3">
          Got a code?
        </Heading>
        <Text color="secondary">
          A friend can send you a room code. Paste it to jump straight in.
        </Text>
        <TextInput
          label="Room code"
          value={code}
          onChange={setCode}
          startIcon={ILink}
          htmlName="roomCode"
        />
        <Button
          type="submit"
          label="Join with code"
          variant="primary"
          isDisabled={trimmed.length < MIN_CODE}
        />
      </form>
    </Card>
  );
}
