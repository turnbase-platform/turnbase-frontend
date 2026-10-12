import { Badge } from "@astryxdesign/core/Badge";
import { Button } from "@astryxdesign/core/Button";
import { Card } from "@astryxdesign/core/Card";
import { Text } from "@astryxdesign/core/Text";
import { Chip, GameCover, ICopy, Person, type Cover } from "../../../ui";
import styles from "./Illustrations.module.css";

/*
 * The landing's pictures. They show what the product does with sample people; none of it is read
 * from the platform, so each is inert and hidden from assistive technology.
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
    <div className={`tb-glass ${styles.card}`} data-tilt="7">
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
    </div>
  );
}

const FRIENDS = ["Juno", "Kestrel", "Mara", "Pixel"] as const;

/** A friends list with an Invite button on every row. */
export function FriendsCard() {
  return (
    <div className={`tb-glass ${styles.card}`} data-tilt="4">
      <div className={styles.between}>
        <Text type="label">Friends</Text>
        <Button size="sm" variant="secondary" label="Copy room link" icon={<ICopy />} />
      </div>
      {FRIENDS.map((name, index) => (
        <Seat key={name} name={name}>
          <Button size="sm" variant={index === 0 ? "primary" : "ghost"} label="Invite" />
        </Seat>
      ))}
    </div>
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
          <div className={styles.tile} data-fx>
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
