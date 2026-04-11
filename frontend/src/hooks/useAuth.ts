import React from "react";
import { useEffect } from "react";
import { useAuthStore } from "../store/authStore";

/**
 * Hook to check and manage authentication status
 */
export function useAuth() {
  const { user, isAuthenticated, isLoading, error, checkAuth, clearError } =
    useAuthStore();

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  return {
    user,
    isAuthenticated,
    isLoading,
    error,
    clearError,
  };
}

/**
 * Hook to handle form submission with loading and error states
 */
export function useFormSubmit<T>(
  onSubmit: (data: T) => Promise<void>
) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const submit = async (data: T) => {
    setIsSubmitting(true);
    setError(null);
    try {
      await onSubmit(data);
    } catch (err) {
      const message = err instanceof Error ? err.message : "An error occurred";
      setError(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return { submit, isSubmitting, error, setError };
}

