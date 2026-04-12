import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Award, CalendarDays, Flame, LogOut, PencilLine, Repeat2, Scale, UserCircle2 } from "lucide-react";
import { ApplicationShell } from "../components/layout/ApplicationShell";
import { Button } from "../components/common/Button";
import { Card } from "../components/common/Card";
import { Badge } from "../components/common/Badge";
import { InputField } from "../components/common/InputField";
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
  const updateProfile = useAuthStore((state) => state.updateProfile);
  const user = useAuthStore((state) => state.user);
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [recentWorkouts, setRecentWorkouts] = useState<Workout[]>([]);
  const [lastWorkout, setLastWorkout] = useState<Workout | null>(null);
  const [loading, setLoading] = useState(true);
  const [loggingOut, setLoggingOut] = useState(false);
  const [displayNameDraft, setDisplayNameDraft] = useState("");
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileFeedback, setProfileFeedback] = useState<string | null>(null);

  useEffect(() => {
    setDisplayNameDraft(user?.display_name ?? "");
  }, [user?.display_name]);

  useEffect(() => {
    const loadProfileData = async () => {
      setLoading(true);
      try {
        const [analyticsResponse, workoutsResponse, lastWorkoutResponse] = await Promise.all([
          workoutAPI.getAnalytics(90),
          workoutAPI.getAll(1, 6),
          workoutAPI.getLast(),
        ]);
        setAnalyticsData(analyticsResponse);
        setRecentWorkouts(workoutsResponse.workouts || []);
        setLastWorkout(lastWorkoutResponse);
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

  const memberSince = user ? format(new Date(user.created_at), "d MMM yyyy") : "—";
  const currentDisplayName = user?.display_name || user?.email || "Athlete";

  const saveProfile = async () => {
    setSavingProfile(true);
    setProfileFeedback(null);
    try {
      await updateProfile(displayNameDraft);
      setProfileFeedback("Profile updated.");
    } catch (error) {
      setProfileFeedback(error instanceof Error ? error.message : "Unable to update profile right now.");
    } finally {
      setSavingProfile(false);
    }
  };

  return (
    <ApplicationShell title="Profile">
      <section className="space-y-3">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-primary-700">Athlete ledger</p>
            <h2 className="mt-1 font-display text-2xl font-semibold text-navy-950">{currentDisplayName}</h2>
            <p className="mt-1 max-w-[30ch] text-sm text-navy-700">Your training identity, progress, and shortcuts in one place.</p>
          </div>
          <div className="rounded-2xl border border-navy-300/60 bg-navy-100/75 p-3 text-primary-700">
            <UserCircle2 size={18} />
          </div>
        </div>

        <Card border className="bg-navy-100/95 shadow-sm">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-navy-500">Account</p>
              <p className="mt-1 text-sm text-navy-600">Member since {memberSince}</p>
              <p className="mt-1 text-sm text-navy-600">{user?.email}</p>
            </div>
            <Badge colour="primary" size="small">Active athlete</Badge>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 sm:grid-cols-[1.4fr_0.9fr]">
            <div className="rounded-2xl border border-navy-300/70 bg-navy-50/60 p-3">
              <div className="flex items-start justify-between gap-2">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-navy-500">Display name</p>
                  <p className="mt-1 text-sm text-navy-600">Edit how your profile appears across the app.</p>
                </div>
                <PencilLine size={16} className="text-primary-700" />
              </div>
              <div className="mt-3 space-y-3">
                <InputField
                  label="Display name"
                  value={displayNameDraft}
                  onChange={(event) => setDisplayNameDraft(event.target.value)}
                  placeholder="Domin"
                  helperText="Leave blank to show your email instead."
                />
                <div className="flex items-center gap-2">
                  <Button size="sm" onClick={() => void saveProfile()} isLoading={savingProfile}>
                    Save profile
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => navigate('/log?source=last')}
                    icon={<Repeat2 size={14} />}
                    disabled={!lastWorkout}
                  >
                    Repeat last
                  </Button>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-xl border border-primary-300/40 bg-primary-100/30 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary-700">Last session</p>
                <p className="mt-1 font-display text-lg font-semibold text-primary-900">
                  {lastWorkout ? format(new Date(lastWorkout.date_of_workout), "d MMM") : "—"}
                </p>
              </div>
              <div className="rounded-xl border border-navy-300/70 bg-navy-100/70 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-navy-600">Current streak</p>
                <p className="mt-1 font-display text-lg font-semibold text-navy-950">
                  {analyticsData ? analyticsData.summary.current_training_streak_weeks : 0} weeks
                </p>
              </div>
              <div className="rounded-xl border border-primary-300/40 bg-primary-100/30 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-primary-700">Volume</p>
                <p className="mt-1 font-display text-lg font-semibold text-primary-900">
                  {analyticsData ? Math.round(analyticsData.summary.total_volume) : 0} kg
                </p>
              </div>
              <div className="rounded-xl border border-navy-300/70 bg-navy-100/70 px-3 py-2">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-navy-600">1RM</p>
                <p className="mt-1 font-display text-lg font-semibold text-navy-950">
                  {analyticsData ? Math.round(analyticsData.summary.strongest_estimated_one_rep_maximum) : 0} kg
                </p>
              </div>
            </div>
          </div>

          {profileFeedback ? (
            <p className="mt-3 text-sm text-navy-700" role="status" aria-live="polite">
              {profileFeedback}
            </p>
          ) : null}
        </Card>
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
                  className="touch-target block w-full rounded-2xl text-left"
                >
                  <Card border className="bg-navy-100/95 shadow-sm transition-[transform,box-shadow] duration-150 ease-out active:scale-[0.99] hover:shadow-md cursor-pointer">
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

      {lastWorkout ? (
        <Card border className="bg-navy-100/95 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-navy-500">Quick restart</p>
              <p className="mt-1 font-display text-lg font-semibold text-navy-950">Repeat last workout</p>
              <p className="mt-1 text-sm text-navy-600">
                {lastWorkout.exercises.length} exercises · {lastWorkout.target_muscle_groups.length} muscle groups
              </p>
            </div>
            <Button size="sm" onClick={() => navigate('/log?source=last')} icon={<Repeat2 size={14} />}>
              Repeat
            </Button>
          </div>
        </Card>
      ) : null}

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
          variant="outline"
          className="w-full gap-2"
        >
          <LogOut className="w-4 h-4" />
          {loggingOut ? 'Logging out...' : 'Log out'}
        </Button>
      </div>
    </ApplicationShell>
  );
}
