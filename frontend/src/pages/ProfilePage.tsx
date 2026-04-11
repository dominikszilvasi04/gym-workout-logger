import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Award, CalendarDays, Flame, LogOut, Scale, UserCircle2 } from "lucide-react";
import { ApplicationShell } from "../components/layout/ApplicationShell";
import { Button } from "../components/common/Button";
import { Card } from "../components/common/Card";
import { Badge } from "../components/common/Badge";
import { workoutAPI } from "../services/api";
import { useAuthStore } from "../store/authStore";
import type { AnalyticsData, Workout } from "../types";

interface ProfileHighlight {
  title: string;
  value: string;
  icon: React.ComponentType<{ size?: number }>;
}

export function ProfilePage() {
  const navigate = useNavigate();
  const logout = useAuthStore((state) => state.logout);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [recentWorkouts, setRecentWorkouts] = useState<Workout[]>([]);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);

  useEffect(() => {
    const loadProfileData = async () => {
      setLoading(true);
      try {
        const [analyticsResponse, workoutsResponse] = await Promise.all([
          workoutAPI.getAnalytics(90),
          workoutAPI.getAll(1, 6),
        ]);
        setAnalyticsData(analyticsResponse);
        setRecentWorkouts(workoutsResponse.workouts || []);
      } finally {
        setLoading(false);
      }
    };

    void loadProfileData();
  }, []);

  const profileHighlights = useMemo<ProfileHighlight[]>(() => {
    if (!analyticsData) {
      return [];
    }

    return [
      {
        title: "Sessions",
        value: String(analyticsData.summary.total_workouts),
        icon: CalendarDays,
      },
      {
        title: "Volume",
        value: `${Math.round(analyticsData.summary.total_volume)} kg`,
        icon: Scale,
      },
      {
        title: "Streak",
        value: `${analyticsData.summary.current_training_streak_weeks} weeks`,
        icon: Flame,
      },
      {
        title: "One repetition maximum",
        value: `${Math.round(analyticsData.summary.strongest_estimated_one_rep_maximum)} kg`,
        icon: Award,
      },
    ];
  }, [analyticsData]);

  return (
    <ApplicationShell title="Profile">
      <section className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-primary-700">Athlete profile</p>
            <h2 className="mt-1 font-display text-2xl font-semibold text-navy-950">Progress snapshot</h2>
            <p className="mt-1 text-sm text-navy-700">Your consistency and training output in one place.</p>
          </div>
          <div className="rounded-2xl border border-navy-300/70 bg-navy-100/70 p-3 text-navy-700">
            <UserCircle2 size={18} />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-xl border border-primary-300/40 bg-primary-100/30 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary-700">Ninety day volume</p>
            <p className="mt-1 font-display text-lg font-semibold text-primary-900">
              {analyticsData ? Math.round(analyticsData.summary.total_volume) : 0} kg
            </p>
          </div>
          <div className="rounded-xl border border-navy-300/70 bg-navy-100/70 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-navy-600">Current streak</p>
            <p className="mt-1 font-display text-lg font-semibold text-navy-950">
              {analyticsData ? analyticsData.summary.current_training_streak_weeks : 0} weeks
            </p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3">
        {loading
          ? Array.from({ length: 4 }).map((_, index) => (
              <Card key={index} border className="bg-navy-100/95 shadow-sm">
                <div className="h-16 animate-pulse rounded-lg bg-navy-200" />
              </Card>
            ))
          : profileHighlights.map((highlight) => {
              const IconComponent = highlight.icon;
              return (
                <Card key={highlight.title} border className="bg-navy-100/95 shadow-sm">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-navy-500">{highlight.title}</p>
                      <p className="mt-2 font-display text-xl font-semibold text-navy-950">{highlight.value}</p>
                    </div>
                    <div className="rounded-2xl border border-primary-300/35 bg-primary-100/30 p-3 text-primary-700">
                      <IconComponent size={18} />
                    </div>
                  </div>
                </Card>
              );
            })}
      </section>

      <section>
        <div className="flex items-end justify-between gap-3">
          <h2 className="font-display text-xl font-semibold text-navy-900">Recent sessions</h2>
          <p className="text-sm text-navy-500">Latest 6</p>
        </div>

        <div className="mt-3 space-y-3">
          {loading ? (
            <Card border>
              <div className="h-28 animate-pulse rounded-2xl bg-navy-200" />
            </Card>
          ) : recentWorkouts.length === 0 ? (
            <Card border className="border-dashed border-navy-300 bg-navy-100/80">
              <p className="text-sm text-navy-700">No recent sessions to show.</p>
            </Card>
          ) : (
            recentWorkouts.map((workout) => {
              const totalVolume = workout.exercises.reduce(
                (sessionVolume, exercise) =>
                  sessionVolume + exercise.sets.reduce((setVolume, set) => setVolume + set.weight_in_kilograms * set.repetitions, 0),
                0
              );

              return (
                <button
                  key={workout._id}
                  onClick={() => navigate(`/workouts/${workout._id}`)}
                  className="block w-full text-left"
                >
                  <Card border className="bg-navy-100/95 shadow-sm transition-transform active:scale-[0.99] hover:shadow-md cursor-pointer">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-display text-lg font-semibold text-navy-950">
                          {format(new Date(workout.date_of_workout), "EEE d MMM")}
                        </p>
                        <p className="mt-1 text-sm text-navy-600">
                          {workout.exercises.length} exercises · {Math.round(totalVolume)} kg
                        </p>
                      </div>
                      <Badge colour="primary" size="small">
                        Logged
                      </Badge>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {workout.target_muscle_groups.slice(0, 3).map((muscleGroup) => (
                        <Badge key={muscleGroup} colour="neutral" size="small">
                          {muscleGroup}
                        </Badge>
                      ))}
                    </div>
                  </Card>
                </button>
              );
            })
          )}
        </div>
      </section>

      <div className="pt-4">
        <Button
          onClick={async () => {
            setLoggingOut(true);
            try {
              await logout();
              navigate('/login');
            } catch (err) {
              console.error('Logout failed:', err);
              setLoggingOut(false);
            }
          }}
          disabled={loggingOut}
          className="w-full gap-2 bg-navy-200 hover:bg-navy-300 text-navy-950"
        >
          <LogOut className="w-4 h-4" />
          {loggingOut ? 'Logging out...' : 'Log out'}
        </Button>
      </div>
    </ApplicationShell>
  );
}
