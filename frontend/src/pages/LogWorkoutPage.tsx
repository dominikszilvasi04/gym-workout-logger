import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import { CheckCircle2, Plus, Trash2, WandSparkles } from "lucide-react";
import { ApplicationShell } from "../components/layout/ApplicationShell";
import { Button } from "../components/common/Button";
import { Card } from "../components/common/Card";
import { Badge } from "../components/common/Badge";
import { Dialog } from "../components/common/Dialog";
import { InputField } from "../components/common/InputField";
import { exerciseAPI, templateAPI, workoutAPI } from "../services/api";
import type { ExerciseDefinition, WorkoutTemplate, WorkoutSet } from "../types";

interface ExerciseEntry {
  localIdentifier: string;
  exerciseName: string;
  exerciseDefinitionIdentifier: string;
  sets: WorkoutSet[];
}

const targetMuscleGroups = [
  "Chest",
  "Back",
  "Shoulders",
  "Biceps",
  "Triceps",
  "Forearms",
  "Quadriceps",
  "Hamstrings",
  "Glutes",
  "Calves",
  "Core",
  "Full body",
];

function createDefaultSet(): WorkoutSet {
  return {
    repetitions: 8,
    weight_in_kilograms: 20,
    rate_of_perceived_exertion: 7,
  };
}

function createExerciseEntry(exercise: ExerciseDefinition): ExerciseEntry {
  return {
    localIdentifier: crypto.randomUUID(),
    exerciseName: exercise.exercise_name,
    exerciseDefinitionIdentifier: exercise._id,
    sets: [createDefaultSet()],
  };
}

export function LogWorkoutPage() {
  const [searchParams] = useSearchParams();
  const [workoutDateTime, setWorkoutDateTime] = useState(() => format(new Date(), "yyyy-MM-dd'T'HH:mm"));
  const [selectedMuscleGroups, setSelectedMuscleGroups] = useState<string[]>([]);
  const [exerciseCatalogue, setExerciseCatalogue] = useState<ExerciseDefinition[]>([]);
  const [templateList, setTemplateList] = useState<WorkoutTemplate[]>([]);
  const [exerciseEntries, setExerciseEntries] = useState<ExerciseEntry[]>([]);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [searchPhrase, setSearchPhrase] = useState("");
  const [loading, setLoading] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [feedbackType, setFeedbackType] = useState<"success" | "error" | null>(null);

  useEffect(() => {
    const loadInitialData = async () => {
      const [exercises, templates] = await Promise.all([
        exerciseAPI.getAll(),
        templateAPI.getAll().catch(() => [] as WorkoutTemplate[]),
      ]);
      setExerciseCatalogue(exercises);
      setTemplateList(templates);

      const templateId = searchParams.get('template');
      if (templateId) {
        try {
          const template = await templateAPI.getById(templateId);
          setSelectedMuscleGroups(template.target_muscle_groups);
          const entries = template.exercises.map((exercise) => ({
            localIdentifier: crypto.randomUUID(),
            exerciseName: exercise.exercise_name,
            exerciseDefinitionIdentifier: exercise.exercise_definition_identifier || '',
            sets: exercise.sets || [createDefaultSet()],
          }));
          setExerciseEntries(entries);
        } catch (err) {
          console.error('Failed to load template:', err);
        }
      }
    };

    void loadInitialData();
  }, [searchParams]);

  const exercisesByMuscleGroup = useMemo(() => {
    const grouped: Record<string, ExerciseDefinition[]> = {};
    exerciseCatalogue.forEach((exercise) => {
      const key = exercise.primary_muscle_group || "General";
      if (!grouped[key]) {
        grouped[key] = [];
      }
      grouped[key].push(exercise);
    });
    Object.values(grouped).forEach((group) => {
      group.sort((first, second) => first.exercise_name.localeCompare(second.exercise_name));
    });
    return grouped;
  }, [exerciseCatalogue]);

  const filteredExercises = useMemo(() => {
    const phrase = searchPhrase.trim().toLowerCase();
    if (!phrase) {
      return exerciseCatalogue;
    }
    return exerciseCatalogue.filter((exercise) => {
      return (
        exercise.exercise_name.toLowerCase().includes(phrase) ||
        exercise.primary_muscle_group.toLowerCase().includes(phrase) ||
        exercise.equipment_required.toLowerCase().includes(phrase)
      );
    });
  }, [exerciseCatalogue, searchPhrase]);

  const toggleMuscleGroup = (muscleGroup: string) => {
    setSelectedMuscleGroups((current) =>
      current.includes(muscleGroup)
        ? current.filter((value) => value !== muscleGroup)
        : [...current, muscleGroup]
    );
  };

  const addExercise = (exercise: ExerciseDefinition) => {
    setExerciseEntries((current) => [...current, createExerciseEntry(exercise)]);
    setSelectorOpen(false);
  };

  const removeExercise = (localIdentifier: string) => {
    setExerciseEntries((current) => current.filter((entry) => entry.localIdentifier !== localIdentifier));
  };

  const addSet = (localIdentifier: string) => {
    setExerciseEntries((current) =>
      current.map((entry) =>
        entry.localIdentifier === localIdentifier
          ? { ...entry, sets: [...entry.sets, createDefaultSet()] }
          : entry
      )
    );
  };

  const removeSet = (localIdentifier: string, setIndex: number) => {
    setExerciseEntries((current) =>
      current.map((entry) => {
        if (entry.localIdentifier !== localIdentifier || entry.sets.length <= 1) {
          return entry;
        }
        return {
          ...entry,
          sets: entry.sets.filter((_, index) => index !== setIndex),
        };
      })
    );
  };

  const updateSetValue = (
    localIdentifier: string,
    setIndex: number,
    key: keyof WorkoutSet,
    value: number
  ) => {
    setExerciseEntries((current) =>
      current.map((entry) => {
        if (entry.localIdentifier !== localIdentifier) {
          return entry;
        }
        return {
          ...entry,
          sets: entry.sets.map((set, index) =>
            index === setIndex ? { ...set, [key]: value } : set
          ),
        };
      })
    );
  };

  const loadTemplate = (templateIdentifier: string) => {
    const selectedTemplate = templateList.find((template) => template._id === templateIdentifier);
    if (!selectedTemplate) {
      return;
    }

    setSelectedMuscleGroups(selectedTemplate.target_muscle_groups || []);
    setExerciseEntries(
      selectedTemplate.exercises.map((exercise) => ({
        localIdentifier: crypto.randomUUID(),
        exerciseName: exercise.exercise_name,
        exerciseDefinitionIdentifier: exercise.exercise_definition_identifier || "",
        sets: exercise.sets,
      }))
    );
  };

  const submitWorkout = async () => {
    if (exerciseEntries.length === 0) {
      setFeedbackType("error");
      setFeedbackMessage("Add at least one exercise before submitting.");
      return;
    }

    setLoading(true);
    setFeedbackMessage(null);

    try {
      const dateObject = new Date(workoutDateTime);
      await workoutAPI.create({
        date_of_workout: dateObject.toISOString(),
        target_muscle_groups: selectedMuscleGroups,
        exercises: exerciseEntries.map((entry) => ({
          exercise_name: entry.exerciseName,
          exercise_definition_identifier: entry.exerciseDefinitionIdentifier,
          sets: entry.sets,
        })),
      });

      setFeedbackType("success");
      setFeedbackMessage("Workout saved successfully.");
      setExerciseEntries([]);
      setSelectedMuscleGroups([]);
    } catch (error) {
      setFeedbackType("error");
      setFeedbackMessage(
        error instanceof Error ? error.message : "Unable to save workout. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <ApplicationShell
      title="Log workout"
      action={
        <Button size="sm" onClick={() => setSelectorOpen(true)} icon={<Plus size={16} />}>
          Add exercise
        </Button>
      }
    >
      <Card border className="overflow-hidden p-0 shadow-md">
        <div className="bg-gradient-to-r from-navy-950 to-primary-700 px-4 py-4 text-white">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-white/70">Session builder</p>
              <p className="mt-2 font-display text-2xl font-semibold">Build the session quickly.</p>
              <p className="mt-1 text-sm text-white/75">Select target muscles, load a template and add exercises in a few taps.</p>
            </div>
            <div className="rounded-2xl bg-white/10 p-3 text-white/90 backdrop-blur-sm">
              <WandSparkles size={18} />
            </div>
          </div>
        </div>
        <div className="space-y-3 p-4">
          <InputField
            label="Workout date and time"
            type="datetime-local"
            value={workoutDateTime}
            onChange={(event) => setWorkoutDateTime(event.target.value)}
          />
          <div className="flex items-center justify-between rounded-xl bg-primary-50 px-3 py-2 text-sm text-primary-800">
            <span>{selectedMuscleGroups.length} muscle groups selected</span>
            <span>{exerciseEntries.length} exercises added</span>
          </div>
        </div>
      </Card>

      <Card border>
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-navy-500">Targeting</p>
            <p className="mt-1 font-display text-lg font-semibold text-navy-900">Target muscle groups</p>
          </div>
          {selectedMuscleGroups.length > 0 ? (
            <button type="button" className="text-sm font-semibold text-primary-600" onClick={() => setSelectedMuscleGroups([])}>
              Clear
            </button>
          ) : null}
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {targetMuscleGroups.map((muscleGroup) => {
            const selected = selectedMuscleGroups.includes(muscleGroup);
            return (
              <button
                key={muscleGroup}
                type="button"
                onClick={() => toggleMuscleGroup(muscleGroup)}
                className={`rounded-full border px-3 py-2 text-sm font-medium transition-colors ${
                  selected
                    ? "border-primary-600 bg-primary-600 text-white shadow-sm"
                    : "border-navy-300 bg-white text-navy-600 hover:border-navy-400 hover:text-navy-900"
                }`}
              >
                {selected ? <CheckCircle2 size={14} className="mr-1 inline-block" /> : null}
                {muscleGroup}
              </button>
            );
          })}
        </div>
      </Card>

      <Card border>
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-navy-500">Templates</p>
            <p className="mt-1 font-display text-lg font-semibold text-navy-900">Start from a saved routine</p>
          </div>
          <select
            className="h-11 rounded-lg border border-navy-300 bg-white px-3 text-sm"
            defaultValue=""
            onChange={(event) => loadTemplate(event.target.value)}
          >
            <option value="">Choose template</option>
            {templateList.map((template) => (
              <option key={template._id} value={template._id}>
                {template.template_name}
              </option>
            ))}
          </select>
        </div>
      </Card>

      <div className="space-y-3">
        {exerciseEntries.map((entry) => (
          <Card key={entry.localIdentifier} border className="overflow-hidden bg-white/95 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-display text-lg font-semibold text-navy-900">{entry.exerciseName}</p>
                <Badge size="small">{entry.sets.length} sets</Badge>
              </div>
              <button
                type="button"
                onClick={() => removeExercise(entry.localIdentifier)}
                className="rounded-full p-2 text-red-600 hover:bg-red-50"
              >
                <Trash2 size={16} />
              </button>
            </div>

            <div className="mt-3 space-y-3">
              {entry.sets.map((set, setIndex) => (
                <div key={`${entry.localIdentifier}-${setIndex}`} className="rounded-xl border border-navy-200 bg-navy-50/60 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-semibold text-navy-700">Set {setIndex + 1}</p>
                    <button
                      type="button"
                      onClick={() => removeSet(entry.localIdentifier, setIndex)}
                      className="text-xs font-medium text-red-600"
                    >
                      Remove
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-2">
                    <InputField
                      label="Kilograms"
                      type="number"
                      min={0}
                      step={0.5}
                      value={set.weight_in_kilograms}
                      onChange={(event) =>
                        updateSetValue(
                          entry.localIdentifier,
                          setIndex,
                          "weight_in_kilograms",
                          Number(event.target.value)
                        )
                      }
                    />
                    <InputField
                      label="Repetitions"
                      type="number"
                      min={1}
                      value={set.repetitions}
                      onChange={(event) =>
                        updateSetValue(
                          entry.localIdentifier,
                          setIndex,
                          "repetitions",
                          Number(event.target.value)
                        )
                      }
                    />
                    <InputField
                      label="RPE"
                      type="number"
                      min={1}
                      max={10}
                      value={set.rate_of_perceived_exertion}
                      onChange={(event) =>
                        updateSetValue(
                          entry.localIdentifier,
                          setIndex,
                          "rate_of_perceived_exertion",
                          Number(event.target.value)
                        )
                      }
                    />
                  </div>
                </div>
              ))}
            </div>

            <Button className="mt-3" variant="outline" size="sm" onClick={() => addSet(entry.localIdentifier)}>
              Add set
            </Button>
          </Card>
        ))}
      </div>

      {feedbackMessage ? (
        <Card border>
          <p className={feedbackType === "success" ? "text-emerald-700" : "text-red-700"}>{feedbackMessage}</p>
        </Card>
      ) : null}

      <div className="sticky bottom-20 z-20 -mx-4 border-t border-white/70 bg-white/95 px-4 py-3 backdrop-blur-xl">
        <Button fullWidth size="lg" isLoading={loading} onClick={submitWorkout}>
          Save workout
        </Button>
      </div>

      <Dialog open={selectorOpen} onClose={() => setSelectorOpen(false)} title="Select exercise">
        <InputField
          label="Search"
          value={searchPhrase}
          onChange={(event) => setSearchPhrase(event.target.value)}
          placeholder="Type exercise, muscle, or equipment"
        />

        <div className="mt-4 space-y-4">
          {Object.entries(exercisesByMuscleGroup)
            .sort(([first], [second]) => first.localeCompare(second))
            .map(([muscleGroup, exercises]) => {
              const availableExercises = exercises.filter((exercise) =>
                filteredExercises.some((item) => item._id === exercise._id)
              );
              if (availableExercises.length === 0) {
                return null;
              }
              return (
                <div key={muscleGroup}>
                    <p className="mb-2 text-sm font-semibold text-navy-700">{muscleGroup}</p>
                    <div className="space-y-2">
                    {availableExercises.map((exercise) => (
                      <button
                        key={exercise._id}
                        type="button"
                          className="w-full rounded-xl border border-navy-200 bg-white px-3 py-3 text-left shadow-sm hover:border-primary-500 hover:bg-primary-50"
                        onClick={() => addExercise(exercise)}
                      >
                        <p className="font-medium text-navy-900">{exercise.exercise_name}</p>
                        <p className="text-sm text-navy-600">{exercise.equipment_required}</p>
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
        </div>
      </Dialog>
    </ApplicationShell>
  );
}
