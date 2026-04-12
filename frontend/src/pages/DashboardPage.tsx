import { useEffect, useMemo, useState, type ComponentType } from "react";
import { useNavigate } from "react-router-dom";
import { differenceInCalendarDays, format } from "date-fns";
import { Activity, ArrowRight, CalendarDays, ChevronRight, Flame, Repeat2, Scale, Sparkles, Trash2, Wand2 } from "lucide-react";
import { ApplicationShell } from "../components/layout/ApplicationShell";
import { Card } from "../components/common/Card";
import { Badge } from "../components/common/Badge";
import { Button } from "../components/common/Button";
import { Tabs } from "../components/common/Tabs";
import { exerciseAPI, goalAPI, workoutAPI } from "../services/api";
import type { AnalyticsData, ExerciseDefinition, ExerciseGoalProgress, Workout } from "../types";

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

export function DashboardPage() {
  const navigate = useNavigate();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [recentWorkouts, setRecentWorkouts] = useState<Workout[]>([]);
  const [selectedRange, setSelectedRange] = useState("30");
  const [loading, setLoading] = useState(true);
  const [deletingWorkoutIdentifier, setDeletingWorkoutIdentifier] = useState<string | null>(null);
  const [sessionFeedback, setSessionFeedback] = useState<string | null>(null);
  const [goals, setGoals] = useState<ExerciseGoalProgress[]>([]);
  const [exerciseDefinitions, setExerciseDefinitions] = useState<ExerciseDefinition[]>([]);
  const [goalFeedback, setGoalFeedback] = useState<string | null>(null);
  const [creatingGoal, setCreatingGoal] = useState(false);
  const [deletingGoalIdentifier, setDeletingGoalIdentifier] = useState<string | null>(null);
  const [editingGoalIdentifier, setEditingGoalIdentifier] = useState<string | null>(null);
  const [savingGoalIdentifier, setSavingGoalIdentifier] = useState<string | null>(null);
  const [isIOSFallback, setIsIOSFallback] = useState(false);
  const [goalFilter, setGoalFilter] = useState<"all" | "in_progress" | "achieved">("all");
  const [goalForm, setGoalForm] = useState({
    exercise_definition_identifier: "",
    exercise_name: "",
    target_weight_in_kilograms: "",
    target_repetitions: "",
    target_date: "",
  });
  const [editGoalForm, setEditGoalForm] = useState({
    target_weight_in_kilograms: "",
    target_repetitions: "",
    target_date: "",
  });

  useEffect(() => {
    setIsIOSFallback(isIOSDevice());
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const analyticsResponse = await workoutAPI.getAnalytics(Number(selectedRange));
        setAnalyticsData(analyticsResponse);

        const workoutsResponse = await workoutAPI.getAll(1, 10);
        setRecentWorkouts(workoutsResponse.workouts || []);

        const goalsResponse = await goalAPI.getAll();
        setGoals(goalsResponse);

        const exercisesResponse = await exerciseAPI.getAll();
        setExerciseDefinitions(exercisesResponse);
      } finally {
        setLoading(false);
      }
    };

    void loadData();
  }, [selectedRange]);

  const summaryCards = useMemo(() => {
    if (!analyticsData) {
      return [];
    }

    return [
      {
        key: "workouts",
        title: "Workouts",
        value: analyticsData.summary.total_workouts,
        icon: Activity,
      },
      {
        key: "volume",
        title: "Total volume",
        value: `${Math.round(analyticsData.summary.total_volume)} kilograms`,
        icon: Scale,
      },
      {
        key: "streak",
        title: "Weekly streak",
        value: `${analyticsData.summary.current_training_streak_weeks} weeks`,
        icon: Flame,
      },
      {
        key: "average-rpe",
        title: "Average RPE",
        value: analyticsData.summary.average_session_rpe.toFixed(1),
        icon: CalendarDays,
      },
    ];
  }, [analyticsData]);

  const dashboardInsights = useMemo(() => {
    if (!analyticsData) {
      return [];
    }

    const strongestExercise = analyticsData.leaderboards.personal_records[0];
    const latestWorkout = recentWorkouts[0];
    const daysSinceLastWorkout = latestWorkout
      ? differenceInCalendarDays(new Date(), new Date(latestWorkout.date_of_workout))
      : null;
    const leadingMuscleGroup = analyticsData.charts.muscle_group_distribution.labels[0];

    const insights: Array<{ title: string; value: string; detail: string; icon: ComponentType<{ size?: number }> }> = [
      {
        title: "Current push",
        value: `${analyticsData.summary.current_training_streak_weeks} week streak`,
        detail: daysSinceLastWorkout !== null
          ? daysSinceLastWorkout === 0
            ? "You trained today. Keep momentum with a short accessory session."
            : daysSinceLastWorkout === 1
              ? "You trained yesterday. Great spot for a lighter upper-body follow-up."
              : `It has been ${daysSinceLastWorkout} days since your last workout. Ready to log one?`
          : "Log your first session to unlock recovery timing.",
        icon: Flame,
      },
      {
        title: "Strongest lift",
        value: strongestExercise
          ? `${strongestExercise.exercise_name} · ${Math.round(strongestExercise.estimated_one_rep_maximum)} kg`
          : `${Math.round(analyticsData.summary.strongest_estimated_one_rep_maximum)} kg best 1RM`,
        detail: strongestExercise
          ? `Latest PR recorded on ${format(new Date(strongestExercise.date), "d MMM")}.`
          : "Log more top sets to reveal exercise-specific peaks.",
        icon: Wand2,
      },
      {
        title: "Training focus",
        value: leadingMuscleGroup || "Balanced",
        detail: leadingMuscleGroup
          ? `${leadingMuscleGroup} is your most trained category in this range.`
          : "Your muscle distribution will appear after more logged sessions.",
        icon: Sparkles,
      },
    ];

    return insights;
  }, [analyticsData, recentWorkouts]);

  const rangeLabel = selectedRange === "7" ? "This week" : selectedRange === "30" ? "This month" : "This quarter";

  const filteredGoals = useMemo(() => {
    if (goalFilter === "achieved") {
      return goals.filter((goal) => goal.is_achieved);
    }
    if (goalFilter === "in_progress") {
      return goals.filter((goal) => !goal.is_achieved);
    }
    return goals;
  }, [goalFilter, goals]);

  const goalInsights = useMemo(() => {
    const inProgressGoals = goals.filter((goal) => !goal.is_achieved);
    const closestGoal = [...inProgressGoals].sort((firstGoal, secondGoal) => secondGoal.progress_percentage - firstGoal.progress_percentage)[0];
    const easiestGoal = [...inProgressGoals].sort(
      (firstGoal, secondGoal) =>
        (firstGoal.target_estimated_one_rep_maximum - firstGoal.current_best_estimated_one_rep_maximum)
        - (secondGoal.target_estimated_one_rep_maximum - secondGoal.current_best_estimated_one_rep_maximum)
    )[0];
    const dueSoonGoal = [...inProgressGoals]
      .filter((goal) => Boolean(goal.target_date))
      .sort((firstGoal, secondGoal) => new Date(firstGoal.target_date || "").getTime() - new Date(secondGoal.target_date || "").getTime())[0];

    return {
      closestGoal,
      easiestGoal,
      dueSoonGoal,
      achievedCount: goals.filter((goal) => goal.is_achieved).length,
    };
  }, [goals]);

  const deleteRecentWorkout = async (workout: Workout) => {
    const confirmed = window.confirm("Delete this workout session permanently?");
    if (!confirmed) {
      return;
    }
    try {
      setDeletingWorkoutIdentifier(workout._id);
      await workoutAPI.delete(workout._id);
      setRecentWorkouts((current) => current.filter((entry) => entry._id !== workout._id));
      const refreshedAnalytics = await workoutAPI.getAnalytics(Number(selectedRange));
      setAnalyticsData(refreshedAnalytics);
      setSessionFeedback("Workout deleted.");
    } catch {
      setSessionFeedback("Unable to delete workout right now.");
    } finally {
      setDeletingWorkoutIdentifier(null);
    }
  };

  const createGoal = async () => {
    const selectedExercise = exerciseDefinitions.find(
      (exerciseDefinition) => exerciseDefinition._id === goalForm.exercise_definition_identifier
    );
    const exerciseName = selectedExercise?.exercise_name || goalForm.exercise_name.trim();
    const targetWeight = Number(goalForm.target_weight_in_kilograms);
    const targetRepetitions = Number(goalForm.target_repetitions);

    if (!selectedExercise || !exerciseName || targetWeight <= 0 || targetRepetitions <= 0) {
      setGoalFeedback("Select an exercise and complete all required target fields.");
      return;
    }

    try {
      setCreatingGoal(true);
      const normalizedTargetDate = goalForm.target_date.trim()
        ? normalizeIsoDateValue(goalForm.target_date)
        : "";
      if (goalForm.target_date.trim() && !normalizedTargetDate) {
        setGoalFeedback("Date format must be YYYY-MM-DD.");
        return;
      }

      const payload: {
        exercise_name: string;
        exercise_definition_identifier?: string;
        target_weight_in_kilograms: number;
        target_repetitions: number;
        target_date?: string;
      } = {
        exercise_name: exerciseName,
        exercise_definition_identifier: selectedExercise._id,
        target_weight_in_kilograms: targetWeight,
        target_repetitions: targetRepetitions,
      };
      if (normalizedTargetDate) {
        payload.target_date = normalizedTargetDate;
      }
      await goalAPI.create(payload);
      const refreshedGoals = await goalAPI.getAll();
      setGoals(refreshedGoals);
      setGoalForm({
        exercise_definition_identifier: "",
        exercise_name: "",
        target_weight_in_kilograms: "",
        target_repetitions: "",
        target_date: "",
      });
      setGoalFeedback("Goal saved.");
    } catch {
      setGoalFeedback("Unable to save goal right now.");
    } finally {
      setCreatingGoal(false);
    }
  };

  const deleteGoal = async (goal: ExerciseGoalProgress) => {
    const confirmed = window.confirm("Delete this goal permanently?");
    if (!confirmed) {
      return;
    }
    try {
      setDeletingGoalIdentifier(goal._id);
      await goalAPI.delete(goal._id);
      const refreshedGoals = await goalAPI.getAll();
      setGoals(refreshedGoals);
      setGoalFeedback("Goal deleted.");
    } catch {
      setGoalFeedback("Unable to delete goal right now.");
    } finally {
      setDeletingGoalIdentifier(null);
    }
  };

  const startEditingGoal = (goal: ExerciseGoalProgress) => {
    setEditingGoalIdentifier(goal._id);
    setEditGoalForm({
      target_weight_in_kilograms: String(goal.target_weight_in_kilograms),
      target_repetitions: String(goal.target_repetitions),
      target_date: goal.target_date || "",
    });
  };

  const saveGoalEdit = async (goal: ExerciseGoalProgress) => {
    const targetWeight = Number(editGoalForm.target_weight_in_kilograms);
    const targetRepetitions = Number(editGoalForm.target_repetitions);
    if (targetWeight <= 0 || targetRepetitions <= 0) {
      setGoalFeedback("Goal target values must be greater than zero.");
      return;
    }

    try {
      setSavingGoalIdentifier(goal._id);
      const normalizedTargetDate = editGoalForm.target_date.trim()
        ? normalizeIsoDateValue(editGoalForm.target_date)
        : "";
      if (editGoalForm.target_date.trim() && !normalizedTargetDate) {
        setGoalFeedback("Date format must be YYYY-MM-DD.");
        return;
      }

      await goalAPI.update(goal._id, {
        exercise_name: goal.exercise_name,
        exercise_definition_identifier: goal.exercise_definition_identifier,
        target_weight_in_kilograms: targetWeight,
        target_repetitions: targetRepetitions,
        ...(normalizedTargetDate ? { target_date: normalizedTargetDate } : {}),
      });
      const refreshedGoals = await goalAPI.getAll();
      setGoals(refreshedGoals);
      setEditingGoalIdentifier(null);
      setGoalFeedback("Goal updated.");
    } catch {
      setGoalFeedback("Unable to update goal right now.");
    } finally {
      setSavingGoalIdentifier(null);
    }
  };

  const fillTodayGoalDate = () => {
    setGoalForm((current) => ({ ...current, target_date: format(new Date(), "yyyy-MM-dd") }));
  };

  return (
    <ApplicationShell title="Dashboard">
      <Card border className="relative overflow-hidden p-0 shadow-lg">
        <div className="relative px-4 py-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary-700">Today cockpit</p>
          <h2 className="mt-2 max-w-[17rem] font-display text-2xl font-semibold leading-tight text-navy-950">
            Fast logging. Clear progress.
          </h2>
          <p className="mt-2 text-sm text-navy-700">
            Built for quick entries, clean repeat sessions, and useful training data.
          </p>

          <div className="mt-4 grid grid-cols-3 gap-2">
            <div className="rounded-xl border border-navy-300/70 bg-navy-200/70 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-navy-600">Window</p>
              <p className="mt-1 text-sm font-semibold text-navy-900">{rangeLabel}</p>
            </div>
            <div className="rounded-xl border border-primary-300/45 bg-primary-100/35 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary-700">Streak</p>
              <p className="mt-1 text-sm font-semibold text-primary-900">
                {analyticsData ? analyticsData.summary.current_training_streak_weeks : 0} weeks
              </p>
            </div>
            <div className="rounded-xl border border-navy-300/70 bg-navy-100/70 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-navy-600">Volume</p>
              <p className="mt-1 text-sm font-semibold text-navy-900">
                {analyticsData ? Math.round(analyticsData.summary.total_volume) : 0} kg
              </p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
            <Button size="sm" onClick={() => navigate('/log')} className="justify-center gap-2">
              <ArrowRight size={14} />
              Log workout
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate('/log?source=last')}
              icon={<Repeat2 size={14} />}
              className="justify-center"
            >
              Repeat last
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate('/templates')}
              icon={<ChevronRight size={14} />}
              iconPosition="right"
              className="justify-center"
            >
              Templates
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => navigate('/analytics')}
              icon={<ChevronRight size={14} />}
              iconPosition="right"
              className="justify-center"
            >
              Deep analysis
            </Button>
          </div>
        </div>
      </Card>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-3">
        {loading
          ? Array.from({ length: 3 }).map((_, index) => (
              <Card key={index} className="h-28 animate-pulse bg-navy-100">
                <div />
              </Card>
            ))
          : dashboardInsights.map((insight) => {
              const IconComponent = insight.icon;
              return (
                <Card key={insight.title} border className="bg-navy-100/95 shadow-md">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-navy-600">{insight.title}</p>
                      <p className="mt-2 font-display text-xl font-semibold text-navy-950">{insight.value}</p>
                      <p className="mt-2 text-sm text-navy-600">{insight.detail}</p>
                    </div>
                    <div className="rounded-2xl border border-primary-300/35 bg-primary-100/30 p-3 text-primary-700 shadow-sm">
                      <IconComponent size={18} />
                    </div>
                  </div>
                </Card>
              );
            })}
      </section>

      <Tabs
        items={[
          { key: "7", label: "7 days" },
          { key: "30", label: "30 days" },
          { key: "90", label: "90 days" },
        ]}
        selectedKey={selectedRange}
        onSelect={setSelectedRange}
      />

      <section className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        {loading
          ? Array.from({ length: 4 }).map((_, index) => (
              <Card key={index} className="h-24 animate-pulse bg-navy-100">
                <div />
              </Card>
            ))
          : summaryCards.map((card) => {
              const IconComponent = card.icon;
              return (
                <Card key={card.key} className="overflow-hidden border border-navy-300/70 bg-navy-100/95 shadow-md">
                  <div className="flex items-center justify-between gap-2">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-navy-600">{card.title}</p>
                      <p className="mt-2 font-display text-xl font-semibold text-navy-950">{card.value}</p>
                    </div>
                    <div className="rounded-2xl border border-primary-300/35 bg-primary-100/30 p-3 text-primary-700 shadow-sm">
                      <IconComponent size={20} />
                    </div>
                  </div>
                </Card>
              );
            })}
      </section>

      <section className="grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)]">
        <Card border className="min-w-0 border-navy-300/70 bg-navy-100/95 shadow-md">
          <h3 className="font-display text-lg font-semibold text-navy-900">Set strength goal</h3>
          <p className="mt-1 text-sm text-navy-600">Pick an exercise from your catalogue. Progress is then tracked from matching workout sets.</p>
          <div className="mt-4 grid grid-cols-1 gap-3">
            <select
              className="touch-target h-11 rounded-xl border border-navy-300/70 bg-navy-50/80 px-3 text-sm text-navy-900 focus:outline-none focus:ring-2 focus:ring-primary-600/80"
              value={goalForm.exercise_definition_identifier}
              onChange={(event) =>
                setGoalForm((current) => {
                  const selectedExercise = exerciseDefinitions.find((exerciseDefinition) => exerciseDefinition._id === event.target.value);
                  return {
                    ...current,
                    exercise_definition_identifier: event.target.value,
                    exercise_name: selectedExercise?.exercise_name || "",
                  };
                })
              }
            >
              <option value="">Select exercise</option>
              {exerciseDefinitions.map((exerciseDefinition) => (
                <option key={exerciseDefinition._id} value={exerciseDefinition._id}>
                  {exerciseDefinition.exercise_name}
                </option>
              ))}
            </select>
            <div className="grid grid-cols-2 gap-3">
              <input
                className="touch-target h-11 rounded-xl border border-navy-300/70 bg-navy-50/80 px-3 text-sm text-navy-900 focus:outline-none focus:ring-2 focus:ring-primary-600/80"
                placeholder="Weight kg"
                type="number"
                min={0.5}
                step={0.5}
                value={goalForm.target_weight_in_kilograms}
                onChange={(event) =>
                  setGoalForm((current) => ({ ...current, target_weight_in_kilograms: event.target.value }))
                }
              />
              <input
                className="touch-target h-11 rounded-xl border border-navy-300/70 bg-navy-50/80 px-3 text-sm text-navy-900 focus:outline-none focus:ring-2 focus:ring-primary-600/80"
                placeholder="Reps"
                type="number"
                min={1}
                step={1}
                value={goalForm.target_repetitions}
                onChange={(event) =>
                  setGoalForm((current) => ({ ...current, target_repetitions: event.target.value }))
                }
              />
            </div>
            <div className="grid grid-cols-[1fr_auto] gap-2">
              <input
                className="touch-target block h-11 w-full min-w-0 max-w-full rounded-xl border border-navy-300/70 bg-navy-50/80 px-3 pr-10 text-base text-left text-navy-900 leading-normal focus:outline-none focus:ring-2 focus:ring-primary-600/80 [text-align-last:left] [&::-webkit-date-and-time-value]:text-left [&::-webkit-datetime-edit]:text-left [&::-webkit-calendar-picker-indicator]:ml-1"
                type={isIOSFallback ? "text" : "date"}
                value={goalForm.target_date}
                onChange={(event) =>
                  setGoalForm((current) => ({
                    ...current,
                    target_date: isIOSFallback ? formatDateInputMask(event.target.value) : event.target.value,
                  }))
                }
                onBlur={() => {
                  if (!isIOSFallback) {
                    return;
                  }
                  const normalizedDate = normalizeIsoDateValue(goalForm.target_date);
                  if (!normalizedDate && goalForm.target_date.trim()) {
                    setGoalFeedback("Date format must be YYYY-MM-DD.");
                    return;
                  }
                  if (normalizedDate) {
                    setGoalForm((current) => ({ ...current, target_date: normalizedDate }));
                  }
                }}
                inputMode={isIOSFallback ? "numeric" : undefined}
                placeholder={isIOSFallback ? "YYYY-MM-DD" : undefined}
              />
              {isIOSFallback ? (
                <button
                  type="button"
                  onClick={fillTodayGoalDate}
                  className="touch-target rounded-lg border border-navy-300/70 px-2 text-xs font-semibold text-navy-700 transition-colors hover:bg-navy-100/70"
                >
                  Today
                </button>
              ) : null}
            </div>
            <Button isLoading={creatingGoal} onClick={() => void createGoal()}>
              Save goal
            </Button>
            {goalFeedback ? <p className="text-sm text-navy-600">{goalFeedback}</p> : null}
          </div>
        </Card>

        <Card border className="min-w-0 border-navy-300/70 bg-navy-100/95 shadow-md">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="font-display text-lg font-semibold text-navy-900">Goal progress</h3>
            <div className="flex items-center gap-2">
              <Badge colour="neutral" size="small">{goals.length} goals</Badge>
              <Badge colour="primary" size="small">{goalInsights.achievedCount} achieved</Badge>
            </div>
          </div>
          <div className="mt-3 grid grid-cols-1 gap-2 rounded-xl border border-navy-300/60 bg-navy-50/70 p-3 text-sm text-navy-700">
            <p>
              <span className="font-semibold text-navy-900">Closest goal:</span>{" "}
              {goalInsights.closestGoal
                ? `${goalInsights.closestGoal.exercise_name} (${goalInsights.closestGoal.progress_percentage.toFixed(0)}%)`
                : "No in-progress goals"}
            </p>
            <p>
              <span className="font-semibold text-navy-900">Next achievable:</span>{" "}
              {goalInsights.easiestGoal
                ? `${goalInsights.easiestGoal.exercise_name}`
                : "Add a goal to estimate next target"}
            </p>
            <p>
              <span className="font-semibold text-navy-900">Nearest deadline:</span>{" "}
              {goalInsights.dueSoonGoal?.target_date || "No target date set"}
            </p>
          </div>
          <div className="mt-3">
            <Tabs
              items={[
                { key: "all", label: "All" },
                { key: "in_progress", label: "In progress" },
                { key: "achieved", label: "Achieved" },
              ]}
              selectedKey={goalFilter}
              onSelect={(key) => setGoalFilter(key as "all" | "in_progress" | "achieved")}
            />
          </div>
          <div className="mt-3 space-y-3">
            {filteredGoals.length === 0 ? (
              <p className="text-sm text-navy-600">No goals for this filter yet.</p>
            ) : (
              filteredGoals.map((goal) => {
                const progress = Math.max(0, Math.min(goal.progress_percentage, 100));
                const isEditing = editingGoalIdentifier === goal._id;
                return (
                  <div key={goal._id} className="rounded-2xl border border-navy-300/60 bg-navy-50/80 p-3">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-navy-900">{goal.exercise_name}</p>
                        {isEditing ? (
                          <div className="mt-2 grid grid-cols-2 gap-2">
                            <input
                              className="touch-target h-10 rounded-lg border border-navy-300/70 bg-navy-50/90 px-2 text-sm text-navy-900 focus:outline-none focus:ring-2 focus:ring-primary-600/80"
                              type="number"
                              min={0.5}
                              step={0.5}
                              value={editGoalForm.target_weight_in_kilograms}
                              onChange={(event) => setEditGoalForm((current) => ({ ...current, target_weight_in_kilograms: event.target.value }))}
                            />
                            <input
                              className="touch-target h-10 rounded-lg border border-navy-300/70 bg-navy-50/90 px-2 text-sm text-navy-900 focus:outline-none focus:ring-2 focus:ring-primary-600/80"
                              type="number"
                              min={1}
                              step={1}
                              value={editGoalForm.target_repetitions}
                              onChange={(event) => setEditGoalForm((current) => ({ ...current, target_repetitions: event.target.value }))}
                            />
                            <input
                              className="touch-target col-span-2 h-10 rounded-lg border border-navy-300/70 bg-navy-50/90 px-2 text-sm text-navy-900 focus:outline-none focus:ring-2 focus:ring-primary-600/80"
                              type={isIOSFallback ? "text" : "date"}
                              value={editGoalForm.target_date}
                              onChange={(event) =>
                                setEditGoalForm((current) => ({
                                  ...current,
                                  target_date: isIOSFallback ? formatDateInputMask(event.target.value) : event.target.value,
                                }))
                              }
                              onBlur={() => {
                                if (!isIOSFallback) {
                                  return;
                                }
                                const normalizedDate = normalizeIsoDateValue(editGoalForm.target_date);
                                if (!normalizedDate && editGoalForm.target_date.trim()) {
                                  setGoalFeedback("Date format must be YYYY-MM-DD.");
                                  return;
                                }
                                if (normalizedDate) {
                                  setEditGoalForm((current) => ({ ...current, target_date: normalizedDate }));
                                }
                              }}
                              inputMode={isIOSFallback ? "numeric" : undefined}
                              placeholder={isIOSFallback ? "YYYY-MM-DD" : undefined}
                            />
                          </div>
                        ) : (
                          <p className="text-sm text-navy-600">
                            Target: {goal.target_weight_in_kilograms.toFixed(1)} kg × {goal.target_repetitions}
                          </p>
                        )}
                        <p className="text-xs text-navy-500">
                          Current best e1RM: {goal.current_best_estimated_one_rep_maximum.toFixed(2)} kg
                        </p>
                      </div>
                      <div className="flex flex-col gap-2">
                        {isEditing ? (
                          <>
                            <Button
                              size="xs"
                              variant="outline"
                              isLoading={savingGoalIdentifier === goal._id}
                              onClick={() => void saveGoalEdit(goal)}
                            >
                              Save
                            </Button>
                            <Button
                              size="xs"
                              variant="ghost"
                              onClick={() => setEditingGoalIdentifier(null)}
                            >
                              Cancel
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              size="xs"
                              variant="outline"
                              onClick={() => startEditingGoal(goal)}
                            >
                              Edit
                            </Button>
                            <Button
                              size="xs"
                              variant="ghost"
                              icon={<Trash2 size={14} />}
                              isLoading={deletingGoalIdentifier === goal._id}
                              onClick={() => void deleteGoal(goal)}
                              className="border border-red-300/50 text-red-200 hover:bg-red-300/20"
                            >
                              Delete
                            </Button>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="mt-3 h-2 overflow-hidden rounded-full bg-navy-300/70">
                      <div
                        className={`h-full rounded-full ${goal.is_achieved ? "bg-green-400" : "bg-primary-500"}`}
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                    <div className="mt-2 flex items-center justify-between text-xs text-navy-600">
                      <span>{goal.is_achieved ? "Achieved" : "In progress"}</span>
                      <span>{progress.toFixed(0)}%</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </Card>
      </section>

      <section>
        <div className="flex items-end justify-between gap-3">
          <h2 className="font-display text-xl font-semibold text-navy-900">Recent sessions</h2>
          <p className="text-sm text-navy-500">Most recent ten</p>
        </div>
        <div className="mt-3 space-y-3">
          {sessionFeedback ? (
            <p className="text-sm text-navy-600" role="status" aria-live="polite">{sessionFeedback}</p>
          ) : null}
          {recentWorkouts.length === 0 && !loading ? (
            <Card border className="border-dashed border-navy-300 bg-navy-100/80">
              <p className="text-sm text-navy-700">No workouts yet. Use the Log tab to create your first session.</p>
            </Card>
          ) : (
            recentWorkouts.map((workout) => {
              const totalSets = workout.exercises.reduce((accumulator, exercise) => accumulator + exercise.sets.length, 0);
              return (
                <div key={workout._id} className="touch-target block w-full rounded-2xl text-left">
                  <Card border className="bg-navy-100/95 shadow-sm transition-[transform,box-shadow] duration-150 ease-out active:scale-[0.99] hover:shadow-md">
                    <div className="flex items-start justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => navigate(`/workouts/${workout._id}`)}
                        className="min-w-0 flex-1 text-left"
                      >
                        <p className="font-display text-lg font-semibold text-navy-950">{format(new Date(workout.date_of_workout), "EEE d MMM")}</p>
                        <p className="mt-1 text-sm text-navy-600">
                          {workout.exercises.length} exercises · {totalSets} sets
                        </p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          {workout.target_muscle_groups.slice(0, 3).map((muscleGroup) => (
                            <Badge key={muscleGroup} colour="neutral" size="small">
                              {muscleGroup}
                            </Badge>
                          ))}
                        </div>
                      </button>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <Badge colour="primary" size="small">
                          Session
                        </Badge>
                        <Button
                          size="sm"
                          variant="ghost"
                          icon={<Trash2 size={14} />}
                          isLoading={deletingWorkoutIdentifier === workout._id}
                          onClick={(event) => {
                            event.stopPropagation();
                            void deleteRecentWorkout(workout);
                          }}
                          className="border border-red-300/50 text-red-200 hover:bg-red-300/20"
                        >
                          Delete
                        </Button>
                        <ArrowRight size={16} className="text-primary-700" />
                      </div>
                    </div>
                  </Card>
                </div>
              );
            })
          )}
        </div>
      </section>
    </ApplicationShell>
  );
}
