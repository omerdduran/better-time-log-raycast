import { Toast, showToast } from "@raycast/api";
import { refreshMenuBarCommand } from "./lib/menu-bar";
import { ActiveTimer, getActiveTimer, setActiveTimer, stopTimer as persistStopTimer } from "./lib/timer-store";

export default async function SkipPomodoroPhaseCommand() {
  const timer = await getActiveTimer();
  if (!timer || timer.mode !== "pomodoro" || !timer.pomodoro) {
    await showToast({ style: Toast.Style.Failure, title: "No Pomodoro is running" });
    return;
  }

  await handleSkip(timer);
  await refreshMenuBarCommand();
}

async function handleSkip(timer: ActiveTimer) {
  const pomodoro = timer.pomodoro;
  const now = Date.now();

  if (pomodoro.phase === "focus") {
    const completedFocusBlocks = pomodoro.completedFocusBlocks + 1;
    const isLastFocus = completedFocusBlocks >= pomodoro.cycles;

    if (isLastFocus) {
      await persistStopTimer(
        {
          ...timer,
          pomodoro: { ...pomodoro, completedFocusBlocks },
        },
        undefined,
      );
      await showToast({ style: Toast.Style.Success, title: "Pomodoro completed" });
      return;
    }

    const updated: ActiveTimer = {
      ...timer,
      startedAt: now,
      phasePausedMs: 0,
      pomodoro: { ...pomodoro, completedFocusBlocks, phase: "break" },
    };
    await setActiveTimer(updated);
    await showToast({ style: Toast.Style.Success, title: "Focus skipped", message: "Break started" });
    return;
  }

  const updated: ActiveTimer = {
    ...timer,
    startedAt: now,
    phasePausedMs: 0,
    pomodoro: { ...pomodoro, phase: "focus" },
  };
  await setActiveTimer(updated);
  await showToast({ style: Toast.Style.Success, title: "Break skipped", message: "Back to focus" });
}
