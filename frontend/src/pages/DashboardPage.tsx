import { useEffect, useMemo, useState } from "react";
import { format } from "date-fns";
import { Activity, CalendarDays, Flame, Scale } from "lucide-react";
import { ApplicationShell } from "../components/layout/ApplicationShell";
import { Card } from "../components/common/Card";
import { Badge } from "../components/common/Badge";
import { Tabs } from "../components/common/Tabs";
import { workoutAPI } from "../services/api";
import type { AnalyticsData, Workout } from "../types";

export function DashboardPage() {
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
                <Card key={card.key} className="flex items-center justify-between" border>
                  <div>
                    <p className="text-sm text-navy-500">{card.title}</p>
                    <p className="mt-1 font-display text-2xl font-semibold text-navy-900">{card.value}</p>
                  </div>
                  <div className="rounded-full bg-primary-50 p-3 text-primary-600">
                    <IconComponent size={20} />
                  </div>
                </Card>
              );
            })}
      </section>

      <section>
        <h2 className="font-display text-xl font-semibold text-navy-900">Recent sessions</h2>
        <div className="mt-3 space-y-3">
          {recentWorkouts.length === 0 && !loading ? (
            <Card border>
              <p className="text-sm text-navy-600">No workouts yet. Use the Log tab to create your first session.</p>
            </Card>
          ) : (
            recentWorkouts.map((workout) => {
              const totalSets = workout.exercises.reduce((accumulator, exercise) => accumulator + exercise.sets.length, 0);
              return (
                <Card key={workout._id} border>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-semibold text-navy-900">{format(new Date(workout.date_of_workout), "EEE d MMM yyyy")}</p>
                      <p className="mt-1 text-sm text-navy-600">{workout.exercises.length} exercises · {totalSets} sets</p>
                    </div>
                    <Badge colour="primary" size="small">
                      {workout.target_muscle_groups.join(", ") || "General"}
                    </Badge>
                  </div>
                </Card>
              );
            })
          )}
        </div>
      </section>
    </ApplicationShell>
  );
}
