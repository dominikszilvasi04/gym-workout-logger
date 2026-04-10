import axios, { AxiosError } from "axios";
import type {
  AxiosInstance,
  InternalAxiosRequestConfig,
} from "axios";
import type {
  User,
  ExerciseDefinition,
  Workout,
  WorkoutTemplate,
  AnalyticsData,
  ApiResponse,
  CreateWorkoutFormData,
} from "../types";

// API base URL (adjust for your environment)
const API_BASE_URL = import.meta.env.VITE_API_URL || "";

let csrfTokenValue: string | null = null;

export function clearCachedCsrfToken() {
  csrfTokenValue = null;
}

// Create axios instance
const apiClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true, // Enable cookies for session-based auth
  headers: {
    "Content-Type": "application/json",
  },
});

// Request interceptor to add CSRF token
apiClient.interceptors.request.use(
  async (config: InternalAxiosRequestConfig) => {
    const requestMethod = (config.method || "get").toLowerCase();
    if (requestMethod !== "get") {
      if (!csrfTokenValue) {
        const response = await apiClient.get<{ csrf_token: string }>("/api/auth/csrf");
        csrfTokenValue = response.data.csrf_token;
      }
      if (csrfTokenValue) {
        config.headers["X-CSRF-Token"] = csrfTokenValue;
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError) => {
    return Promise.reject(error);
  }
);

// Auth API calls
export const authAPI = {
  getCurrentUser: async (): Promise<User> => {
    const response = await apiClient.get<User>("/api/auth/me");
    return response.data;
  },

  login: async (email: string, password: string): Promise<User> => {
    const response = await apiClient.post<User>("/login", {
      email,
      password,
    });
    clearCachedCsrfToken();
    return response.data;
  },

  register: async (
    email: string,
    password: string,
    displayName?: string
  ): Promise<User> => {
    const response = await apiClient.post<User>("/register", {
      email,
      password,
      display_name: displayName,
    });
    clearCachedCsrfToken();
    return response.data;
  },

  logout: async (): Promise<void> => {
    await apiClient.post("/logout");
    clearCachedCsrfToken();
  },
};

// Exercise API calls
export const exerciseAPI = {
  // Get all exercises
  getAll: async (): Promise<ExerciseDefinition[]> => {
    const response = await apiClient.get<ExerciseDefinition[]>(
      "/api/exercises"
    );
    return response.data;
  },

  // Request new exercise
  requestNew: async (
    exerciseName: string,
    muscleGroup: string,
    equipment: string,
    notes?: string
  ): Promise<ApiResponse> => {
    const response = await apiClient.post<ApiResponse>(
      "/api/exercises/requests",
      {
        exercise_name: exerciseName,
        primary_muscle_group: muscleGroup,
        equipment_required: equipment,
        additional_notes: notes,
      }
    );
    return response.data;
  },
};

// Workout API calls
export const workoutAPI = {
  // Get all workouts (paginated)
  getAll: async (
    page: number = 1,
    limit: number = 20,
    sort: string = "date_of_workout",
    order: string = "desc"
  ): Promise<{ workouts: Workout[]; total: number }> => {
    const response = await apiClient.get<{
      workouts: Workout[];
      total: number;
    }>("/api/workouts", {
      params: { page, limit, sort, order },
    });
    return response.data;
  },

  // Get single workout
  getById: async (id: string): Promise<Workout> => {
    const response = await apiClient.get<Workout>(`/api/workouts/${id}`);
    return response.data;
  },

  // Get last workout
  getLast: async (): Promise<Workout | null> => {
    try {
      const response = await apiClient.get<Workout>("/api/workouts/last");
      return response.data;
    } catch {
      return null;
    }
  },

  // Get last-used values per exercise
  getLastUsedValues: async (): Promise<
    Record<string, Record<string, unknown>>
  > => {
    const response = await apiClient.get<Record<string, Record<string, unknown>>>(
      "/api/workouts/last-used-values"
    );
    return response.data || {};
  },

  // Create workout
  create: async (data: CreateWorkoutFormData): Promise<string> => {
    try {
      const response = await apiClient.post<ApiResponse>("/api/workouts", data);
      return response.data.identifier || "";
    } catch (error) {
      if (axios.isAxiosError(error)) {
        const serverMessage =
          typeof error.response?.data === "object" && error.response?.data !== null
            ? ((error.response.data as { error?: string }).error || "")
            : "";
        const serverDetails =
          typeof error.response?.data === "object" && error.response?.data !== null
            ? JSON.stringify(error.response.data)
            : "";
        const message = serverMessage || serverDetails || "Unable to save workout.";
        if (message.toLowerCase().includes("csrf")) {
          clearCachedCsrfToken();
          const retryResponse = await apiClient.post<ApiResponse>("/api/workouts", data);
          return retryResponse.data.identifier || "";
        }
        throw new Error(message);
      }
      throw error;
    }
  },

  // Update workout
  update: async (id: string, data: CreateWorkoutFormData): Promise<void> => {
    await apiClient.put(`/api/workouts/${id}`, data);
  },

  // Delete workout
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/workouts/${id}`);
  },

  // Get analytics
  getAnalytics: async (
    rangeDays: number = 30,
    exerciseName?: string
  ): Promise<AnalyticsData> => {
    const params: Record<string, unknown> = { range_days: rangeDays };
    if (exerciseName) {
      params.exercise_name = exerciseName;
    }
    const response = await apiClient.get<AnalyticsData>(
      "/api/dashboard/analytics",
      { params }
    );
    return response.data;
  },

  // Get dashboard init (composite endpoint)
  initDashboard: async (): Promise<{
    exercises: ExerciseDefinition[];
    templates: WorkoutTemplate[];
    recent_workouts: Workout[];
    user: User;
  }> => {
    const response = await apiClient.get<{
      exercises: ExerciseDefinition[];
      templates: WorkoutTemplate[];
      recent_workouts: Workout[];
      user: User;
    }>("/api/dashboard/init");
    return response.data;
  },
};

// Workout Template API calls
export const templateAPI = {
  // Get all templates
  getAll: async (): Promise<WorkoutTemplate[]> => {
    const response = await apiClient.get<WorkoutTemplate[]>(
      "/api/workout-templates"
    );
    return response.data;
  },

  // Get single template
  getById: async (id: string): Promise<WorkoutTemplate> => {
    const response = await apiClient.get<WorkoutTemplate>(
      `/api/workout-templates/${id}`
    );
    return response.data;
  },

  // Create template
  create: async (
    data: Omit<WorkoutTemplate, "_id" | "user_identifier" | "created_at">
  ): Promise<string> => {
    const response = await apiClient.post<ApiResponse>(
      "/api/workout-templates",
      data
    );
    return response.data.identifier || "";
  },

  // Update template
  update: async (
    id: string,
    data: Partial<WorkoutTemplate>
  ): Promise<void> => {
    await apiClient.put(`/api/workout-templates/${id}`, data);
  },

  // Delete template
  delete: async (id: string): Promise<void> => {
    await apiClient.delete(`/api/workout-templates/${id}`);
  },
};

// Health check
export const healthAPI = {
  check: async (): Promise<{ status: string }> => {
    const response = await apiClient.get<{ status: string }>("/health");
    return response.data;
  },
};

export default apiClient;
