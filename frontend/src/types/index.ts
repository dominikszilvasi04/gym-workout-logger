// User types
export interface User {
  _id: string;
  email: string;
  display_name?: string;
  created_at: string;
}

// Exercise types
export interface ExerciseDefinition {
  _id: string;
  exercise_name: string;
  primary_muscle_group: string;
  equipment_required: string;
}

// Workout set
export interface WorkoutSet {
  repetitions: number;
  weight_in_kilograms: number;
  rate_of_perceived_exertion: number; // 1-10 scale
}

// Exercise log (within workout)
export interface ExerciseLog {
  exercise_name: string;
  exercise_definition_identifier?: string;
  sets: WorkoutSet[];
}

// Workout data structure
export interface Workout {
  _id: string;
  user_identifier: string;
  date_of_workout: string;
  target_muscle_groups: string[];
  exercises: ExerciseLog[];
}

// Workout template
export interface WorkoutTemplate {
  _id: string;
  user_identifier: string;
  template_name: string;
  target_muscle_groups: string[];
  exercises: ExerciseLog[];
  created_at: string;
}

// Analytics data
export interface AnalyticsData {
  filters: {
    range_days: number;
    selected_exercise?: string;
    available_exercises: string[];
  };
  summary: {
    total_workouts: number;
    total_volume: number;
    average_workout_volume: number;
    total_sets: number;
    total_repetitions: number;
    total_exercises: number;
    strongest_estimated_one_rep_maximum: number;
    average_session_rpe: number;
    current_training_streak_weeks: number;
  };
  charts: {
    one_rep_max_progression: {
      labels: string[];
      values: number[];
    };
    workout_volume_progression: {
      labels: string[];
      values: number[];
    };
    muscle_group_distribution: {
      labels: string[];
      values: number[];
    };
    weekly_frequency: {
      labels: string[];
      values: number[];
    };
    average_rpe_progression: {
      labels: string[];
      values: number[];
    };
    top_exercise_volume: {
      labels: string[];
      values: number[];
    };
  };
  leaderboards: {
    personal_records: Array<{
      exercise_name: string;
      estimated_one_rep_maximum: number;
      date: string;
    }>;
  };
}

// API Response types
export interface ApiResponse<T = unknown> {
  message?: string;
  identifier?: string;
  data?: T;
  error?: string;
  details?: Record<string, string[]>;
}

// Form state types
export interface LoginFormData {
  email: string;
  password: string;
}

export interface RegisterFormData {
  email: string;
  password: string;
  display_name?: string;
}

export interface CreateWorkoutFormData {
  date_of_workout: string;
  target_muscle_groups: string[];
  exercises: ExerciseLog[];
  save_as_template?: boolean;
  template_name?: string;
}
