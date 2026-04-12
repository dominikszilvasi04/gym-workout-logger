import { useEffect, useMemo, useState, type ComponentType } from "react";
import { useNavigate } from "react-router-dom";
import { differenceInCalendarDays, format } from "date-fns";
import { Activity, ArrowRight, CalendarDays, ChevronRight, Flame, Repeat2, Scale, Sparkles, Wand2 } from "lucide-react";
import { ApplicationShell } from "../components/layout/ApplicationShell";
import { Card } from "../components/common/Card";
import { Badge } from "../components/common/Badge";
import { Button } from "../components/common/Button";
import { Tabs } from "../components/common/Tabs";
import { workoutAPI } from "../services/api";
import type { AnalyticsData, Workout } from "../types";

export function DashboardPage() {
  const navigate = useNavigate();
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [recentWorkouts, setRecentWorkouts] = useState<Workout[]>([]);
  const [selectedRange, setSelectedRange] = useState("30");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const analyticsResponse = await workoutAPI.getAnalytics(Number(selectedRange));
        setAnalyticsData(analyticsResponse);

        const workoutsResponse = await workoutAPI.getAll(1, 10);
        setRecentWorkouts(workoutsResponse.workouts || []);
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

      <section>
        <div className="flex items-end justify-between gap-3">
          <h2 className="font-display text-xl font-semibold text-navy-900">Recent sessions</h2>
          <p className="text-sm text-navy-500">Most recent ten</p>
        </div>
        <div className="mt-3 space-y-3">
          {recentWorkouts.length === 0 && !loading ? (
            <Card border className="border-dashed border-navy-300 bg-navy-100/80">
              <p className="text-sm text-navy-700">No workouts yet. Use the Log tab to create your first session.</p>
            </Card>
          ) : (
            recentWorkouts.map((workout) => {
              const totalSets = workout.exercises.reduce((accumulator, exercise) => accumulator + exercise.sets.length, 0);
              return (
                <button
                  key={workout._id}
                  onClick={() => navigate(`/workouts/${workout._id}`)}
                  className="touch-target block w-full rounded-2xl text-left"
                >
                  <Card border className="bg-navy-100/95 shadow-sm transition-[transform,box-shadow] duration-150 ease-out active:scale-[0.99] hover:shadow-md cursor-pointer">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
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
                      </div>
                      <div className="flex shrink-0 flex-col items-end gap-2">
                        <Badge colour="primary" size="small">
                          Session
                        </Badge>
                        <ArrowRight size={16} className="text-primary-700" />
                      </div>
                    </div>
                  </Card>
                </button>
              );
            })
          )}
        </div>
      </section>
    </ApplicationShell>
  );
}
