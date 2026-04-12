import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  ArcElement,
  BarElement,
  CategoryScale,
  Chart as ChartLibrary,
  Legend,
  LineElement,
  LinearScale,
  PointElement,
  Tooltip,
} from "chart.js";
import { Bar, Doughnut, Line } from "react-chartjs-2";
import { ApplicationShell } from "../components/layout/ApplicationShell";
import { Badge } from "../components/common/Badge";
import { Button } from "../components/common/Button";
import { Card } from "../components/common/Card";
import { Tabs } from "../components/common/Tabs";
import { workoutAPI } from "../services/api";
import type { AnalyticsData } from "../types";

ChartLibrary.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  ArcElement,
  Tooltip,
  Legend
);

export function AnalyticsPage() {
  const navigate = useNavigate();
  const [rangeDays, setRangeDays] = useState("30");
  const [selectedExercise, setSelectedExercise] = useState("");
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  const chartPalette = {
    linePrimary: "#D4AA62",
    linePrimaryFill: "rgba(212,170,98,0.24)",
    barPrimary: "rgba(184,138,59,0.72)",
    barSecondary: "rgba(131,112,92,0.7)",
    lineSecondary: "#B88A3B",
    lineSecondaryFill: "rgba(184,138,59,0.18)",
    text: "#B6A48A",
    grid: "rgba(64,55,45,0.45)",
    tooltipBackground: "#141210",
    tooltipBorder: "#40372D",
    tooltipTitle: "#FFF8ED",
    tooltipBody: "#F0E8DB",
  };

  const baseCartesianOptions = {
    responsive: true,
    plugins: {
      legend: { display: false },
      tooltip: {
        backgroundColor: chartPalette.tooltipBackground,
        borderColor: chartPalette.tooltipBorder,
        borderWidth: 1,
        titleColor: chartPalette.tooltipTitle,
        bodyColor: chartPalette.tooltipBody,
      },
    },
    scales: {
      x: {
        ticks: { maxTicksLimit: 6, color: chartPalette.text },
        grid: { color: chartPalette.grid },
      },
      y: {
        beginAtZero: true,
        ticks: { color: chartPalette.text },
        grid: { color: chartPalette.grid },
      },
    },
  };

  const formatNumber = (value: number) => {
    return new Intl.NumberFormat("en-US", { maximumFractionDigits: 0 }).format(value);
  };

  const analyticsInsights = useMemo(() => {
    if (!analyticsData) {
      return [];
    }

    const bestPR = analyticsData.leaderboards.personal_records[0];
    const muscleDistribution = analyticsData.charts.muscle_group_distribution;
    const dominantMuscleIndex = muscleDistribution.values.indexOf(Math.max(...muscleDistribution.values));
    const dominantMuscleGroup = dominantMuscleIndex >= 0 ? muscleDistribution.labels[dominantMuscleIndex] : null;
    const averageRpe = analyticsData.summary.average_session_rpe;
    const streakWeeks = analyticsData.summary.current_training_streak_weeks;

    return [
      {
        title: "Momentum",
        value: `${analyticsData.summary.total_workouts} sessions`,
        detail:
          streakWeeks > 0
            ? `You're holding a ${streakWeeks}-week streak. Keep the rhythm with your next planned session.`
            : "Build a streak by logging your next workout as soon as you finish.",
      },
      {
        title: "Intensity",
        value: `${averageRpe.toFixed(1)} average RPE`,
        detail:
          averageRpe >= 8
            ? "Training is running hot. Consider a lighter accessory or recovery day next."
            : averageRpe >= 6
              ? "Effort is balanced. Good zone for sustainable progress."
              : "Sessions are light. Add a top set or another working set if recovery is good.",
      },
      {
        title: "Focus",
        value: dominantMuscleGroup || "Balanced split",
        detail: dominantMuscleGroup
          ? `This range leans toward ${dominantMuscleGroup.toLowerCase()} work. Round it out with complementary movement patterns.`
          : "Your distribution will sharpen once more sessions are logged.",
      },
      {
        title: "Best lift",
        value: bestPR ? `${bestPR.exercise_name} · ${Math.round(bestPR.estimated_one_rep_maximum)} kg` : `${formatNumber(analyticsData.summary.strongest_estimated_one_rep_maximum)} kg`,
        detail: bestPR
          ? `Latest personal record set on ${new Date(bestPR.date).toLocaleDateString()}.`
          : "Log a few top sets to reveal your strongest movement.",
      },
    ];
  }, [analyticsData]);

  const nextMove = useMemo(() => {
    if (!analyticsData) {
      return {
        title: "Log your next session",
        detail: "Start a workout now to build your next trend point.",
        actionLabel: "Log workout",
        onAction: () => navigate("/log"),
      };
    }

    const averageRpe = analyticsData.summary.average_session_rpe;
    if (averageRpe >= 8) {
      return {
        title: "Use a lighter day",
        detail: "Average effort is high. Repeat your last session with slightly lower load.",
        actionLabel: "Repeat last",
        onAction: () => navigate("/log?source=last"),
      };
    }

    if (analyticsData.summary.current_training_streak_weeks === 0) {
      return {
        title: "Start your streak",
        detail: "One quick session now creates momentum for the week.",
        actionLabel: "Log workout",
        onAction: () => navigate("/log"),
      };
    }

    return {
      title: "Progressive next step",
      detail: "Keep momentum by launching your next planned session from templates.",
      actionLabel: "Open templates",
      onAction: () => navigate("/templates"),
    };
  }, [analyticsData, navigate]);

  useEffect(() => {
    const loadAnalytics = async () => {
      setLoading(true);
      try {
        const response = selectedExercise
          ? await workoutAPI.getAnalytics(Number(rangeDays), selectedExercise)
          : await workoutAPI.getAnalytics(Number(rangeDays));
        setAnalyticsData(response);
      } finally {
        setLoading(false);
      }
    };

    void loadAnalytics();
  }, [rangeDays, selectedExercise]);

  if (loading) {
    return (
      <ApplicationShell title="Analytics">
        <Card border>
          <div className="h-40 animate-pulse rounded-lg bg-navy-100" />
        </Card>
      </ApplicationShell>
    );
  }

  if (!analyticsData) {
    return (
      <ApplicationShell title="Analytics">
        <Card border>
          <p className="text-sm text-navy-600">Analytics are not available yet.</p>
        </Card>
      </ApplicationShell>
    );
  }

  return (
    <ApplicationShell title="Analytics">
      <Card border className="space-y-3 transition-shadow duration-200">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.18em] text-primary-700">Analytics</p>
            <p className="mt-1 font-display text-xl font-semibold text-navy-900">Training trends</p>
          </div>
          <Badge colour="primary" size="small">{analyticsData.summary.total_workouts} sessions</Badge>
        </div>

        <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
          <div className="rounded-xl border border-navy-300/70 bg-navy-100/70 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-navy-500">Volume</p>
            <p className="mt-1 font-display text-lg font-semibold text-navy-900">{formatNumber(analyticsData.summary.total_volume)} kg</p>
          </div>
          <div className="rounded-xl border border-primary-300/50 bg-primary-100/30 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-primary-700">Avg session</p>
            <p className="mt-1 font-display text-lg font-semibold text-primary-900">{formatNumber(analyticsData.summary.average_workout_volume)} kg</p>
          </div>
          <div className="rounded-xl border border-navy-300/70 bg-navy-100/70 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-navy-500">Best 1RM</p>
            <p className="mt-1 font-display text-lg font-semibold text-navy-900">{formatNumber(analyticsData.summary.strongest_estimated_one_rep_maximum)} kg</p>
          </div>
          <div className="rounded-xl border border-navy-300/70 bg-navy-100/70 px-3 py-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.16em] text-navy-500">Streak</p>
            <p className="mt-1 font-display text-lg font-semibold text-navy-900">{analyticsData.summary.current_training_streak_weeks} w</p>
          </div>
        </div>
      </Card>

      <Tabs
        items={[
          { key: "7", label: "7 days" },
          { key: "30", label: "30 days" },
          { key: "90", label: "90 days" },
        ]}
        selectedKey={rangeDays}
        onSelect={setRangeDays}
      />

      <Card border className="transition-shadow duration-200">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-navy-500">Focus filter</p>
            <p className="mt-1 text-sm text-navy-600">Zoom your analytics by exercise.</p>
          </div>
          <div className="w-full sm:max-w-xs">
            <label htmlFor="analytics-exercise-filter" className="mb-1 block text-xs font-semibold uppercase tracking-[0.15em] text-navy-500">
              Exercise filter
            </label>
            <select
              id="analytics-exercise-filter"
              className="h-11 w-full rounded-lg border border-navy-300 bg-navy-100/80 px-3 text-sm text-navy-900 shadow-sm"
              value={selectedExercise}
              onChange={(event) => setSelectedExercise(event.target.value)}
            >
              <option value="">All exercises</option>
              {analyticsData.filters.available_exercises.map((exerciseName) => (
                <option key={exerciseName} value={exerciseName}>
                  {exerciseName}
                </option>
              ))}
            </select>
          </div>
        </div>
      </Card>

      <Card border className="transition-shadow duration-200">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary-700">Next move</p>
        <p className="mt-1 font-display text-lg font-semibold text-navy-900">{nextMove.title}</p>
        <p className="mt-2 text-sm text-navy-600">{nextMove.detail}</p>
        <div className="mt-3">
          <Button size="sm" onClick={nextMove.onAction}>{nextMove.actionLabel}</Button>
        </div>
      </Card>

      <section className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
        {analyticsInsights.map((insight) => (
          <Card key={insight.title} border className="border border-navy-300/70 bg-navy-100/95 shadow-md">
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-navy-600">{insight.title}</p>
            <p className="mt-2 font-display text-xl font-semibold text-navy-950">{insight.value}</p>
            <p className="mt-2 text-sm leading-6 text-navy-600">{insight.detail}</p>
          </Card>
        ))}
      </section>

      <Card border className="transition-shadow duration-200">
        <p className="mb-1 font-display text-lg font-semibold text-navy-900">Estimated one repetition maximum</p>
        <p className="mb-3 text-sm text-navy-600">Peak strength trend by session.</p>
        <Line
          options={baseCartesianOptions}
          data={{
            labels: analyticsData.charts.one_rep_max_progression.labels,
            datasets: [
              {
                label: "Estimated one repetition maximum",
                data: analyticsData.charts.one_rep_max_progression.values,
                borderColor: chartPalette.linePrimary,
                backgroundColor: chartPalette.linePrimaryFill,
                tension: 0.3,
              },
            ],
          }}
        />
      </Card>

      <Card border className="transition-shadow duration-200">
        <p className="mb-1 font-display text-lg font-semibold text-navy-900">Workout volume</p>
        <p className="mb-3 text-sm text-navy-600">Total lifted weight per session.</p>
        <Bar
          options={baseCartesianOptions}
          data={{
            labels: analyticsData.charts.workout_volume_progression.labels,
            datasets: [
              {
                label: "Volume",
                data: analyticsData.charts.workout_volume_progression.values,
                backgroundColor: chartPalette.barSecondary,
                borderRadius: 8,
              },
            ],
          }}
        />
      </Card>

      <Card border className="transition-shadow duration-200">
        <p className="mb-1 font-display text-lg font-semibold text-navy-900">Target muscle distribution</p>
        <p className="mb-3 text-sm text-navy-600">How your training focus is distributed.</p>
        <Doughnut
          options={{
            responsive: true,
            plugins: {
              legend: {
                position: "bottom",
                labels: {
                  usePointStyle: true,
                  color: chartPalette.text,
                },
              },
              tooltip: {
                backgroundColor: chartPalette.tooltipBackground,
                borderColor: chartPalette.tooltipBorder,
                borderWidth: 1,
                titleColor: chartPalette.tooltipTitle,
                bodyColor: chartPalette.tooltipBody,
              },
            },
          }}
          data={{
            labels: analyticsData.charts.muscle_group_distribution.labels,
            datasets: [
              {
                data: analyticsData.charts.muscle_group_distribution.values,
                backgroundColor: [
                  "#B88A3B",
                  "#D4AA62",
                  "#E5C895",
                  "#B6A48A",
                  "#83705C",
                  "#5A4D3F",
                ],
              },
            ],
          }}
        />
      </Card>

      <Card border className="transition-shadow duration-200">
        <p className="mb-1 font-display text-lg font-semibold text-navy-900">Weekly frequency</p>
        <p className="mb-3 text-sm text-navy-600">Sessions completed each week.</p>
        <Bar
          options={baseCartesianOptions}
          data={{
            labels: analyticsData.charts.weekly_frequency.labels,
            datasets: [
              {
                label: "Sessions",
                data: analyticsData.charts.weekly_frequency.values,
                backgroundColor: chartPalette.barPrimary,
                borderRadius: 8,
              },
            ],
          }}
        />
      </Card>

      <Card border className="transition-shadow duration-200">
        <p className="mb-1 font-display text-lg font-semibold text-navy-900">Average session effort (RPE)</p>
        <p className="mb-3 text-sm text-navy-600">Per-session effort trend on a 1-10 scale.</p>
        <Line
          options={baseCartesianOptions}
          data={{
            labels: analyticsData.charts.average_rpe_progression.labels,
            datasets: [
              {
                label: "Average RPE",
                data: analyticsData.charts.average_rpe_progression.values,
                borderColor: chartPalette.lineSecondary,
                backgroundColor: chartPalette.lineSecondaryFill,
                tension: 0.32,
              },
            ],
          }}
        />
      </Card>

      <Card border className="transition-shadow duration-200">
        <p className="mb-1 font-display text-lg font-semibold text-navy-900">Top exercise volume</p>
        <p className="mb-3 text-sm text-navy-600">Total lifted weight by exercise.</p>
        <Bar
          options={baseCartesianOptions}
          data={{
            labels: analyticsData.charts.top_exercise_volume.labels,
            datasets: [
              {
                label: "Volume",
                data: analyticsData.charts.top_exercise_volume.values,
                backgroundColor: chartPalette.barSecondary,
                borderRadius: 8,
              },
            ],
          }}
        />
      </Card>

      <Card border className="transition-shadow duration-200">
        <div className="mb-3 flex items-center justify-between gap-2">
          <p className="font-display text-lg font-semibold text-navy-900">Personal records</p>
          <Badge size="small" colour="neutral">Top {analyticsData.leaderboards.personal_records.length}</Badge>
        </div>
        {analyticsData.leaderboards.personal_records.length === 0 ? (
          <p className="text-sm text-navy-600">No records yet. Log more workouts to populate this section.</p>
        ) : (
          <div className="space-y-2">
            {analyticsData.leaderboards.personal_records.slice(0, 5).map((record) => (
              <div
                key={`${record.exercise_name}-${record.date}`}
                className="flex items-center justify-between rounded-xl border border-navy-300/70 bg-navy-100/70 px-3 py-2"
              >
                <div>
                  <p className="font-medium text-navy-900">{record.exercise_name}</p>
                  <p className="text-xs text-navy-500">{new Date(record.date).toLocaleDateString()}</p>
                </div>
                <p className="font-display text-lg font-semibold text-primary-900">{Math.round(record.estimated_one_rep_maximum)} kg</p>
              </div>
            ))}
          </div>
        )}
      </Card>
    </ApplicationShell>
  );
}
