import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Text } from "@astryxdesign/core/Text";
import { Chip, GameCover, Glass, ICheck, ICopy, IEye, Person, type Cover } from "../../../ui";
import styles from "./Illustrations.module.css";

/*
 * The landing's pictures. They show what the product does with sample people; none of it is read
 * from the platform, so each is wrapped in a Specimen by the page.
 */

function Seat({
  name,
  note,
  children,
}: {
  name: string;
  note?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className={styles.seat}>
      <Person name={name} size="sm" />
      <span className={styles.who}>
        <b>{name}</b>
        {note && <span className={styles.muted}>{note}</span>}
      </span>
      {children}
    </div>
  );
}

/** A lobby with three seats and a line of chat: the hero's table. */
export function TableCard() {
  return (
    <Glass tilt={7} className={styles.card}>
      <div className={styles.between}>
        <div>
          <Text type="supporting" color="secondary">
            Friday night duel
          </Text>
          <div className={styles.code}>NOVA-7Q</div>
        </div>
        <Badge variant="info" label="Hexcrawl" />
      </div>
      <Seat name="Nova" note="host">
        <Badge variant="success" label="Ready" />
      </Seat>
      <Seat name="Juno">
        <Badge variant="warning" label="Choosing a team" />
      </Seat>
      <Seat name="Rin" note="made this game">
        <Chip>Spectating</Chip>
      </Seat>
      <div className={styles.bubble}>
        <b>Rin</b> <span className={styles.muted}>I rewrote the fog rules. Break them.</span>
      </div>
    </Glass>
  );
}

/** What each friend is doing and what the card offers for it. */
const FRIENDS: readonly {
  name: string;
  note: string;
  cover: Cover;
  action: "invited" | "watch" | "invite";
}[] = [
  { name: "Juno", note: "Invite sent", cover: { piece: "meeple", tone: "a" }, action: "invited" },
  {
    name: "Kestrel",
    note: "Playing Hexcrawl",
    cover: { piece: "knight", tone: "b" },
    action: "watch",
  },
  { name: "Mara", note: "Not in a room", cover: { piece: "crown", tone: "c" }, action: "invite" },
  { name: "Pixel", note: "Not in a room", cover: { piece: "dice", tone: "a" }, action: "invite" },
];

function FriendAction({ action }: { action: (typeof FRIENDS)[number]["action"] }) {
  if (action === "invited") return <Chip icon={<ICheck />}>Invited</Chip>;
  if (action === "watch") {
    return <Button size="sm" variant="secondary" label="Watch" icon={<IEye />} />;
  }
  return <Button size="sm" variant="secondary" label="Invite" />;
}

/**
 * A friends list in three states (invited, in a game you can watch, free to invite) above the room
 * code to hand to anyone else, cut as a ticket stub.
 */
export function FriendsCard() {
  return (
    <Glass className={styles.card}>
      <div className={styles.between}>
        <Text type="label">Friends</Text>
        <Chip>4</Chip>
      </div>
      {FRIENDS.map(({ name, note, cover, action }) => (
        <div key={name} className={styles.seat}>
          <GameCover square cover={cover} className={styles.pawn} />
          <span className={styles.friend}>
            <b>{name}</b>
            <span className={styles.muted}>{note}</span>
          </span>
          <FriendAction action={action} />
        </div>
      ))}
      <div className={styles.stub}>
        <span className={styles.stubCode}>
          <Text type="supporting" color="secondary">
            Room code, for anyone
          </Text>
          <span className={styles.code}>NOVA-7Q</span>
        </span>
        <Button size="sm" variant="ghost" label="Copy" icon={<ICopy />} />
      </div>
    </Glass>
  );
}

const SHELF: readonly {
  title: string;
  badge: string;
  variant: "info" | "warning";
  cover: Cover;
}[] = [
  {
    title: "Official classics",
    badge: "Official",
    variant: "info",
    cover: { piece: "crown", tone: "a" },
  },
  {
    title: "Community games",
    badge: "Community",
    variant: "warning",
    cover: { piece: "hex", tone: "c" },
  },
  {
    title: "Play against an AI",
    badge: "AI opponent",
    variant: "info",
    cover: { piece: "knight", tone: "b" },
  },
  {
    title: "Watch from a seat",
    badge: "Spectators",
    variant: "info",
    cover: { piece: "cards", tone: "a" },
  },
  {
    title: "Read before you play",
    badge: "Rules",
    variant: "info",
    cover: { piece: "dice", tone: "c" },
  },
  {
    title: "Your game, here",
    badge: "Community",
    variant: "warning",
    cover: { piece: "planet", tone: "b" },
  },
];

/** Six tiles that stand for what the catalog offers. */
export function Shelf() {
  return (
    <div className={styles.shelf}>
      {SHELF.map((tile) => (
        <Card key={tile.title} padding={0} elevation="low">
          <div className={styles.tile}>
            <GameCover cover={tile.cover} />
            <h3 className={styles.tileTitle}>{tile.title}</h3>
            <Badge variant={tile.variant} label={tile.badge} />
          </div>
        </Card>
      ))}
    </div>
  );
}

/** The two halves of a game, as the SDK has them: Java rules on the server, a TypeScript board. */
export function CodeWindow() {
  return (
    <Card padding={0} elevation="med">
      <div className={styles.file}>
        MyGame.java<Chip>Rules · server</Chip>
      </div>
      <pre className={styles.codeBlock} tabIndex={0}>
        <span className={styles.k}>public class</span> <span className={styles.t}>MyGame</span>{" "}
        <span className={styles.k}>implements</span> <span className={styles.t}>TurnBaseGame</span>
        {"<State> {\n  "}
        <span className={styles.k}>public</span> <span className={styles.t}>ActionResult</span>
        {"<State> "}
        <span className={styles.t}>onAction</span>
        {"(State state, ActionContext ctx) {\n    "}
        <span className={styles.c}>{"// validate the move, return the next state"}</span>
        {"\n  }\n}"}
      </pre>
      <div className={styles.file}>
        main.ts<Chip>Board · browser</Chip>
      </div>
      <pre className={styles.codeBlock} tabIndex={0}>
        <span className={styles.k}>const</span> {"client = "}
        <span className={styles.k}>new</span> <span className={styles.t}>TurnBaseClient</span>
        {"<Move, GameEvent>();\n\nclient\n  ."}
        <span className={styles.t}>onInit</span>
        {"((ctx) => draw(initialModel(ctx)))\n  ."}
        <span className={styles.t}>onGameEvent</span>
        {"((e) => draw(apply(e)))\n  .start();\n\n"}
        <span className={styles.c}>{"// a click on the board becomes a move"}</span>
        {"\nboard.onclick = () => client."}
        <span className={styles.t}>sendAction</span>
        {"({ cell });"}
      </pre>
    </Card>
  );
}
