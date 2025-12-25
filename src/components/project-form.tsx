import { Action, ActionPanel, Form, useNavigation } from "@raycast/api";

interface ProjectFormProps {
  initialProject?: string;
  onSubmit: (project?: string) => Promise<void> | void;
  navigationTitle?: string;
}

export function ProjectForm({ initialProject, onSubmit, navigationTitle = "Assign Project" }: ProjectFormProps) {
  const { pop } = useNavigation();

  const handleSubmit = async (values: { project?: string }) => {
    await onSubmit(values.project);
    pop();
  };

  return (
    <Form
      navigationTitle={navigationTitle}
      actions={
        <ActionPanel>
          <Action.SubmitForm title="Save Project" onSubmit={handleSubmit} />
        </ActionPanel>
      }
    >
      <Form.TextField
        id="project"
        title="Project"
        defaultValue={initialProject ?? ""}
        placeholder="e.g. Marketing Site"
      />
    </Form>
  );
}
