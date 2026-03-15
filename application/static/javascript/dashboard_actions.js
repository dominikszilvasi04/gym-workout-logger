/**
 * Dashboard Actions Controller
 * Handles decoupled user interactions on the dashboard view, 
 * specifically the deletion of historical workout sessions.
 */
document.addEventListener("DOMContentLoaded", function() {
    const workout_history_table = document.querySelector("table");
    if (workout_history_table) {
        workout_history_table.addEventListener("click", async function(click_event) {
            if (click_event.target.classList.contains("delete-workout-button")) {
                const workout_identifier = click_event.target.getAttribute("data-workout-identifier");
                await execute_workout_deletion(workout_identifier);
            }
        });
    }

    /**
     * Executes an asynchronous HTTP DELETE request to remove a workout.
     * @param {string} workout_identifier - The unique database identifier of the workout.
     * @returns {Promise<void>}
     */
    async function execute_workout_deletion(workout_identifier) {
        const user_confirmed = confirm("Are you absolutely certain you wish to delete this workout? This action cannot be undone.");
        if (!user_confirmed) return;
        try {
            const network_response = await fetch(`/api/workouts/${workout_identifier}`, {
                method: "DELETE"
            });
            if (network_response.ok) {
                window.location.reload();
            } else {
                alert("Failed to delete the workout session. Please try again.");
            }
        } catch (network_error) {
            console.error("Network failure during deletion:", network_error);
            alert("A critical network error occurred while communicating with the server.");
        }
    }
});