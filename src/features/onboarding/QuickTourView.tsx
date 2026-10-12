import { Button } from "@astryxdesign/core/Button";
import { Dialog, DialogHeader } from "@astryxdesign/core/Dialog";
import { Layout, LayoutContent } from "@astryxdesign/core/Layout";
import { Heading } from "@astryxdesign/core/Heading";
import { Step, Stepper } from "@astryxdesign/core/Stepper";
import { Text } from "@astryxdesign/core/Text";
import { CheckList, GameCover, IArrow, Pane, Stack } from "../../ui";
import type { QuickTour } from "./useQuickTour";
import styles from "./QuickTourView.module.css";

/** The five-step introduction, in a dialog: a stepper on top, one pane under it, and the way on. */
export function QuickTourView({ tour }: { tour: QuickTour }) {
  const { steps, step, direction } = tour;
  // Closed, the dialog's content would still be in the document: the stepper's numbers among them.
  if (!tour.isOpen) return null;
  const current = steps[step];
  return (
    <Dialog
      isOpen={tour.isOpen}
      onOpenChange={(open) => {
        if (!open) tour.close();
      }}
      width={640}
    >
      <Layout
        header={
          <DialogHeader
            title="Quick tour"
            subtitle={`Step ${String(step + 1)} of ${String(steps.length)}`}
            onOpenChange={(open) => {
              if (!open) tour.close();
            }}
          />
        }
        content={
          <LayoutContent>
            <Stack gap={5}>
              <Stepper
                activeStep={step}
                onStepClick={tour.goTo}
                label="Tour steps"
                density="compact"
              >
                {steps.map((s, index) => (
                  <Step key={s.label} step={index} label={s.label} />
                ))}
              </Stepper>
              <Pane id={String(step)} direction={direction}>
                <div className={styles.step}>
                  <Stack gap={4}>
                    <GameCover cover={{ piece: current.piece, tone: "a" }} wide />
                    <Stack gap={3}>
                      <Heading level={2} type="display-3">
                        {current.title}
                      </Heading>
                      <Text color="secondary">{current.body}</Text>
                      <CheckList items={current.points} />
                    </Stack>
                  </Stack>
                </div>
              </Pane>
            </Stack>
          </LayoutContent>
        }
        footer={
          <div className={styles.footer}>
            <Button label="Skip tour" variant="ghost" onClick={tour.close} />
            <div className={styles.way}>
              {step > 0 && <Button label="Back" variant="secondary" onClick={tour.back} />}
              {tour.isLast ? (
                <Button
                  label="Pick a game"
                  variant="primary"
                  icon={<IArrow />}
                  onClick={tour.finish}
                />
              ) : (
                <Button label="Next" variant="primary" onClick={tour.next} />
              )}
            </div>
          </div>
        }
      />
    </Dialog>
  );
}
