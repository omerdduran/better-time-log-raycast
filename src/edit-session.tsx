import { Action, ActionPanel, Form, LaunchProps, Toast, popToRoot, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { refreshMenuBarCommand } from "./lib/menu-bar";
import { SessionLog, getHistory, listProjects, updateSessionProject } from "./lib/timer-store";

interface EditSessionArguments {
    sessionId: string;
}

export default function EditSessionCommand(props: LaunchProps<{ arguments: EditSessionArguments }>) {
    const { sessionId } = props.arguments;
    const [session, setSession] = useState<SessionLog | null>(null);
    const [projects, setProjects] = useState<string[]>([]);
    const [customProject, setCustomProject] = useState<string>("");
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const history = await getHistory();
                const found = history.find((s) => s.id === sessionId);
                if (found) {
                    setSession(found);
                    setProjects(listProjects(history));
                } else {
                    await showToast({ style: Toast.Style.Failure, title: "Session not found" });
                    await popToRoot();
                }
            } finally {
                setIsLoading(false);
            }
        })();
    }, [sessionId]);

    const handleSubmit = async (values: { project?: string }) => {
        if (!session) return;
        const project = values.project === "" ? undefined : values.project;
        try {
            await updateSessionProject(session.id, project);
            await showToast({
                style: Toast.Style.Success,
                title: project ? `Project set to ${project}` : "Project cleared",
            });
            await refreshMenuBarCommand();
            await popToRoot();
        } catch (error) {
            await showToast({ style: Toast.Style.Failure, title: "Failed to update", message: String(error) });
        }
    };

    // Combine existing projects with custom typed project
    const allProjects = customProject && !projects.includes(customProject)
        ? [customProject, ...projects]
        : projects;

    if (isLoading || !session) {
        return (
            <Form>
                <Form.Description text="Loading session..." />
            </Form>
        );
    }

    return (
        <Form
            navigationTitle={`Edit: ${session.title || "Session"}`}
            actions={
                <ActionPanel>
                    <Action.SubmitForm title="Save" onSubmit={handleSubmit} />
                </ActionPanel>
            }
        >
            <Form.Description text={`Editing: ${session.title || "Logged Session"}`} />
            <Form.Dropdown
                id="project"
                title="Project"
                defaultValue={session.project ?? ""}
                filtering={false}
                onSearchTextChange={setCustomProject}
            >
                <Form.Dropdown.Item title="No Project" value="" />
                {allProjects.map((p) => (
                    <Form.Dropdown.Item key={p} title={p} value={p} />
                ))}
            </Form.Dropdown>
        </Form>
    );
}
