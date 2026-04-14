export const queryKeyRegistry = {
  dashboardAnalytics: (rangeInDays: number) => ["dashboard", "analytics", rangeInDays] as const,
  dashboardRecentWorkouts: () => ["dashboard", "recent-workouts"] as const,
  dashboardGoals: () => ["dashboard", "goals"] as const,
  dashboardExerciseDefinitions: () => ["dashboard", "exercise-definitions"] as const,
};
