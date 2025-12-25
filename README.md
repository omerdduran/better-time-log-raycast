# Better Time Log

Better Time Log is a Raycast menu bar command that keeps your project timers always visible on macOS. Start ad-hoc sessions, run Pomodoro blocks, and log everything without leaving the top bar.

## Features

- Start open-ended or countdown timers with a custom title and project tag
- Launch Pomodoro routines with configurable focus/break lengths and cycles
- Keep the current timer visible in the Raycast menu bar, including remaining time
- Kick off and stop sessions from dedicated root commands (Start Timer, Stop Timer, Pomodoro Presets)
- Review the last sessions directly from the menu bar and copy summaries
- Filter the complete history by project to understand where time goes
- Assign or change the project of a running timer (including existing Pomodoros)
- Skip Pomodoro focus or break phases, or cancel the timer entirely if plans change
- Clear history or start new timers via presets (Instant Timer, 25/5, 50/10)

## Commands

| Command | Mode | Description |
| --- | --- | --- |
| `Better Time Log` (`start-time`) | Menu Bar | Shows the current timer in the menu bar and provides quick actions to start/stop sessions. |
| `Start Timer` (`start-timer`) | View | Full-screen form for starting open or Pomodoro timers. |
| `Stop Timer` (`stop-timer`) | No View | Stops the active timer from anywhere in Raycast. |
| `Cancel Timer` (`cancel-timer`) | No View | Cancels the active timer without logging it. |
| `Pomodoro Presets` (`pomodoro-presets`) | View | Browse curated Pomodoro routines and start them instantly. |
| `Time Log History` (`time-log-history`) | View | Browse and filter logged sessions by project, copy summaries, and restart work. |
| `Assign Project` (`assign-project`) | View | Set or update the project that the active timer belongs to. |
| `Skip Pomodoro Phase` (`skip-pomodoro-phase`) | No View | Jump from the current Pomodoro phase to the next one. |

## Usage

1. Open the Raycast menu bar icon titled **Better Time Log**.
2. Use **Start Timer…** (menu bar) or the standalone **Start Timer** command to enter a custom title, project, and timer type.
3. Pick between an open timer or Pomodoro preset. Customize durations as needed, or use the dedicated **Pomodoro Presets** command for popular routines.
4. Stop the timer from the menu bar, the **Stop Timer** command, or let Pomodoro phases auto-complete—sessions get logged automatically.
5. Open **Time Log History** to browse every session, then pick a project from the dropdown to focus on that workstream. Copy summaries or restart a timer for the selected project from the action panel.
6. Need to adjust mid-session? Use **Assign Project**, **Skip Pomodoro Phase**, or **Cancel Timer** (or the equivalent menu actions) to keep the log tidy.
7. Copy summaries or clear history from either the menu bar or the history command.

## Development

```bash
npm install
npm run dev   # launches `ray develop`
npm run lint  # runs `ray lint`
```