import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { format } from "date-fns";
import { CheckCircle2, Plus, Trash2 } from "lucide-react";
import { ApplicationShell } from "../components/layout/ApplicationShell";
import { Button } from "../components/common/Button";
import { Card } from "../components/common/Card";
import { Badge } from "../components/common/Badge";
import { Dialog } from "../components/common/Dialog";
import { InputField } from "../components/common/InputField";
import { exerciseAPI, templateAPI, workoutAPI } from "../services/api";
import type { ExerciseDefinition, Workout, WorkoutTemplate, WorkoutSet } from "../types";

interface ExerciseEntry {
  localIdentifier: string;
  exerciseName: string;
  exerciseDefinitionIdentifier: string;
  sets: WorkoutSet[];
}

interface LastUsedSetValues {
  repetitions?: number;
  weight_in_kilograms?: number;
  rate_of_perceived_exertion?: number;
}

const targetMuscleGroups = [
  "Push",
  "Pull",
  "Legs",
  "Upper body",
  "Lower body",
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
    rate_of_perceived_exertion: undefined,
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

function parseNumericInput(rawValue: string, fallbackValue: number, min?: number, max?: number) {
  const parsedValue = Number(rawValue);
  if (!Number.isFinite(parsedValue)) {
    return fallbackValue;
  }
  let nextValue = parsedValue;
  if (typeof min === "number") {
    nextValue = Math.max(min, nextValue);
  }
  if (typeof max === "number") {
    nextValue = Math.min(max, nextValue);
  }
  return nextValue;
}

function buildSetFieldKey(localIdentifier: string, setIndex: number, key: keyof WorkoutSet) {
  return `${localIdentifier}:${setIndex}:${key}`;
}

export function LogWorkoutPage() {
  const navigate = useNavigate();
  const { workoutId } = useParams<{ workoutId: string }>();
  const [searchParams] = useSearchParams();
  const [workoutDate, setWorkoutDate] = useState(() => format(new Date(), 'yyyy-MM-dd'));
  const [workoutTime, setWorkoutTime] = useState(() => format(new Date(), 'HH:mm'));
  const [selectedMuscleGroups, setSelectedMuscleGroups] = useState<string[]>([]);
  const [exerciseCatalogue, setExerciseCatalogue] = useState<ExerciseDefinition[]>([]);
  const [templateList, setTemplateList] = useState<WorkoutTemplate[]>([]);
  const [activeTemplateIdentifier, setActiveTemplateIdentifier] = useState("");
  const [exerciseEntries, setExerciseEntries] = useState<ExerciseEntry[]>([]);
  const [selectorOpen, setSelectorOpen] = useState(false);
  const [templateDialogOpen, setTemplateDialogOpen] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const [templateSaving, setTemplateSaving] = useState(false);
  const [searchPhrase, setSearchPhrase] = useState("");
  const [setDraftValues, setSetDraftValues] = useState<Record<string, string>>({});
  const [lastUsedValuesByExerciseKey, setLastUsedValuesByExerciseKey] = useState<Record<string, LastUsedSetValues>>({});
  const [loading, setLoading] = useState(false);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);
  const [feedbackType, setFeedbackType] = useState<"success" | "error" | null>(null);
  const isEditMode = Boolean(workoutId);
  const workoutDateTime = `${workoutDate}T${workoutTime}`;

  const applyWorkoutToForm = (workout: Workout) => {
    setSelectedMuscleGroups(workout.target_muscle_groups || []);
    setExerciseEntries(
      workout.exercises.map((exercise) => ({
        localIdentifier: crypto.randomUUID(),
        exerciseName: exercise.exercise_name,
        exerciseDefinitionIdentifier: exercise.exercise_definition_identifier || "",
        sets: exercise.sets,
      }))
    );
  };

  const resolveLastUsedSetValues = (entry: ExerciseEntry): LastUsedSetValues | null => {
    const byIdentifier = entry.exerciseDefinitionIdentifier
      ? lastUsedValuesByExerciseKey[entry.exerciseDefinitionIdentifier]
      : undefined;
    const byName = lastUsedValuesByExerciseKey[entry.exerciseName] || lastUsedValuesByExerciseKey[entry.exerciseName.toLowerCase()];
    return byIdentifier || byName || null;
  };

  const applyLastUsedToExercise = (entry: ExerciseEntry) => {
    const lastUsed = resolveLastUsedSetValues(entry);
    if (!lastUsed) {
      return;
    }

    setExerciseEntries((current) =>
      current.map((currentEntry) => {
        if (currentEntry.localIdentifier !== entry.localIdentifier) {
          return currentEntry;
        }

        return {
          ...currentEntry,
          sets: currentEntry.sets.map((set) => ({
            ...set,
            repetitions: typeof lastUsed.repetitions === "number" ? lastUsed.repetitions : set.repetitions,
            weight_in_kilograms:
              typeof lastUsed.weight_in_kilograms === "number"
                ? lastUsed.weight_in_kilograms
                : set.weight_in_kilograms,
            rate_of_perceived_exertion:
              typeof lastUsed.rate_of_perceived_exertion === "number"
                ? lastUsed.rate_of_perceived_exertion
                : set.rate_of_perceived_exertion,
          })),
        };
      })
    );
  };

  const adjustAllSets = (
    localIdentifier: string,
    adjustments: Partial<Pick<WorkoutSet, "repetitions" | "weight_in_kilograms">>
  ) => {
    setExerciseEntries((current) =>
      current.map((entry) => {
        if (entry.localIdentifier !== localIdentifier) {
          return entry;
        }

        return {
          ...entry,
          sets: entry.sets.map((set) => ({
            ...set,
            repetitions:
              typeof adjustments.repetitions === "number"
                ? Math.max(1, Math.round(set.repetitions + adjustments.repetitions))
                : set.repetitions,
            weight_in_kilograms:
              typeof adjustments.weight_in_kilograms === "number"
                ? Math.max(0, Math.round((set.weight_in_kilograms + adjustments.weight_in_kilograms) * 2) / 2)
                : set.weight_in_kilograms,
          })),
        };
      })
    );
  };

  useEffect(() => {
    const loadInitialData = async () => {
      const [exercises, templates] = await Promise.all([
        exerciseAPI.getAll(),
        templateAPI.getAll().catch(() => [] as WorkoutTemplate[]),
      ]);
      setExerciseCatalogue(exercises);
      setTemplateList(templates);

      try {
        const rawLastUsedValues = await workoutAPI.getLastUsedValues();
        const parsedValues = Object.entries(rawLastUsedValues || {}).reduce<Record<string, LastUsedSetValues>>((accumulator, [key, value]) => {
          if (!value || typeof value !== "object") {
            return accumulator;
          }

          const candidate = value as Record<string, unknown>;
          const parsed: LastUsedSetValues = {
            repetitions: typeof candidate.repetitions === "number" ? candidate.repetitions : undefined,
            weight_in_kilograms: typeof candidate.weight_in_kilograms === "number" ? candidate.weight_in_kilograms : undefined,
            rate_of_perceived_exertion:
              typeof candidate.rate_of_perceived_exertion === "number"
                ? candidate.rate_of_perceived_exertion
                : undefined,
          };

          accumulator[key] = parsed;
          accumulator[key.toLowerCase()] = parsed;
          return accumulator;
        }, {});
        setLastUsedValuesByExerciseKey(parsedValues);
      } catch {
        setLastUsedValuesByExerciseKey({});
      }

      if (isEditMode && workoutId) {
        try {
          const workout = await workoutAPI.getById(workoutId);
          const workoutMoment = format(new Date(workout.date_of_workout), "yyyy-MM-dd'T'HH:mm");
          setWorkoutDate(workoutMoment.slice(0, 10));
          setWorkoutTime(workoutMoment.slice(11));
          setSelectedMuscleGroups(workout.target_muscle_groups || []);
          setExerciseEntries(
            workout.exercises.map((exercise) => ({
              localIdentifier: crypto.randomUUID(),
              exerciseName: exercise.exercise_name,
              exerciseDefinitionIdentifier: exercise.exercise_definition_identifier || "",
              sets: exercise.sets,
            }))
          );
        } catch {
          setFeedbackType("error");
          setFeedbackMessage("Unable to load workout for editing.");
        }
        return;
      }

      const repeatWorkoutIdentifier = searchParams.get('repeat');
      if (repeatWorkoutIdentifier) {
        try {
          const repeatedWorkout = await workoutAPI.getById(repeatWorkoutIdentifier);
          const repeatedMoment = format(new Date(repeatedWorkout.date_of_workout), "yyyy-MM-dd'T'HH:mm");
          setWorkoutDate(repeatedMoment.slice(0, 10));
          setWorkoutTime(repeatedMoment.slice(11));
          applyWorkoutToForm(repeatedWorkout);
          setFeedbackType("success");
          setFeedbackMessage("Loaded a previous workout to repeat.");
        } catch {
          setFeedbackType("error");
          setFeedbackMessage("Unable to load the selected workout right now.");
        }
        return;
      }

      const initialSource = searchParams.get('source');
      if (initialSource === 'last') {
        try {
          const lastWorkout = await workoutAPI.getLast();
          if (!lastWorkout) {
            setFeedbackType("error");
            setFeedbackMessage("No previous workout found to repeat.");
            return;
          }

          const lastMoment = format(new Date(lastWorkout.date_of_workout), "yyyy-MM-dd'T'HH:mm");
          setWorkoutDate(lastMoment.slice(0, 10));
          setWorkoutTime(lastMoment.slice(11));
          applyWorkoutToForm(lastWorkout);
          setFeedbackType("success");
          setFeedbackMessage("Loaded your last workout as a starting point.");
        } catch {
          setFeedbackType("error");
          setFeedbackMessage("Unable to load your last workout right now.");
        }
        return;
      }

      const templateId = searchParams.get('template');
      if (templateId) {
        try {
          const template = await templateAPI.getById(templateId);
          setActiveTemplateIdentifier(template._id);
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
  }, [isEditMode, searchParams, workoutId]);

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

  const sessionSummary = useMemo(() => {
    const totalSets = exerciseEntries.reduce((accumulator, entry) => accumulator + entry.sets.length, 0);
    const totalVolume = Math.round(
      exerciseEntries.reduce(
        (entryVolume, entry) =>
          entryVolume +
          entry.sets.reduce(
            (setVolume, set) => setVolume + set.weight_in_kilograms * set.repetitions,
            0
          ),
        0
      )
    );

    return {
      totalSets,
      totalVolume,
    };
  }, [exerciseEntries]);

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
    value: number | undefined
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

  const updateSetDraft = (
    localIdentifier: string,
    setIndex: number,
    key: keyof WorkoutSet,
    rawValue: string
  ) => {
    const fieldKey = buildSetFieldKey(localIdentifier, setIndex, key);
    setSetDraftValues((current) => ({
      ...current,
      [fieldKey]: rawValue,
    }));
  };

  const clearSetDraft = (localIdentifier: string, setIndex: number, key: keyof WorkoutSet) => {
    const fieldKey = buildSetFieldKey(localIdentifier, setIndex, key);
    setSetDraftValues((current) => {
      if (!(fieldKey in current)) {
        return current;
      }
      const nextDraftValues = { ...current };
      delete nextDraftValues[fieldKey];
      return nextDraftValues;
    });
  };

  const commitSetNumericValue = (
    localIdentifier: string,
    setIndex: number,
    key: keyof WorkoutSet,
    rawValue: string,
    fallbackValue: number,
    min?: number,
    max?: number,
    allowEmpty = false
  ) => {
    const trimmedValue = rawValue.trim();
    if (!trimmedValue) {
      if (allowEmpty) {
        updateSetValue(localIdentifier, setIndex, key, undefined);
      }
      clearSetDraft(localIdentifier, setIndex, key);
      return;
    }

    const nextValue = parseNumericInput(trimmedValue, fallbackValue, min, max);
    updateSetValue(localIdentifier, setIndex, key, nextValue);
    clearSetDraft(localIdentifier, setIndex, key);
  };

  const loadTemplate = (templateIdentifier: string) => {
    setActiveTemplateIdentifier(templateIdentifier);
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

  const openTemplateSaveDialog = () => {
    if (exerciseEntries.length === 0) {
      setFeedbackType("error");
      setFeedbackMessage("Add exercises before saving a template.");
      return;
    }

    const suggestedName = selectedMuscleGroups.length > 0
      ? `${selectedMuscleGroups.slice(0, 2).join(" and ")} session`
      : "My training template";

    setTemplateName(suggestedName);
    setTemplateDialogOpen(true);
  };

  const saveTemplateFromCurrentWorkout = async () => {
    const trimmedName = templateName.trim();
    if (!trimmedName) {
      setFeedbackType("error");
      setFeedbackMessage("Template name is required.");
      return;
    }

    try {
      setTemplateSaving(true);
      await templateAPI.create({
        template_name: trimmedName,
        target_muscle_groups: selectedMuscleGroups,
        exercises: exerciseEntries.map((entry) => ({
          exercise_name: entry.exerciseName,
          exercise_definition_identifier: entry.exerciseDefinitionIdentifier,
          sets: entry.sets,
        })),
      });
      const refreshedTemplates = await templateAPI.getAll();
      setTemplateList(refreshedTemplates);
      setTemplateDialogOpen(false);
      setFeedbackType("success");
      setFeedbackMessage("Template saved.");
    } catch {
      setFeedbackType("error");
      setFeedbackMessage("Unable to save template right now.");
    } finally {
      setTemplateSaving(false);
    }
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
      const payload = {
        date_of_workout: dateObject.toISOString(),
        target_muscle_groups: selectedMuscleGroups,
        exercises: exerciseEntries.map((entry) => ({
          exercise_name: entry.exerciseName,
          exercise_definition_identifier: entry.exerciseDefinitionIdentifier,
          sets: entry.sets,
        })),
      };

      if (isEditMode && workoutId) {
        await workoutAPI.update(workoutId, payload);
        setFeedbackType("success");
        setFeedbackMessage("Workout updated successfully.");
        navigate(`/workouts/${workoutId}`);
      } else {
        await workoutAPI.create(payload);
        setFeedbackType("success");
        setFeedbackMessage("Workout saved successfully.");
        setExerciseEntries([]);
        setSelectedMuscleGroups([]);
        setActiveTemplateIdentifier("");
      }
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
      title={isEditMode ? "Edit workout" : "Log workout"}
      action={
        <Button size="sm" onClick={() => setSelectorOpen(true)} icon={<Plus size={16} />}>
          Add exercise
        </Button>
      }
    >
      <Card border className="space-y-4 transition-shadow duration-200">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary-700">Session studio</p>
          <p className="mt-1 font-display text-xl font-semibold text-navy-900">
            {isEditMode ? "Edit workout" : "Log workout"}
          </p>
          <p className="mt-1 text-sm text-navy-600">
            {isEditMode
              ? "Update time, sets, and exercises."
              : "Choose muscles, load a template, then add exercises."}
          </p>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <InputField
            label="Workout date"
            type="date"
            value={workoutDate}
            onChange={(event) => setWorkoutDate(event.target.value)}
            className="text-left"
          />
          <InputField
            label="Workout time"
            type="time"
            value={workoutTime}
            onChange={(event) => setWorkoutTime(event.target.value)}
            className="text-left"
          />
        </div>
        <p className="text-xs text-navy-500">Date and time are separated on mobile so the picker stays readable and aligned.</p>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-xl border border-navy-300/70 bg-navy-100/70 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-navy-500">Muscles</p>
            <p className="mt-1 font-display text-lg font-semibold text-navy-900">{selectedMuscleGroups.length}</p>
          </div>
          <div className="rounded-xl border border-navy-300/70 bg-navy-100/70 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-navy-500">Exercises</p>
            <p className="mt-1 font-display text-lg font-semibold text-navy-900">{exerciseEntries.length}</p>
          </div>
          <div className="rounded-xl border border-primary-300/50 bg-primary-100/30 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary-700">Sets</p>
            <p className="mt-1 font-display text-lg font-semibold text-primary-900">{sessionSummary.totalSets}</p>
          </div>
          <div className="rounded-xl border border-navy-300/70 bg-navy-100/70 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-navy-500">Volume</p>
            <p className="mt-1 font-display text-lg font-semibold text-navy-900">{sessionSummary.totalVolume} kg</p>
          </div>
        </div>
      </Card>

      <Card border className="transition-shadow duration-200">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-navy-500">Target muscles</p>
            <p className="mt-1 font-display text-lg font-semibold text-navy-900">Muscle groups</p>
          </div>
          {selectedMuscleGroups.length > 0 ? (
            <button type="button" className="touch-target rounded-lg px-2 text-sm font-semibold text-primary-700 hover:bg-primary-100/25" onClick={() => setSelectedMuscleGroups([])}>
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
                className={`touch-target rounded-full border px-3 py-2 text-sm font-semibold transition-[transform,background-color,color,border-color,box-shadow] duration-150 active:scale-[0.98] ${
                  selected
                    ? "border-primary-500 bg-primary-500 text-navy-100 shadow-[0_8px_18px_rgba(184,138,59,0.28)]"
                    : "border-navy-300 bg-navy-100/80 text-navy-700 hover:border-navy-400 hover:text-navy-900"
                }`}
              >
                {selected ? <CheckCircle2 size={14} className="mr-1 inline-block" /> : null}
                {muscleGroup}
              </button>
            );
          })}
        </div>
      </Card>

      <Card border className="transition-shadow duration-200">
        <div className="flex items-center justify-between gap-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-navy-500">Templates</p>
            <p className="mt-1 font-display text-lg font-semibold text-navy-900">Use saved routine</p>
          </div>
          <div className="min-w-[9.5rem]">
            <label htmlFor="template-selector" className="sr-only">Choose template</label>
            <select
              id="template-selector"
              className="h-11 w-full rounded-lg border border-navy-300 bg-navy-100/80 px-3 text-sm text-navy-900 shadow-sm"
              value={activeTemplateIdentifier}
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
        </div>
      </Card>

      <div className="space-y-3">
        {exerciseEntries.length === 0 ? (
          <Card border className="transition-colors duration-200">
            <p className="text-sm text-navy-600">No exercises yet. Tap Add exercise to begin.</p>
          </Card>
        ) : null}

        {exerciseEntries.map((entry) => (
          <Card key={entry.localIdentifier} border className="overflow-hidden bg-navy-100/95 shadow-sm transition-shadow duration-200">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-display text-lg font-semibold text-navy-900">{entry.exerciseName}</p>
                <Badge size="small">{entry.sets.length} sets</Badge>
              </div>
              <button
                type="button"
                onClick={() => removeExercise(entry.localIdentifier)}
                className="touch-target rounded-full p-2 text-red-300 hover:bg-red-500/10"
                aria-label={`Remove ${entry.exerciseName}`}
              >
                <Trash2 size={16} />
              </button>
            </div>

            <div className="mt-3 flex flex-wrap gap-2">
              {resolveLastUsedSetValues(entry) ? (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => applyLastUsedToExercise(entry)}
                >
                  Use last for {entry.exerciseName}
                </Button>
              ) : null}
              <Button size="sm" variant="outline" onClick={() => adjustAllSets(entry.localIdentifier, { weight_in_kilograms: 2.5 })}>
                +2.5 kg all
              </Button>
              <Button size="sm" variant="outline" onClick={() => adjustAllSets(entry.localIdentifier, { weight_in_kilograms: -2.5 })}>
                -2.5 kg all
              </Button>
              <Button size="sm" variant="outline" onClick={() => adjustAllSets(entry.localIdentifier, { repetitions: 1 })}>
                +1 rep all
              </Button>
              <Button size="sm" variant="outline" onClick={() => adjustAllSets(entry.localIdentifier, { repetitions: -1 })}>
                -1 rep all
              </Button>
            </div>

            <div className="mt-3 space-y-3">
              {entry.sets.map((set, setIndex) => (
                <div key={`${entry.localIdentifier}-${setIndex}`} className="rounded-xl border border-navy-200 bg-navy-50/60 p-3">
                  <div className="mb-2 flex items-center justify-between">
                    <p className="text-sm font-semibold text-navy-700">Set {setIndex + 1}</p>
                    {entry.sets.length > 1 ? (
                      <button
                        type="button"
                        onClick={() => removeSet(entry.localIdentifier, setIndex)}
                        className="touch-target rounded-lg px-2 text-xs font-semibold text-red-300 hover:bg-red-500/10"
                      >
                        Remove
                      </button>
                    ) : (
                      <span className="text-[11px] text-navy-500">Minimum 1 set</span>
                    )}
                  </div>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                    <InputField
                      label="Kilograms"
                      type="number"
                      min={0}
                      step={0.5}
                      inputMode="decimal"
                      value={
                        setDraftValues[buildSetFieldKey(entry.localIdentifier, setIndex, "weight_in_kilograms")] ??
                        String(set.weight_in_kilograms)
                      }
                      onFocus={(event) => event.currentTarget.select()}
                      onChange={(event) =>
                        updateSetDraft(entry.localIdentifier, setIndex, "weight_in_kilograms", event.target.value)
                      }
                      onBlur={(event) =>
                        commitSetNumericValue(
                          entry.localIdentifier,
                          setIndex,
                          "weight_in_kilograms",
                          event.target.value,
                          set.weight_in_kilograms,
                          0
                        )
                      }
                    />
                    <InputField
                      label="Repetitions"
                      type="number"
                      min={1}
                      inputMode="numeric"
                      value={
                        setDraftValues[buildSetFieldKey(entry.localIdentifier, setIndex, "repetitions")] ??
                        String(set.repetitions)
                      }
                      onFocus={(event) => event.currentTarget.select()}
                      onChange={(event) =>
                        updateSetDraft(entry.localIdentifier, setIndex, "repetitions", event.target.value)
                      }
                      onBlur={(event) =>
                        commitSetNumericValue(
                          entry.localIdentifier,
                          setIndex,
                          "repetitions",
                          event.target.value,
                          set.repetitions,
                          1
                        )
                      }
                    />
                    <InputField
                      label="RPE (optional)"
                      type="number"
                      min={1}
                      max={10}
                      inputMode="numeric"
                      placeholder="Leave blank"
                      value={
                        setDraftValues[buildSetFieldKey(entry.localIdentifier, setIndex, "rate_of_perceived_exertion")] ??
                        (set.rate_of_perceived_exertion !== undefined
                          ? String(set.rate_of_perceived_exertion)
                          : "")
                      }
                      onFocus={(event) => event.currentTarget.select()}
                      onChange={(event) =>
                        updateSetDraft(entry.localIdentifier, setIndex, "rate_of_perceived_exertion", event.target.value)
                      }
                      onBlur={(event) =>
                        commitSetNumericValue(
                          entry.localIdentifier,
                          setIndex,
                          "rate_of_perceived_exertion",
                          event.target.value,
                          set.rate_of_perceived_exertion ?? 7,
                          1,
                          10,
                          true
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
        <Card border className={feedbackType === "success" ? "border-primary-400/45 bg-primary-100/20" : "border-red-500/40 bg-red-500/10"}>
          <div className="flex items-start gap-2">
            {feedbackType === "success" ? (
              <CheckCircle2 size={16} className="mt-0.5 text-primary-700" />
            ) : null}
            <p role="status" aria-live="polite" className={feedbackType === "success" ? "text-primary-900" : "text-red-300"}>{feedbackMessage}</p>
          </div>
        </Card>
      ) : null}

      <div className="sticky bottom-20 z-20 -mx-4 border-t border-navy-300/70 bg-navy-100/92 px-4 py-3 shadow-[0_-10px_26px_rgba(8,14,26,0.45)] backdrop-blur-xl">
        <div className="grid grid-cols-2 gap-2">
          <Button size="lg" variant="outline" onClick={openTemplateSaveDialog} disabled={templateSaving || loading}>
            Save template
          </Button>
          <Button size="lg" isLoading={loading} onClick={submitWorkout}>
            {isEditMode ? "Update" : "Save"}
          </Button>
        </div>
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
                          className="w-full rounded-xl border border-navy-300 bg-navy-100 px-3 py-3 text-left shadow-sm transition-[transform,background-color,border-color] duration-200 active:scale-[0.99] hover:border-primary-500 hover:bg-primary-100/30"
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

      <Dialog
        open={templateDialogOpen}
        onClose={() => setTemplateDialogOpen(false)}
        title="Save as template"
        footer={(
          <div className="flex items-center justify-end gap-2">
            <Button variant="ghost" onClick={() => setTemplateDialogOpen(false)}>
              Cancel
            </Button>
            <Button isLoading={templateSaving} onClick={saveTemplateFromCurrentWorkout}>
              Save template
            </Button>
          </div>
        )}
      >
        <p className="mb-3 text-sm text-navy-700">
          Save this layout to reuse it next time.
        </p>
        <InputField
          label="Template name"
          value={templateName}
          onChange={(event) => setTemplateName(event.target.value)}
          placeholder="Upper body strength"
        />
      </Dialog>
    </ApplicationShell>
  );
}
