import { useEffect, useState } from "react";
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
  const [rangeDays, setRangeDays] = useState("30");
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAnalytics = async () => {
      setLoading(true);
      try {
        const response = await workoutAPI.getAnalytics(Number(rangeDays));
        setAnalyticsData(response);
      } finally {
        setLoading(false);
      }
    };

    void loadAnalytics();
  }, [rangeDays]);

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
      <Tabs
        items={[
          { key: "7", label: "7 days" },
          { key: "30", label: "30 days" },
          { key: "90", label: "90 days" },
        ]}
        selectedKey={rangeDays}
        onSelect={setRangeDays}
      />

      <Card border>
        <p className="mb-2 font-display text-lg font-semibold text-navy-900">Estimated one repetition maximum</p>
        <Line
          options={{
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
              x: { ticks: { maxTicksLimit: 6 } },
              y: { beginAtZero: true },
            },
          }}
          data={{
            labels: analyticsData.charts.one_rep_max_progression.labels,
            datasets: [
              {
                label: "Estimated one repetition maximum",
                data: analyticsData.charts.one_rep_max_progression.values,
                borderColor: "#4F46E5",
                backgroundColor: "rgba(79,70,229,0.2)",
                tension: 0.3,
              },
            ],
          }}
        />
      </Card>

      <Card border>
        <p className="mb-2 font-display text-lg font-semibold text-navy-900">Workout volume</p>
        <Bar
          options={{
            responsive: true,
            plugins: { legend: { display: false } },
            scales: {
              x: { ticks: { maxTicksLimit: 6 } },
              y: { beginAtZero: true },
            },
          }}
          data={{
            labels: analyticsData.charts.workout_volume_progression.labels,
            datasets: [
              {
                label: "Volume",
                data: analyticsData.charts.workout_volume_progression.values,
                backgroundColor: "rgba(16,185,129,0.7)",
                borderRadius: 8,
              },
            ],
          }}
        />
      </Card>

      <Card border>
        <p className="mb-2 font-display text-lg font-semibold text-navy-900">Target muscle distribution</p>
        <Doughnut
          options={{
            responsive: true,
            plugins: {
              legend: {
                position: "bottom",
                labels: {
                  usePointStyle: true,
                },
              },
            },
          }}
          data={{
            labels: analyticsData.charts.muscle_group_distribution.labels,
            datasets: [
              {
                data: analyticsData.charts.muscle_group_distribution.values,
                backgroundColor: [
                  "#4F46E5",
                  "#0EA5E9",
                  "#10B981",
                  "#F97316",
                  "#F43F5E",
                  "#334155",
                ],
              },
            ],
          }}
        />
      </Card>
    </ApplicationShell>
  );
}
