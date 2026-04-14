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
import { useKeyboardVisibility } from "../hooks/useKeyboardVisibility";
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

interface WorkoutDraftPayload {
  workoutDate: string;
  workoutTime: string;
  selectedMuscleGroups: string[];
  exerciseEntries: ExerciseEntry[];
  savedAt: string;
}

const WORKOUT_DRAFT_STORAGE_KEY = "gym_workout_logger_active_workout_draft";

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

function isIOSDevice() {
  if (typeof navigator === "undefined") {
    return false;
  }

  const userAgent = navigator.userAgent || "";
  const platform = navigator.platform || "";
  const maxTouchPoints = (navigator as Navigator & { maxTouchPoints?: number }).maxTouchPoints || 0;

  return /iPad|iPhone|iPod/.test(userAgent) || (platform === "MacIntel" && maxTouchPoints > 1);
}

function normalizeIsoDateValue(rawValue: string) {
  const trimmedValue = rawValue.trim();
  if (!trimmedValue) {
    return "";
  }

  const matchedValue = trimmedValue.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (!matchedValue) {
    return "";
  }

  const year = Number(matchedValue[1]);
  const month = Number(matchedValue[2]);
  const day = Number(matchedValue[3]);
  const date = new Date(Date.UTC(year, month - 1, day));

  if (
    Number.isNaN(date.getTime()) ||
    date.getUTCFullYear() !== year ||
    date.getUTCMonth() !== month - 1 ||
    date.getUTCDate() !== day
  ) {
    return "";
  }

  return `${matchedValue[1]}-${matchedValue[2]}-${matchedValue[3]}`;
}

function normalizeTimeValue(rawValue: string) {
  const trimmedValue = rawValue.trim();
  if (!trimmedValue) {
    return "";
  }

  const matchedValue = trimmedValue.match(/^(\d{1,2})(?::(\d{1,2}))$/);
  if (!matchedValue) {
    return "";
  }

  const hours = Number(matchedValue[1]);
  const minutes = Number(matchedValue[2]);

  if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return "";
  }

  return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function formatDateInputMask(rawValue: string) {
  const digitsOnly = rawValue.replace(/\D/g, "").slice(0, 8);
  if (digitsOnly.length <= 4) {
    return digitsOnly;
  }
  if (digitsOnly.length <= 6) {
    return `${digitsOnly.slice(0, 4)}-${digitsOnly.slice(4)}`;
  }
  return `${digitsOnly.slice(0, 4)}-${digitsOnly.slice(4, 6)}-${digitsOnly.slice(6, 8)}`;
}

function formatTimeInputMask(rawValue: string) {
  const digitsOnly = rawValue.replace(/\D/g, "").slice(0, 4);
  if (digitsOnly.length <= 2) {
    return digitsOnly;
  }
  return `${digitsOnly.slice(0, 2)}:${digitsOnly.slice(2, 4)}`;
}

export function LogWorkoutPage() {
  const navigate = useNavigate();
  const { workoutId } = useParams<{ workoutId: string }>();
  const keyboardVisible = useKeyboardVisibility();
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
  const [isIOSFallback, setIsIOSFallback] = useState(false);
  const isEditMode = Boolean(workoutId);
  const shouldUseDraftPersistence = !isEditMode;
  const shouldAutoSelectNumericInput = useMemo(() => {
    if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
      return false;
    }
    return !window.matchMedia("(pointer: coarse)").matches;
  }, []);

  useEffect(() => {
    setIsIOSFallback(isIOSDevice());
  }, []);

  const readDraftFromStorage = (): WorkoutDraftPayload | null => {
    if (!shouldUseDraftPersistence) {
      return null;
    }
    try {
      const rawValue = window.localStorage.getItem(WORKOUT_DRAFT_STORAGE_KEY);
      if (!rawValue) {
        return null;
      }
      const parsedValue = JSON.parse(rawValue) as WorkoutDraftPayload;
      if (
        !parsedValue ||
        typeof parsedValue.workoutDate !== "string" ||
        typeof parsedValue.workoutTime !== "string" ||
        !Array.isArray(parsedValue.selectedMuscleGroups) ||
        !Array.isArray(parsedValue.exerciseEntries)
      ) {
        return null;
      }
      return parsedValue;
    } catch {
      return null;
    }
  };

  const saveDraftToStorage = () => {
    if (!shouldUseDraftPersistence) {
      return;
    }
    const payload: WorkoutDraftPayload = {
      workoutDate,
      workoutTime,
      selectedMuscleGroups,
      exerciseEntries,
      savedAt: new Date().toISOString(),
    };
    try {
      window.localStorage.setItem(WORKOUT_DRAFT_STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Ignore storage write errors (quota/private mode/etc)
    }
  };

  const clearDraftFromStorage = () => {
    if (!shouldUseDraftPersistence) {
      return;
    }
    try {
      window.localStorage.removeItem(WORKOUT_DRAFT_STORAGE_KEY);
    } catch {
      // Ignore storage remove errors
    }
  };

  const discardDraftAndReset = () => {
    clearDraftFromStorage();
    setWorkoutDate(format(new Date(), 'yyyy-MM-dd'));
    setWorkoutTime(format(new Date(), 'HH:mm'));
    setSelectedMuscleGroups([]);
    setExerciseEntries([]);
    setActiveTemplateIdentifier("");
    setSetDraftValues({});
    setFeedbackType("success");
    setFeedbackMessage("Draft discarded.");
  };

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

      const templateId = searchParams.get("template_id") ?? searchParams.get("template");
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

      const hasExplicitSource = Boolean(
        searchParams.get("template_id") ||
        searchParams.get("template") ||
        searchParams.get("repeat") ||
        searchParams.get("source")
      );
      if (!isEditMode && !hasExplicitSource) {
        const draft = readDraftFromStorage();
        if (draft) {
          setWorkoutDate(draft.workoutDate);
          setWorkoutTime(draft.workoutTime);
          setSelectedMuscleGroups(draft.selectedMuscleGroups);
          setExerciseEntries(draft.exerciseEntries);
          setFeedbackType("success");
          setFeedbackMessage("Recovered your workout draft.");
        }
      }
    };

    void loadInitialData();
  }, [isEditMode, searchParams, workoutId]);

  useEffect(() => {
    if (!shouldUseDraftPersistence) {
      return;
    }
    const autoSaveTimer = window.setTimeout(() => {
      saveDraftToStorage();
    }, 500);
    return () => {
      window.clearTimeout(autoSaveTimer);
    };
  }, [shouldUseDraftPersistence, workoutDate, workoutTime, selectedMuscleGroups, exerciseEntries]);

  useEffect(() => {
    if (!shouldUseDraftPersistence) {
      return;
    }
    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (exerciseEntries.length === 0) {
        return;
      }
      saveDraftToStorage();
      event.preventDefault();
      event.returnValue = "";
    };
    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
    };
  }, [shouldUseDraftPersistence, exerciseEntries]);

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

    const normalizedDate = normalizeIsoDateValue(workoutDate);
    const normalizedTime = normalizeTimeValue(workoutTime);

    if (!normalizedDate || !normalizedTime) {
      setFeedbackType("error");
      setFeedbackMessage("Use a valid date and time. Date: YYYY-MM-DD, time: HH:MM (24-hour).");
      return;
    }

    if (normalizedDate !== workoutDate) {
      setWorkoutDate(normalizedDate);
    }
    if (normalizedTime !== workoutTime) {
      setWorkoutTime(normalizedTime);
    }

    setLoading(true);
    setFeedbackMessage(null);

    try {
      const dateObject = new Date(`${normalizedDate}T${normalizedTime}`);
      if (Number.isNaN(dateObject.getTime())) {
        throw new Error("Invalid workout date or time.");
      }
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
        clearDraftFromStorage();
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

  const fillCurrentDateTime = () => {
    const now = new Date();
    setWorkoutDate(format(now, "yyyy-MM-dd"));
    setWorkoutTime(format(now, "HH:mm"));
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
              : "Choose muscles, start from a template, then add exercises."}
          </p>
        </div>

        <div className="mx-auto grid w-full max-w-md grid-cols-1 gap-3 overflow-hidden sm:max-w-none sm:grid-cols-2">
          <InputField
            label="Workout date"
            type={isIOSFallback ? "text" : "date"}
            value={workoutDate}
            onChange={(event) => {
              if (isIOSFallback) {
                setWorkoutDate(formatDateInputMask(event.target.value));
                return;
              }
              setWorkoutDate(event.target.value);
            }}
            onBlur={() => {
              if (!isIOSFallback) {
                return;
              }
              const normalizedDate = normalizeIsoDateValue(workoutDate);
              if (!normalizedDate && workoutDate.trim()) {
                setFeedbackType("error");
                setFeedbackMessage("Date format: YYYY-MM-DD.");
                return;
              }
              if (normalizedDate) {
                setWorkoutDate(normalizedDate);
              }
            }}
            inputMode={isIOSFallback ? "numeric" : undefined}
            placeholder={isIOSFallback ? "YYYY-MM-DD" : undefined}
            className="min-w-0"
          />
          <InputField
            label="Workout time"
            type={isIOSFallback ? "text" : "time"}
            value={workoutTime}
            onChange={(event) => {
              if (isIOSFallback) {
                setWorkoutTime(formatTimeInputMask(event.target.value));
                return;
              }
              setWorkoutTime(event.target.value);
            }}
            onBlur={() => {
              if (!isIOSFallback) {
                return;
              }
              const normalizedTime = normalizeTimeValue(workoutTime);
              if (!normalizedTime && workoutTime.trim()) {
                setFeedbackType("error");
                setFeedbackMessage("Time format: HH:MM (24-hour).");
                return;
              }
              if (normalizedTime) {
                setWorkoutTime(normalizedTime);
              }
            }}
            inputMode={isIOSFallback ? "numeric" : undefined}
            placeholder={isIOSFallback ? "HH:MM" : undefined}
            className="min-w-0"
          />
        </div>
        {isIOSFallback ? (
          <div className="flex justify-end">
            <button
              type="button"
              onClick={fillCurrentDateTime}
              className="touch-target rounded-lg border border-navy-300/70 px-2.5 py-1 text-xs font-semibold text-navy-700 transition-colors hover:bg-navy-100/70"
            >
              Use now
            </button>
          </div>
        ) : null}
        <p className="text-xs text-navy-500">
          {isIOSFallback
            ? "iPhone mode: type numbers only. Date auto-formats to YYYY-MM-DD and time to HH:MM."
            : "Date and time are separated on mobile so the picker stays readable and aligned."}
        </p>

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

      {!isEditMode ? (
        <Card border className="transition-shadow duration-200">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-navy-500">Draft safety</p>
              <p className="mt-1 text-sm text-navy-700">Changes auto-save while you log so refreshes do not lose progress.</p>
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={saveDraftToStorage}>Save draft now</Button>
              <Button size="sm" variant="ghost" onClick={discardDraftAndReset}>Discard draft</Button>
            </div>
          </div>
        </Card>
      ) : null}

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
                      onFocus={shouldAutoSelectNumericInput ? (event) => event.currentTarget.select() : undefined}
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
                      onFocus={shouldAutoSelectNumericInput ? (event) => event.currentTarget.select() : undefined}
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
                      onFocus={shouldAutoSelectNumericInput ? (event) => event.currentTarget.select() : undefined}
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

      <div
        className={`sticky bottom-[calc(4.625rem+env(safe-area-inset-bottom))] z-20 -mx-4 border-t border-navy-300/70 bg-navy-100/92 px-4 py-3 shadow-[0_-10px_26px_rgba(8,14,26,0.45)] backdrop-blur-xl transition-all duration-200 ${
          keyboardVisible ? "pointer-events-none translate-y-4 opacity-0" : "translate-y-0 opacity-100"
        }`}
      >
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
          autoFocus
        />

        <div className="mt-4 min-h-[18rem] space-y-4">
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
