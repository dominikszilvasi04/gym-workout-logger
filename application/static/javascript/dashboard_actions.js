/**
 * Dashboard Actions Controller
 * Handles decoupled user interactions on the dashboard view, 
 * specifically the deletion of historical workout sessions.
 */
document.addEventListener("DOMContentLoaded", function() {
    function get_csrf_token() {
        const csrf_meta_element = document.querySelector('meta[name="csrf-token"]');
        return csrf_meta_element ? csrf_meta_element.getAttribute("content") : "";
    }

    document.addEventListener("click", async function(click_event) {
        const delete_button = click_event.target.closest(".delete-workout-button");
        if (!delete_button) {
            return;
        }
        const workout_identifier = delete_button.getAttribute("data-workout-identifier");
        const redirect_url = delete_button.getAttribute("data-redirect-url");
        await execute_workout_deletion(workout_identifier, redirect_url);
    });

    /**
     * Executes an asynchronous HTTP DELETE request to remove a workout.
     * @param {string} workout_identifier - The unique database identifier of the workout.
     * @param {string | null} redirect_url - Where to send the user after deletion.
     * @returns {Promise<void>}
     */
    async function execute_workout_deletion(workout_identifier, redirect_url = null) {
        const user_confirmed = confirm("Are you absolutely certain you wish to delete this workout? This action cannot be undone.");
        if (!user_confirmed) return;
        try {
            const network_response = await fetch(`/api/workouts/${workout_identifier}`, {
                method: "DELETE",
                headers: {
                    "X-CSRF-Token": get_csrf_token()
                }
            });
            if (network_response.ok) {
                if (redirect_url) {
                    window.location.href = redirect_url;
                } else {
                    window.location.reload();
                }
            } else {
                alert("Failed to delete the workout session. Please try again.");
            }
        } catch (network_error) {
            console.error("Network failure during deletion:", network_error);
            alert("A critical network error occurred while communicating with the server.");
        }
    }
});