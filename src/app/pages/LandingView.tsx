import type { ReactNode } from "react";
import { Button } from "@astryxdesign/core/Button";
import { Heading } from "@astryxdesign/core/Heading";
import { Text } from "@astryxdesign/core/Text";
import { CheckList, FloatingPiece, Glass, IArrow, IPlay, ISparkle, Specimen } from "../../ui";
import { CodeWindow, FriendsCard, Shelf, TableCard } from "./landing/Illustrations";
import { JumpMap } from "./landing/JumpMap";
import { Actions, Copy, Screen } from "./landing/Screen";
import styles from "./LandingView.module.css";

const SDK_URL = "https://github.com/turnbase-platform/turnbase-sdk";

/**
 * VW-LAND-001…004 over five snap screens. `guest` is the Guest button — it owns a session request,
 * so the page composes it in rather than the view importing it. `appearance` is the footer's
 * Light / Dark / Auto switch, for a visitor who has no account menu yet.
 */
export function LandingView({
  showActions,
  guest,
  appearance,
  onTour,
}: {
  showActions: boolean;
  guest: ReactNode;
  appearance: ReactNode;
  onTour: () => void;
}) {
  return (
    <div>
      <JumpMap />

      <Screen id="start">
        <Copy>
          <div className={styles.hero}>
            <Heading level={1} type="display-1">
              Pull up a chair.
            </Heading>
          </div>
          <Text type="large" color="secondary" textWrap="pretty">
            TurnBase is where board game fans play together and where developers publish the games
            they dream up. Open a room, bring your friends, take your turn.
          </Text>
          <Actions>
            {showActions ? (
              <>
                {guest}
                <Button label="Create account" variant="secondary" size="lg" href="/register" />
                <Button label="Log in" variant="ghost" size="lg" href="/login" />
              </>
            ) : (
              <Button
                label="Browse games"
                variant="primary"
                size="lg"
                icon={<IPlay />}
                href="/games"
              />
            )}
          </Actions>
          <Button label="See how it works" variant="ghost" icon={<ISparkle />} onClick={onTour} />
        </Copy>
        <div className={styles.stage}>
          <FloatingPiece
            piece="meeple"
            depth={1.2}
            size={52}
            position={{ left: "-6%", top: "-9%" }}
          />
          <FloatingPiece
            piece="dice"
            depth={0.7}
            size={50}
            delay={-2}
            position={{ right: "-3%", top: "-10%" }}
          />
          <FloatingPiece
            piece="knight"
            depth={1.5}
            size={46}
            delay={-4}
            position={{ left: "-8%", bottom: "10%" }}
          />
          <FloatingPiece
            piece="crown"
            depth={0.5}
            size={40}
            delay={-1}
            position={{ right: "-5%", bottom: "22%" }}
          />
          <Specimen>
            <TableCard />
          </Specimen>
        </div>
      </Screen>

      <Screen id="share" flip>
        <Copy>
          <Heading level={2} type="display-2">
            Games are better shared
          </Heading>
          <Text type="large" color="secondary" textWrap="pretty">
            Keep a friends list and invite them into a room in one tap. Rooms can be public, friends
            only or invite only, and anyone can watch.
          </Text>
          <CheckList
            items={[
              "Invite friends, or share a room code with anyone",
              "Chat stays in the room, not in your inbox",
              "Spectate a friend's match without joining it",
            ]}
          />
          {showActions && <Button label="Create account" variant="secondary" href="/register" />}
        </Copy>
        <Specimen>
          <FriendsCard />
        </Specimen>
      </Screen>

      <Screen id="library">
        <Copy>
          <Heading level={2} type="display-2">
            Classics and new ideas
          </Heading>
          <Text type="large" color="secondary" textWrap="pretty">
            Official games sit next to games made by the community. Every game says who made it,
            which version it is and whether you can watch it or play an AI.
          </Text>
          <Button label="Browse all games" variant="primary" icon={<IArrow />} href="/games" />
        </Copy>
        <Specimen>
          <Shelf />
        </Specimen>
      </Screen>

      <Screen id="build" flip>
        <Copy>
          <Heading level={2} type="display-2">
            Made a game? Ship it
          </Heading>
          <Text type="large" color="secondary" textWrap="pretty">
            Write the rules in Java and draw the board in TypeScript, or any language that compiles
            to JavaScript. TurnBase runs it in a sandbox and takes care of rooms, players and
            history.
          </Text>
          <CheckList
            items={[
              "Rules run on the server, so nobody can cheat",
              "Upload a bundle and share one link",
              "Players see your name on every game you make",
            ]}
          />
          <Button
            label="Read the SDK docs"
            variant="secondary"
            icon={<IArrow />}
            href={SDK_URL}
            target="_blank"
          />
        </Copy>
        <CodeWindow />
      </Screen>

      <section id="join" className={styles.last}>
        <div className={styles.lastIn}>
          <Glass className={styles.final}>
            <Heading level={2} type="display-2">
              Your seat is open
            </Heading>
            <Text type="large" color="secondary" textWrap="balance">
              No account needed to try a game. Make one later to keep your history, friends and
              games.
            </Text>
            {showActions ? (
              <Actions centre>
                {guest}
                <Button label="Create account" variant="secondary" size="lg" href="/register" />
              </Actions>
            ) : (
              <Actions centre>
                <Button
                  label="Browse games"
                  variant="primary"
                  size="lg"
                  icon={<IPlay />}
                  href="/games"
                />
              </Actions>
            )}
          </Glass>
          <footer className={styles.foot}>
            <Text type="supporting" color="secondary">
              TurnBase · games that wait for you
            </Text>
            <div className={styles.footEnd}>
              <Button label="SDK docs" variant="ghost" size="sm" href={SDK_URL} target="_blank" />
              {appearance}
            </div>
          </footer>
        </div>
      </section>
    </div>
  );
}
