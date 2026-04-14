import { expect, test } from "@playwright/test";

test.describe("Mobile log workout journey", () => {
  test("allows signing in, adding an exercise, and saving a workout", async ({ page }) => {
    await page.route("**/api/auth/me", async (route) => {
      await route.fulfill({
        status: 401,
        contentType: "application/json",
        body: JSON.stringify({ error: "Unauthorised" }),
      });
    });

    await page.route("**/login", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({
            _id: "user-1",
            email: "athlete@example.com",
            display_name: "Athlete",
            created_at: "2026-01-01T00:00:00.000Z",
            role: "user",
            is_admin: false,
          }),
        });
        return;
      }

      await route.continue();
    });

    await page.route("**/api/dashboard/analytics**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({
          filters: { range_days: 30, available_exercises: [] },
          summary: {
            total_workouts: 0,
            total_volume: 0,
            average_workout_volume: 0,
            total_sets: 0,
            total_repetitions: 0,
            total_exercises: 0,
            strongest_estimated_one_rep_maximum: 0,
            average_session_rpe: 0,
            current_training_streak_weeks: 0,
          },
          charts: {
            one_rep_max_progression: { labels: [], values: [] },
            workout_volume_progression: { labels: [], values: [] },
            muscle_group_distribution: { labels: [], values: [] },
            weekly_frequency: { labels: [], values: [] },
            average_rpe_progression: { labels: [], values: [] },
            top_exercise_volume: { labels: [], values: [] },
          },
          leaderboards: { personal_records: [] },
        }),
      });
    });

    await page.route("**/api/goals", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    });

    await page.route("**/api/workouts?**", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ workouts: [], total: 0 }),
      });
    });

    await page.route("**/api/exercises", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([
          {
            _id: "exercise-1",
            exercise_name: "Bench Press",
            primary_muscle_group: "Push",
            equipment_required: "Barbell",
          },
        ]),
      });
    });

    await page.route("**/api/workout-templates", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify([]),
      });
    });

    await page.route("**/api/workouts/last-used-values", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ last_used_values: {} }),
      });
    });

    await page.route("**/api/auth/csrf", async (route) => {
      await route.fulfill({
        status: 200,
        contentType: "application/json",
        body: JSON.stringify({ csrf_token: "test-csrf-token" }),
      });
    });

    await page.route("**/api/workouts", async (route) => {
      if (route.request().method() === "POST") {
        await route.fulfill({
          status: 200,
          contentType: "application/json",
          body: JSON.stringify({ identifier: "workout-1" }),
        });
        return;
      }

      await route.continue();
    });

    await page.goto("/login");

    await page.getByLabel("Email address").fill("athlete@example.com");
    await page.getByLabel("Password").fill("secure-passphrase-123");
    await page.getByRole("button", { name: /^sign in$/i }).click();

    await page.getByRole("link", { name: /log/i }).click();

    await expect(page.getByRole("heading", { name: /log workout/i })).toBeVisible();

    await page.getByRole("button", { name: /add exercise/i }).click();
    await page.getByRole("button", { name: /bench press/i }).click();

    await expect(page.getByText(/bench press/i)).toBeVisible();

    await page.getByRole("button", { name: /^save$/i }).click();

    await expect(page.getByText(/workout saved successfully/i)).toBeVisible();
  });
});
