import { Action, ActionPanel, Alert, Color, Form, Icon, List, Toast, confirmAlert, showToast, useNavigation } from "@raycast/api";
import { useCallback, useEffect, useMemo, useState } from "react";
import { refreshMenuBarCommand } from "./lib/menu-bar";
import {
  SessionLog,
  StartTimerPayload,
  buildSummary,
  deleteSession,
  formatReadableDuration,
  getHistory,
  getProjectMetaMap,
  listProjects,
  startTimer as persistStartTimer,
  updateSessionProject,
} from "./lib/timer-store";

type ProjectFilterValue = "all" | "none" | string;

function EditSessionProjectForm({
  session,
  onUpdate,
}: {
  session: SessionLog;
  onUpdate: (sessionId: string, project?: string) => Promise<void>;
}) {
  const { pop } = useNavigation();

  const handleSubmit = async (values: { project?: string }) => {
    await onUpdate(session.id, values.project);
    pop();
  };

  return (
    <Form
      navigationTitle="Edit Session"
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="project"
        title="Project"
        defaultValue={session.project ?? ""}
        placeholder="e.g. Marketing Site"
      />
    </Form>
  );
}

export default function TimeLogHistoryCommand() {
  const [history, setHistory] = useState<SessionLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [projectFilter, setProjectFilter] = useState<ProjectFilterValue>("all");
  const [projectMeta, setProjectMeta] = useState<Record<string, { emoji?: string; color?: string }>>({});

  const loadHistory = useCallback(async () => {
    setIsLoading(true);
    try {
      const entries = await getHistory();
      setHistory(entries);
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Failed to load history", message: String(error) });
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void (async () => {
      await loadHistory();
      const meta = await getProjectMetaMap();
      setProjectMeta(meta);
    })();
  }, [loadHistory]);

  const projectOptions = useMemo(() => listProjects(history), [history]);

  const filteredHistory = useMemo(() => {
    if (projectFilter === "all") {
      return history;
    }
    if (projectFilter === "none") {
      return history.filter((entry) => !entry.project);
    }
    return history.filter((entry) => entry.project === projectFilter);
  }, [history, projectFilter]);

  const totalDuration = useMemo(
    () => filteredHistory.reduce((sum, entry) => sum + entry.durationMs, 0),
    [filteredHistory],
  );

  const sectionTitle = useMemo(() => {
    if (projectFilter === "all") {
      return "All Sessions";
    }
    if (projectFilter === "none") {
      return "Sessions without Project";
    }
    return `Project: ${projectFilter}`;
  }, [projectFilter]);

  const handleStartTimerForProject = useCallback(async (project: string) => {
    const payload: StartTimerPayload = {
      mode: "open",
      title: `${project} Session`,
      project,
    };
    try {
      const timer = await persistStartTimer(payload);
      await showToast({ style: Toast.Style.Success, title: "Timer started", message: timer.title });
      await refreshMenuBarCommand();
    } catch (error) {
      const title =
        error instanceof Error && error.message === "ACTIVE_TIMER_EXISTS"
          ? "A timer is already running"
          : "Unable to start timer";
      await showToast({ style: Toast.Style.Failure, title });
    }
  }, []);

  const handleUpdateSessionProject = useCallback(async (sessionId: string, project?: string) => {
    try {
      const updatedHistory = await updateSessionProject(sessionId, project);
      setHistory(updatedHistory);
      await showToast({
        style: Toast.Style.Success,
        title: project ? `Project set to ${project}` : "Project cleared",
      });
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Failed to update session", message: String(error) });
    }
  }, []);

  const handleDeleteSession = useCallback(async (session: SessionLog) => {
    const confirmed = await confirmAlert({
      title: "Delete Session?",
      message: `"${session.title || "Logged Session"}" will be permanently removed.`,
      primaryAction: {
        title: "Delete",
        style: Alert.ActionStyle.Destructive,
      },
    });
    if (!confirmed) return;

    try {
      const updatedHistory = await deleteSession(session.id);
      setHistory(updatedHistory);
      await refreshMenuBarCommand();
      await showToast({ style: Toast.Style.Success, title: "Session deleted" });
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Failed to delete", message: String(error) });
    }
  }, []);

  return (
    <List
      isLoading={isLoading}
      searchBarPlaceholder="Search sessions"
      searchBarAccessory={
        <List.Dropdown
          tooltip="Filter by Project"
          onChange={(value) => setProjectFilter(value as ProjectFilterValue)}
          value={projectFilter}
        >
          <List.Dropdown.Item title="All Projects" value="all" />
          <List.Dropdown.Item title="No Project" value="none" />
          {projectOptions.map((project) => (
            <List.Dropdown.Item key={project} title={project} value={project} />
          ))}
        </List.Dropdown>
      }
    >
      <List.Section
        title="Summary"
        subtitle={`${filteredHistory.length} ${filteredHistory.length === 1 ? "session" : "sessions"}`}
      >
        <List.Item
          title={sectionTitle}
          subtitle={filteredHistory.length ? undefined : "No sessions to display"}
          accessories={
            filteredHistory.length
              ? [
                {
                  tag: {
                    value: formatReadableDuration(totalDuration),
                    color: Color.Blue,
                  },
                },
              ]
              : undefined
          }
        />
      </List.Section>
      <List.Section title="Sessions">
        {filteredHistory.length === 0 ? (
          <List.Item title="No sessions found" icon={Icon.Info} />
        ) : (
          filteredHistory.map((entry) => (
            <List.Item
              key={entry.id}
              title={entry.title || "Logged Session"}
              subtitle={
                entry.project ? `${projectMeta[entry.project]?.emoji ?? ""} ${entry.project}`.trim() : "No project"
              }
              accessories={[
                { text: formatReadableDuration(entry.durationMs) },
                {
                  date: new Date(entry.startedAt),
                  tooltip: `${new Date(entry.startedAt).toLocaleString()} → ${new Date(entry.endedAt).toLocaleTimeString()}`,
                },
                { tag: entry.mode === "pomodoro" ? "Pomodoro" : "Timer" },
              ]}
              actions={
                <ActionPanel>
                  <Action.Push
                    title="Edit Project"
                    icon={Icon.Pencil}
                    target={<EditSessionProjectForm session={entry} onUpdate={handleUpdateSessionProject} />}
                  />
                  <Action.CopyToClipboard title="Copy Summary" content={buildSummary(entry)} />
                  {entry.project && (
                    <Action
                      title="Filter by Project"
                      icon={Icon.List}
                      onAction={() => setProjectFilter(entry.project!)}
                    />
                  )}
                  {entry.project && (
                    <Action
                      title="Start Timer for Project"
                      icon={Icon.Play}
                      onAction={() => {
                        void handleStartTimerForProject(entry.project!);
                      }}
                    />
                  )}
                  <Action
                    title="Refresh"
                    icon={Icon.ArrowClockwise}
                    onAction={() => {
                      void loadHistory();
                    }}
                    shortcut={{ modifiers: ["cmd"], key: "r" }}
                  />
                  <Action
                    title="Delete Session"
                    icon={Icon.Trash}
                    style={Action.Style.Destructive}
                    onAction={() => {
                      void handleDeleteSession(entry);
                    }}
                    shortcut={{ modifiers: ["cmd"], key: "backspace" }}
                  />
                </ActionPanel>
              }
            />
          ))
        )}
      </List.Section>
    </List>
  );
}
