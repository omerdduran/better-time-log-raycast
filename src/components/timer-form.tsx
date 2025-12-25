import { Action, ActionPanel, Form, Toast, showToast, useNavigation } from "@raycast/api";
import { useState } from "react";
import { StartTimerPayload, TimerMode } from "../lib/timer-store";

interface TimerFormProps {
  onCreate: (payload: StartTimerPayload) => Promise<void> | void;
  autoClose?: boolean;
  initialMode?: TimerMode;
}

export function TimerForm({ onCreate, autoClose = true, initialMode = "open" }: TimerFormProps) {
  const { pop } = useNavigation();
  const [mode, setMode] = useState<TimerMode>(initialMode);

  const handleSubmit = async (values: Record<string, string | number | undefined>) => {
    const timerMode = (values.mode as TimerMode) || "open";
    const payload: StartTimerPayload = {
      mode: timerMode,
      title: typeof values.title === "string" ? values.title : undefined,
      project: typeof values.project === "string" ? values.project : undefined,
    };

    if (timerMode === "open") {
      const rawMinutes = typeof values.targetDurationMinutes === "string" ? values.targetDurationMinutes.trim() : "";
      if (rawMinutes) {
        const minutes = Number(rawMinutes);
        if (!Number.isFinite(minutes) || minutes <= 0) {
          await showToast({ style: Toast.Style.Failure, title: "Duration must be greater than zero" });
          return;
        }
        payload.targetDurationMinutes = minutes;
      }
    } else {
      const focusMinutes = Number(values.focusMinutes ?? 25);
      const breakMinutes = Number(values.breakMinutes ?? 5);
      const rawCycles = typeof values.cycles === "string" ? values.cycles : `${values.cycles ?? 4}`;
      const parsedCycles = Number(rawCycles);
      const cycles = Number.isFinite(parsedCycles) && parsedCycles > 0 ? Math.round(parsedCycles) : 4;

      if (![focusMinutes, breakMinutes].every((minutes) => Number.isFinite(minutes) && minutes > 0)) {
        await showToast({ style: Toast.Style.Failure, title: "Enter valid Pomodoro lengths" });
        return;
      }

      payload.pomodoro = {
        focusMinutes,
        breakMinutes,
        cycles,
      };
    }

    await onCreate(payload);
    if (autoClose) {
      pop();
    }
  };

  return (
    <Form
      navigationTitle="Start Timer"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Start Timer" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField id="title" title="Title" placeholder="e.g. Sprint Planning" />
      <Form.TextField id="project" title="Project" placeholder="Optional" />
      <Form.Dropdown id="mode" title="Timer Type" value={mode} onChange={(value) => setMode(value as TimerMode)}>
        <Form.Dropdown.Item title="Open Timer" value="open" />
        <Form.Dropdown.Item title="Pomodoro" value="pomodoro" />
      </Form.Dropdown>

      {mode === "open" && (
        <Form.TextField
          id="targetDurationMinutes"
          title="Target Duration (minutes)"
          placeholder="Leave empty for open timer"
        />
      )}

      {mode === "pomodoro" && (
        <>
          <Form.TextField id="focusMinutes" title="Focus Length (minutes)" defaultValue="25" />
          <Form.TextField id="breakMinutes" title="Break Length (minutes)" defaultValue="5" />
          <Form.TextField id="cycles" title="Focus Blocks" defaultValue="4" />
        </>
      )}
    </Form>
  );
}
