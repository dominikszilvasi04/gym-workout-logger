import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { BookOpenText, Dumbbell, Layers3, Plus } from "lucide-react";
import { ApplicationShell } from "../components/layout/ApplicationShell";
import { Button } from "../components/common/Button";
import { Card } from "../components/common/Card";
import { Badge } from "../components/common/Badge";
import { templateAPI } from "../services/api";
import type { WorkoutTemplate } from "../types";

export function TemplatesPage() {
  const [templates, setTemplates] = useState<WorkoutTemplate[]>([]);
  const [loading, setLoading] = useState(true);

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

  return (
    <ApplicationShell
      title="Templates"
      action={
        <Button size="sm" icon={<Plus size={16} />}>
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
          <div className="rounded-2xl bg-navy-50 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-navy-500">Templates</p>
            <p className="mt-1 font-display text-2xl font-semibold text-navy-950">{templateSummary.totalTemplates}</p>
          </div>
          <div className="rounded-2xl bg-primary-50 p-3">
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-700">Exercises</p>
            <p className="mt-1 font-display text-2xl font-semibold text-primary-900">{templateSummary.totalExercises}</p>
          </div>
        </div>
      </Card>

      {loading ? (
        <Card border>
          <div className="h-28 animate-pulse rounded-2xl bg-navy-100" />
        </Card>
      ) : templates.length === 0 ? (
        <Card border className="border-dashed border-navy-300 bg-white/80">
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
              <Card key={template._id} border className="bg-white/95 shadow-sm">
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
                  <Button size="sm" variant="outline" icon={<Dumbbell size={16} />}>
                    Load
                  </Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </ApplicationShell>
  );
}
