import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { BookOpenText, Dumbbell, Layers3, PencilLine, Plus, Trash2 } from "lucide-react";
import { ApplicationShell } from "../components/layout/ApplicationShell";
import { Button } from "../components/common/Button";
import { Card } from "../components/common/Card";
import { Badge } from "../components/common/Badge";
import { Dialog } from "../components/common/Dialog";
import { InputField } from "../components/common/InputField";
import { templateAPI } from "../services/api";
import type { WorkoutTemplate } from "../types";

export function TemplatesPage() {
  const navigate = useNavigate();
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [templateBeingEdited, setTemplateBeingEdited] = useState<WorkoutTemplate | null>(null);
  const [templateNameDraft, setTemplateNameDraft] = useState("");
  const [templateBeingDeleted, setTemplateBeingDeleted] = useState<WorkoutTemplate | null>(null);
  const [actionInProgress, setActionInProgress] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  useEffect(() => {
    const loadTemplates = async () => {
      setLoading(true);
      try {
        const response = await templateAPI.getAll();
        setTemplates(response);
      } finally {
        setLoading(false);
      }
    };

    void loadTemplates();
  }, []);

  const templateSummary = useMemo(() => {
    const totalExercises = templates.reduce((accumulator, template) => accumulator + template.exercises.length, 0);
    return {
      totalTemplates: templates.length,
      totalExercises,
    };
  }, [templates]);

  const openRenameDialog = (template: WorkoutTemplate) => {
    setTemplateBeingEdited(template);
    setTemplateNameDraft(template.template_name);
  };

  const renameTemplate = async () => {
    if (!templateBeingEdited) {
      return;
    }
    const trimmedName = templateNameDraft.trim();
    if (!trimmedName) {
      setFeedback("Template name cannot be empty.");
      return;
    }

    try {
      setActionInProgress(true);
      await templateAPI.update(templateBeingEdited._id, {
        template_name: trimmedName,
        target_muscle_groups: templateBeingEdited.target_muscle_groups,
        exercises: templateBeingEdited.exercises,
      });
      setTemplates((current) =>
        current.map((template) =>
          template._id === templateBeingEdited._id
            ? { ...template, template_name: trimmedName }
            : template
        )
      );
      setTemplateBeingEdited(null);
      setFeedback("Template updated.");
    } catch {
      setFeedback("Unable to rename template right now.");
    } finally {
      setActionInProgress(false);
    }
  };

  const deleteTemplate = async () => {
    if (!templateBeingDeleted) {
      return;
    }

    try {
      setActionInProgress(true);
      await templateAPI.delete(templateBeingDeleted._id);
      setTemplates((current) => current.filter((template) => template._id !== templateBeingDeleted._id));
      setTemplateBeingDeleted(null);
      setFeedback("Template deleted.");
    } catch {
      setFeedback("Unable to delete template right now.");
    } finally {
      setActionInProgress(false);
    }
  };

  return (
    <ApplicationShell
      title="Templates"
      action={
        <Button size="sm" icon={<Plus size={16} />} onClick={() => navigate('/log')}>
          New template
        </Button>
      }
    >
      <Card border className="overflow-hidden p-0 shadow-md">
        <div className="bg-gradient-to-br from-primary-700 to-navy-950 px-4 py-5 text-white">
          <div className="flex items-start justify-between gap-4">
            <div className="max-w-[16rem]">
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">Routines</p>
              <h2 className="mt-2 font-display text-2xl font-semibold tracking-tight">Saved plans, ready to load in one tap.</h2>
              <p className="mt-2 text-sm text-white/80">Turn repeat sessions into quick starts instead of rebuilding them each time.</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-3 text-white/90 backdrop-blur-sm">
              <BookOpenText size={18} />
            </div>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-3 p-4">
          <div className="rounded-2xl border border-navy-300/50 bg-navy-100 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-navy-500">Templates</p>
            <p className="mt-1 font-display text-2xl font-semibold text-navy-950">{templateSummary.totalTemplates}</p>
          </div>
          <div className="rounded-2xl border border-primary-300/40 bg-primary-100/30 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-700">Exercises</p>
            <p className="mt-1 font-display text-2xl font-semibold text-primary-900">{templateSummary.totalExercises}</p>
          </div>
        </div>
      </Card>

      {feedback ? (
        <Card border>
          <p className="text-sm text-navy-700">{feedback}</p>
        </Card>
      ) : null}

      {loading ? (
        <Card border>
          <div className="h-28 animate-pulse rounded-2xl bg-navy-200" />
        </Card>
      ) : templates.length === 0 ? (
        <Card border className="border-dashed border-navy-300 bg-navy-100/80">
          <div className="flex items-start gap-3">
            <div className="rounded-2xl bg-primary-50 p-3 text-primary-600">
              <Layers3 size={18} />
            </div>
            <div>
              <p className="font-display text-lg font-semibold text-navy-900">No templates yet</p>
              <p className="mt-1 text-sm text-navy-600">Save a workout as a template and it will appear here for faster repeat sessions.</p>
            </div>
          </div>
        </Card>
      ) : (
        <div className="space-y-3">
          {templates.map((template) => {
            const totalSets = template.exercises.reduce((accumulator, exercise) => accumulator + exercise.sets.length, 0);
            return (
              <Card key={template._id} border className="bg-navy-100/95 shadow-sm">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-display text-lg font-semibold text-navy-950">{template.template_name}</p>
                    <p className="mt-1 text-sm text-navy-600">
                      {template.exercises.length} exercises · {totalSets} sets
                    </p>
                  </div>
                  <Badge colour="primary" size="small">
                    Ready
                  </Badge>
                </div>

                <div className="mt-3 flex flex-wrap gap-2">
                  {template.target_muscle_groups.slice(0, 4).map((muscleGroup) => (
                    <Badge key={muscleGroup} colour="neutral" size="small">
                      {muscleGroup}
                    </Badge>
                  ))}
                </div>

                <div className="mt-4 flex items-center justify-between rounded-2xl bg-navy-50 px-3 py-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-navy-500">Updated</p>
                    <p className="mt-1 text-sm font-medium text-navy-800">
                      {format(new Date(template.created_at), "d MMM yyyy")}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" variant="outline" icon={<PencilLine size={16} />} onClick={() => openRenameDialog(template)}>
                      Rename
                    </Button>
                    <Button size="sm" variant="outline" icon={<Trash2 size={16} />} onClick={() => setTemplateBeingDeleted(template)}>
                      Delete
                    </Button>
                    <Button size="sm" variant="outline" icon={<Dumbbell size={16} />} onClick={() => navigate(`/log?template=${template._id}`)}>
                      Load
                    </Button>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog
        open={Boolean(templateBeingEdited)}
        onClose={() => setTemplateBeingEdited(null)}
        title="Rename template"
        footer={(
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" onClick={() => setTemplateBeingEdited(null)}>
              Cancel
            </Button>
            <Button isLoading={actionInProgress} onClick={renameTemplate}>
              Save name
            </Button>
          </div>
        )}
      >
        <InputField
          label="Template name"
          value={templateNameDraft}
          onChange={(event) => setTemplateNameDraft(event.target.value)}
          placeholder="Template name"
        />
      </Dialog>

      <Dialog
        open={Boolean(templateBeingDeleted)}
        onClose={() => setTemplateBeingDeleted(null)}
        title="Delete template"
        footer={(
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" onClick={() => setTemplateBeingDeleted(null)}>
              Cancel
            </Button>
            <Button variant="danger" isLoading={actionInProgress} onClick={deleteTemplate}>
              Delete template
            </Button>
          </div>
        )}
      >
        <p className="text-sm text-navy-700">
          {templateBeingDeleted ? `Delete “${templateBeingDeleted.template_name}”? This cannot be undone.` : "Delete this template?"}
        </p>
      </Dialog>
    </ApplicationShell>
  );
}
