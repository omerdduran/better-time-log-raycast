import {
  Action,
  ActionPanel,
  Alert,
  Color,
  Icon,
  MenuBarExtra,
  Toast,
  confirmAlert,
  showHUD,
  showToast,
} from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActiveTimer,
  SessionLog,
  StartTimerPayload,
  buildSummary,
  formatClock,
  formatReadableDuration,
  getActiveTimer,
  getHistory,
  sanitizeProject,
  setActiveTimer as persistActiveTimer,
  setHistory as persistHistory,
  startTimer as persistStartTimer,
  stopTimer as persistStopTimer,
} from "./lib/timer-store";
import { TimerForm } from "./components/timer-form";
import { ProjectForm } from "./components/project-form";

export default function MenuBarTimerCommand() {
  const [activeTimer, setActiveTimer] = useState<ActiveTimer | null>(null);
  const [history, setHistory] = useState<SessionLog[]>([]);
  const [tick, setTick] = useState(Date.now());
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadState = async () => {
      try {
        const [active, storedHistory] = await Promise.all([getActiveTimer(), getHistory()]);
        if (active) {
          setActiveTimer(active);
        }
        if (storedHistory.length) {
          setHistory(storedHistory);
        }
      } finally {
        setIsLoading(false);
      }
    };

    loadState();
  }, []);

  useEffect(() => {
    const interval = setInterval(() => setTick(Date.now()), 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    void persistActiveTimer(activeTimer ?? null);
  }, [activeTimer, isLoading]);

  useEffect(() => {
    if (isLoading) {
      return;
    }

    void persistHistory(history);
  }, [history, isLoading]);

  useEffect(() => {
    if (!activeTimer) {
      return;
    }

    if (activeTimer.isPaused) {
      return;
    }

    if (activeTimer.mode === "pomodoro" && activeTimer.pomodoro) {
      const phaseElapsed = tick - activeTimer.startedAt - (activeTimer.phasePausedMs ?? 0);
      const remaining = getPhaseDurationMs(activeTimer) - phaseElapsed;
      if (remaining <= 0) {
        void advancePomodoroPhase(activeTimer, setActiveTimer, setHistory);
      }
      return;
    }

    if (activeTimer.targetDurationMs) {
      const phaseElapsed = tick - activeTimer.startedAt - (activeTimer.phasePausedMs ?? 0);
      const remaining = activeTimer.targetDurationMs - phaseElapsed;
      if (remaining <= 0) {
        void finalizeTimer(activeTimer, setActiveTimer, setHistory, {
          title: "Timer completed",
          message: "Session logged",
          style: Toast.Style.Success,
        });
      }
    }
  }, [tick, activeTimer]);

  const handleStartTimer = useCallback(
    async (payload: StartTimerPayload) => {
      if (activeTimer) {
        await showToast({ style: Toast.Style.Failure, title: "A timer is already running" });
        return;
      }

      try {
        const nextTimer = await persistStartTimer(payload);
        setActiveTimer(nextTimer);
        await showToast({ style: Toast.Style.Success, title: "Timer started", message: nextTimer.title });
      } catch (error) {
        const title =
          error instanceof Error && error.message === "ACTIVE_TIMER_EXISTS"
            ? "A timer is already running"
            : "Unable to start timer";
        await showToast({ style: Toast.Style.Failure, title });
      }
    },
    [activeTimer],
  );

  const handleStopTimer = useCallback(async () => {
    if (!activeTimer) {
      return;
    }

    await finalizeTimer(activeTimer, setActiveTimer, setHistory, {
      title: "Timer stopped",
      message: `Logged ${formatReadableDuration(Date.now() - activeTimer.createdAt)}`,
      style: Toast.Style.Success,
    });
  }, [activeTimer]);

  const handleSkipPhase = useCallback(async () => {
    if (!activeTimer?.pomodoro) {
      return;
    }
    await advancePomodoroPhase(activeTimer, setActiveTimer, setHistory, { skip: true });
  }, [activeTimer]);

  const handlePauseResume = useCallback(async () => {
    if (!activeTimer) return;
    if (activeTimer.isPaused) {
      const delta = Date.now() - (activeTimer.pausedAt ?? Date.now());
      setActiveTimer({
        ...activeTimer,
        isPaused: false,
        pausedAt: undefined,
        sessionPausedMs: (activeTimer.sessionPausedMs ?? 0) + delta,
        phasePausedMs: (activeTimer.phasePausedMs ?? 0) + delta,
      });
      await showToast({ style: Toast.Style.Success, title: "Timer resumed" });
    } else {
      setActiveTimer({ ...activeTimer, isPaused: true, pausedAt: Date.now() });
      await showToast({ style: Toast.Style.Success, title: "Timer paused" });
    }
  }, [activeTimer]);

  const handleAssignProject = useCallback(
    async (nextProject?: string) => {
      if (!activeTimer) {
        return;
      }
      const sanitized = sanitizeProject(nextProject);
      setActiveTimer({ ...activeTimer, project: sanitized });
      await showToast({
        style: Toast.Style.Success,
        title: sanitized ? `Project set to ${sanitized}` : "Project cleared",
      });
    },
    [activeTimer],
  );

  const handleCancelTimer = useCallback(async () => {
    if (!activeTimer) {
      return;
    }
    setActiveTimer(null);
    await showToast({ style: Toast.Style.Success, title: "Timer cancelled", message: "Not logged" });
  }, [activeTimer]);

  const handleClearHistory = useCallback(async () => {
    if (!history.length) {
      return;
    }
    const confirmed = await confirmAlert({
      title: "Clear history?",
      message: "All logged sessions will be removed.",
      primaryAction: {
        title: "Clear",
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (!confirmed) {
      return;
    }
    setHistory([]);
    await showToast({ style: Toast.Style.Success, title: "History cleared" });
  }, [history.length]);

  const menuTitle = useMemo(() => buildMenuTitle(activeTimer, tick), [activeTimer, tick]);
  const menuTooltip = activeTimer ? buildTooltip(activeTimer) : "Start a new timer";

  return (
    <MenuBarExtra icon={{ source: "extension-icon.png" }} isLoading={isLoading} title={menuTitle} tooltip={menuTooltip}>
      <MenuBarExtra.Section title="Active Timer">
        {activeTimer ? (
          <MenuBarExtra.Item
            title={activeTimer.title || "Current Session"}
            subtitle={activeTimer.project ? `${activeTimer.project}` : "No project"}
            icon={activeTimer.mode === "pomodoro" ? Icon.Timer : Icon.Clock}
            accessory={
              activeTimer.mode === "pomodoro" && activeTimer.pomodoro
                ? {
                    tag: {
                      value: `${activeTimer.pomodoro.completedFocusBlocks}/${activeTimer.pomodoro.cycles}`,
                      color: Color.Green,
                    },
                  }
                : undefined
            }
            tooltip={buildActiveTimerTooltip(activeTimer, tick)}
            actions={
              <ActionPanel>
                <Action icon={Icon.Stop} title="Stop Timer" onAction={handleStopTimer} />
                <Action
                  icon={activeTimer.isPaused ? Icon.Play : Icon.Pause}
                  title={activeTimer.isPaused ? "Resume Timer" : "Pause Timer"}
                  onAction={handlePauseResume}
                />
                {activeTimer.mode === "pomodoro" && activeTimer.pomodoro && (
                  <Action
                    icon={Icon.Forward}
                    title={activeTimer.pomodoro.phase === "focus" ? "Skip to Break" : "Skip to Focus"}
                    onAction={handleSkipPhase}
                  />
                )}
                <Action.Push
                  icon={Icon.Hashtag}
                  title="Assign Project"
                  target={
                    <ProjectForm
                      initialProject={activeTimer.project}
                      onSubmit={handleAssignProject}
                      navigationTitle="Assign Project"
                    />
                  }
                />
                <Action
                  icon={Icon.XMarkCircle}
                  title="Cancel Timer (No Log)"
                  style={Action.Style.Destructive}
                  onAction={handleCancelTimer}
                />
              </ActionPanel>
            }
          />
        ) : (
          <MenuBarExtra.Item title="No running timer" subtitle="Start one below" icon={Icon.Clock} />
        )}
      </MenuBarExtra.Section>

      <MenuBarExtra.Section title="Quick Start">
        <MenuBarExtra.Item
          title="Start Timer…"
          icon={Icon.Plus}
          actions={
            <ActionPanel>
              <Action.Push
                icon={Icon.Plus}
                title="Open Timer Form"
                target={<TimerForm onCreate={handleStartTimer} />}
              />
            </ActionPanel>
          }
        />
        <MenuBarExtra.Item
          title="Instant Timer"
          subtitle="Start without details"
          icon={Icon.Play}
          onAction={() =>
            handleStartTimer({
              mode: "open",
              title: "Working Session",
            })
          }
        />
        <MenuBarExtra.Item
          title="25/5 Pomodoro"
          subtitle="4 focus blocks"
          icon={Icon.Timer}
          onAction={() =>
            handleStartTimer({
              mode: "pomodoro",
              title: "Pomodoro",
              pomodoro: {
                focusMinutes: 25,
                breakMinutes: 5,
                cycles: 4,
              },
            })
          }
        />
        <MenuBarExtra.Item
          title="50/10 Deep Work"
          subtitle="2 blocks"
          icon={Icon.Timer}
          onAction={() =>
            handleStartTimer({
              mode: "pomodoro",
              title: "Deep Work",
              pomodoro: {
                focusMinutes: 50,
                breakMinutes: 10,
                cycles: 2,
              },
            })
          }
        />
      </MenuBarExtra.Section>

      <MenuBarExtra.Section title="Recent Sessions">
        {history.length === 0 && (
          <MenuBarExtra.Item title="No sessions yet" subtitle="Finish a timer to see it here" icon={Icon.Info} />
        )}
        {history.slice(0, 5).map((session) => (
          <MenuBarExtra.Item
            key={session.id}
            title={session.title || "Logged Session"}
            subtitle={[formatReadableDuration(session.durationMs), session.project].filter(Boolean).join(" · ")}
            tooltip={`${new Date(session.startedAt).toLocaleString()} → ${new Date(session.endedAt).toLocaleTimeString()}`}
            icon={session.mode === "pomodoro" ? Icon.Timer : Icon.Clock}
            actions={
              <ActionPanel>
                <Action.CopyToClipboard
                  title="Copy Summary"
                  content={buildSummary(session)}
                  shortcut={{ modifiers: ["cmd"], key: "c" }}
                />
              </ActionPanel>
            }
          />
        ))}
        {history.length > 0 && (
          <MenuBarExtra.Item title="Clear History" icon={Icon.Trash} onAction={handleClearHistory} />
        )}
      </MenuBarExtra.Section>
    </MenuBarExtra>
  );
}

async function finalizeTimer(
  timer: ActiveTimer,
  updateTimer: React.Dispatch<React.SetStateAction<ActiveTimer | null>>,
  pushHistory: React.Dispatch<React.SetStateAction<SessionLog[]>>,
  toast: { title: string; message?: string; style?: Toast.Style },
) {
  const snapshot = { ...timer };
  updateTimer(null);
  const { history } = await persistStopTimer(snapshot);
  pushHistory(history);
  if (toast.title) {
    await showToast({ style: toast.style ?? Toast.Style.Success, title: toast.title, message: toast.message });
  } else {
    await showHUD("Session logged");
  }
}

async function advancePomodoroPhase(
  timer: ActiveTimer,
  updateTimer: React.Dispatch<React.SetStateAction<ActiveTimer | null>>,
  pushHistory: React.Dispatch<React.SetStateAction<SessionLog[]>>,
  options?: { skip?: boolean },
) {
  if (!timer.pomodoro) {
    return;
  }

  const pomodoro = timer.pomodoro;

  if (pomodoro.phase === "focus") {
    const completedFocusBlocks = pomodoro.completedFocusBlocks + 1;
    const isLastFocus = completedFocusBlocks >= pomodoro.cycles;

    if (isLastFocus) {
      const finishedTimer: ActiveTimer = {
        ...timer,
        pomodoro: { ...pomodoro, completedFocusBlocks },
      };
      await finalizeTimer(finishedTimer, updateTimer, pushHistory, {
        title: options?.skip ? "Focus skipped" : "Pomodoro complete",
        message: "Time to celebrate!",
        style: Toast.Style.Success,
      });
      return;
    }

    updateTimer({
      ...timer,
      startedAt: Date.now(),
      phasePausedMs: 0,
      pomodoro: { ...pomodoro, completedFocusBlocks, phase: "break" },
    });
    await showToast({
      style: Toast.Style.Success,
      title: options?.skip ? "Skipped to break" : "Focus complete",
      message: "Break started",
    });
    return;
  }

  updateTimer({
    ...timer,
    startedAt: Date.now(),
    phasePausedMs: 0,
    pomodoro: { ...pomodoro, phase: "focus" },
  });
  await showToast({
    style: Toast.Style.Success,
    title: options?.skip ? "Skipped break" : "Break finished",
    message: "Back to focus",
  });
}

function getPhaseDurationMs(timer: ActiveTimer): number {
  if (timer.mode === "pomodoro" && timer.pomodoro) {
    return timer.pomodoro.phase === "focus" ? timer.pomodoro.focusDurationMs : timer.pomodoro.breakDurationMs;
  }

  return timer.targetDurationMs ?? 0;
}

function buildMenuTitle(timer: ActiveTimer | null, tick: number): string {
  if (!timer) {
    return "Start Timer";
  }

  if (timer.isPaused) {
    return "⏸ Paused";
  }

  if (timer.mode === "pomodoro" && timer.pomodoro) {
    const duration = getPhaseDurationMs(timer);
    const elapsed = tick - timer.startedAt - (timer.phasePausedMs ?? 0);
    const remaining = Math.max(0, duration - elapsed);
    return `${formatClock(remaining)} ${timer.pomodoro.phase === "focus" ? "Focus" : "Break"}`;
  }

  if (timer.targetDurationMs) {
    const remaining = Math.max(0, timer.targetDurationMs - (tick - timer.startedAt - (timer.phasePausedMs ?? 0)));
    return `${formatClock(remaining)} left`;
  }

  return formatClock(tick - timer.createdAt - (timer.sessionPausedMs ?? 0));
}

function buildTooltip(timer: ActiveTimer): string {
  const project = timer.project ? ` · ${timer.project}` : "";
  if (timer.mode === "pomodoro" && timer.pomodoro) {
    return `${capitalize(timer.pomodoro.phase)} block${project}`;
  }
  return `Tracking time${project}`;
}

function buildActiveTimerTooltip(timer: ActiveTimer, tick: number): string {
  const elapsed = tick - timer.createdAt - (timer.sessionPausedMs ?? 0);
  const elapsedLabel = `Elapsed: ${formatReadableDuration(elapsed)}`;
  if (timer.mode === "pomodoro" && timer.pomodoro) {
    const remaining = Math.max(0, getPhaseDurationMs(timer) - (tick - timer.startedAt - (timer.phasePausedMs ?? 0)));
    return `${capitalize(timer.pomodoro.phase)} · ${formatReadableDuration(remaining)} left\n${elapsedLabel}`;
  }
  if (timer.targetDurationMs) {
    const remaining = Math.max(0, timer.targetDurationMs - (tick - timer.startedAt - (timer.phasePausedMs ?? 0)));
    return `${formatReadableDuration(remaining)} remaining\n${elapsedLabel}`;
  }
  return elapsedLabel;
}

function capitalize(value: string): string {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
