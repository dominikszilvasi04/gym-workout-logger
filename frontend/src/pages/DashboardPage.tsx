import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Activity, ArrowRight, CalendarDays, Flame, Scale, Sparkles } from "lucide-react";
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

  return (
    <ApplicationShell title="Dashboard">
      <Card border className="overflow-hidden p-0 shadow-lg">
        <div className="bg-gradient-to-br from-navy-950 via-primary-700 to-primary-500 px-4 py-5 text-white">
          <div className="flex items-start justify-between gap-4">
            <div className="max-w-[16rem]">
              <div className="inline-flex items-center gap-2 rounded-full bg-white/10 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/80">
                <Sparkles size={12} />
                Training overview
              </div>
              <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight">Move faster, log cleaner, train better.</h2>
              <p className="mt-2 text-sm text-white/80">
                Your latest sessions, progress and volume trends in a layout tuned for one hand use.
              </p>
            </div>
            <div className="rounded-2xl bg-white/10 px-3 py-2 text-right backdrop-blur-sm">
              <p className="text-[11px] uppercase tracking-[0.2em] text-white/70">Current streak</p>
              <p className="mt-1 font-display text-2xl font-semibold">
                {analyticsData ? analyticsData.summary.current_training_streak_weeks : 0}
              </p>
              <p className="text-xs text-white/70">weeks</p>
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <Button size="sm" className="bg-white text-navy-950 hover:bg-white/90" onClick={() => navigate('/log')}>
              Log workout
            </Button>
            <Button size="sm" variant="ghost" className="border border-white/20 text-white hover:bg-white/10" onClick={() => navigate('/analytics')}>
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
            <Card key={index} className="h-24 animate-pulse bg-white">
              <div />
            </Card>
            ))
          : summaryCards.map((card) => {
              const IconComponent = card.icon;
              return (
                <Card key={card.key} className="overflow-hidden border border-white/70 bg-white/90 shadow-md">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-navy-500">{card.title}</p>
                      <p className="mt-2 font-display text-xl font-semibold text-navy-950">{card.value}</p>
                    </div>
                    <div className="rounded-2xl bg-primary-50 p-3 text-primary-600 shadow-sm">
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
            <Card border className="border-dashed border-navy-300 bg-white/80">
              <p className="text-sm text-navy-600">No workouts yet. Use the Log tab to create your first session.</p>
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
                  <Card border className="bg-white/95 shadow-sm transition-transform active:scale-[0.99] hover:shadow-md cursor-pointer">
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
                        <ArrowRight size={16} className="text-navy-400" />
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
