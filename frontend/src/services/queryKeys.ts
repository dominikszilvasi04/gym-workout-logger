export const queryKeyRegistry = {
  dashboardAnalytics: (rangeInDays: number) => ["dashboard", "analytics", rangeInDays] as const,
  dashboardRecentWorkouts: () => ["dashboard", "recent-workouts"] as const,
  dashboardGoals: () => ["dashboard", "goals"] as const,
  dashboardExerciseDefinitions: () => ["dashboard", "exercise-definitions"] as const,
  profileAnalytics: () => ["profile", "analytics"] as const,
  profileRecentWorkouts: () => ["profile", "recent-workouts"] as const,
  profileLastWorkout: () => ["profile", "last-workout"] as const,
  adminUsers: () => ["admin", "users"] as const,
  adminAuditLogs: (limit: number) => ["admin", "audit-logs", limit] as const,
};
