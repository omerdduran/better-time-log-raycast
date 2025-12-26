import { Action, ActionPanel, Form, LaunchProps, Toast, popToRoot, showToast } from "@raycast/api";
import { useEffect, useState } from "react";
import { refreshMenuBarCommand } from "./lib/menu-bar";
import { SessionLog, getHistory, updateSessionProject } from "./lib/timer-store";

interface EditSessionArguments {
    sessionId: string;
}

export default function EditSessionCommand(props: LaunchProps<{ arguments: EditSessionArguments }>) {
    const { sessionId } = props.arguments;
    const [session, setSession] = useState<SessionLog | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        (async () => {
            try {
                const history = await getHistory();
                const found = history.find((s) => s.id === sessionId);
                if (found) {
                    setSession(found);
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
        try {
            await updateSessionProject(session.id, values.project);
            await showToast({
                style: Toast.Style.Success,
                title: values.project ? `Project set to ${values.project}` : "Project cleared",
            });
            await refreshMenuBarCommand();
            await popToRoot();
        } catch (error) {
            await showToast({ style: Toast.Style.Failure, title: "Failed to update", message: String(error) });
        }
    };

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
            <Form.TextField
                id="project"
                title="Project"
                defaultValue={session.project ?? ""}
                placeholder="e.g. Marketing Site"
            />
        </Form>
    );
}
