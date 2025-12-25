import { Detail, Toast, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { ProjectForm } from "./components/project-form";
import { refreshMenuBarCommand } from "./lib/menu-bar";
import { assignProjectToActiveTimer, getActiveTimer } from "./lib/timer-store";

export default function AssignProjectCommand() {
  const [status, setStatus] = useState<"loading" | "ready" | "empty">("loading");
  const [initialProject, setInitialProject] = useState<string | undefined>();

  useEffect(() => {
    (async () => {
      const timer = await getActiveTimer();
      if (!timer) {
        setStatus("empty");
        await showToast({ style: Toast.Style.Failure, title: "No running timer" });
        return;
      }
      setInitialProject(timer.project);
      setStatus("ready");
    })();
  }, []);

  if (status === "loading") {
    return <Detail isLoading />;
  }

  if (status === "empty") {
    return <Detail markdown="No active timer to update." />;
  }

  const handleSubmit = async (project?: string) => {
    try {
      const timer = await assignProjectToActiveTimer(project);
      await refreshMenuBarCommand();
      await showToast({
        style: Toast.Style.Success,
        title: timer.project ? `Project set to ${timer.project}` : "Project cleared",
      });
    } catch (error) {
      await showToast({ style: Toast.Style.Failure, title: "Unable to assign project", message: String(error) });
    }
  };

  return <ProjectForm initialProject={initialProject} onSubmit={handleSubmit} />;
}
