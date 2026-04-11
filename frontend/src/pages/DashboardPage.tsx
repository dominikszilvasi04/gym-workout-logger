import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Activity, ArrowRight, CalendarDays, ChevronRight, Flame, Scale } from "lucide-react";
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

  const rangeLabel = selectedRange === "7" ? "This week" : selectedRange === "30" ? "This month" : "This quarter";

  return (
    <ApplicationShell title="Dashboard">
      <Card border className="relative overflow-hidden p-0 shadow-lg">
        <div className="absolute inset-0 opacity-20 [background:linear-gradient(120deg,rgba(126,138,255,0.18)_0%,transparent_45%),repeating-linear-gradient(90deg,transparent_0,transparent_26px,rgba(255,255,255,0.05)_26px,rgba(255,255,255,0.05)_27px)]" />
        <div className="relative px-4 py-5">
          <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary-700">Performance cockpit</p>
          <h2 className="mt-2 max-w-[17rem] font-display text-2xl font-semibold leading-tight text-navy-950">
            Train with intent. Review with clarity.
          </h2>
          <p className="mt-2 text-sm text-navy-700">
            Fast access to sessions, volume, and momentum in a compact mobile-first view.
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
            <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/15 px-3 py-2">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-emerald-300">Volume</p>
              <p className="mt-1 text-sm font-semibold text-emerald-200">
                {analyticsData ? Math.round(analyticsData.summary.total_volume) : 0} kg
              </p>
            </div>
          </div>

          <div className="mt-4 flex gap-2">
            <Button size="sm" onClick={() => navigate('/log')}>
              Log workout
            </Button>
            <Button size="sm" variant="outline" onClick={() => navigate('/analytics')} icon={<ChevronRight size={14} />} iconPosition="right">
              View analytics
            </Button>
          </div>
        </div>
      </Card>

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
                  className="block w-full text-left"
                >
                  <Card border className="bg-navy-100/95 shadow-sm transition-transform active:scale-[0.99] hover:shadow-md cursor-pointer">
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
