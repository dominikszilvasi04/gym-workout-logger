/**
 * Workout Update Controller
 * Handles the logic for pre-populating the edit form and transmitting 
 * updated workout data to the backend via the PUT method.
 */
document.addEventListener("DOMContentLoaded", async function() {
    const workout_update_form = document.getElementById("workout_update_form");
    const exercises_container = document.getElementById("exercises_container");
    const add_exercise_button = document.getElementById("add_exercise_button");
    const workout_identifier = document.getElementById("workout_identifier").value;

    function get_csrf_token() {
        const csrf_meta_element = document.querySelector('meta[name="csrf-token"]');
        return csrf_meta_element ? csrf_meta_element.getAttribute("content") : "";
    }

    let master_exercise_list = [];

    try {
        const network_response = await fetch("/api/exercises");
        if (network_response.ok) {
            master_exercise_list = await network_response.json();
            initialise_exercise_dropdowns();
        }
    } catch (network_error) {
        console.error("Failed to initialise update form:", network_error);
    }

    /**
     * Populates all existing exercise dropdowns with the master list 
     * and sets the selected value based on previous data.
     */
    function initialise_exercise_dropdowns() {
        const dropdowns = document.querySelectorAll(".exercise-selection-input");
        const options_html = generate_exercise_options();
        dropdowns.forEach(function(select_element) {
            const previously_selected_id = select_element.getAttribute("data-selected-id");
            select_element.innerHTML = options_html;
            select_element.value = previously_selected_id;
        });
    }

    /**
     * Generates the HTML string for exercise options.
     * @returns {string}
     */
    function generate_exercise_options() {
        let options_html = `<option value="" disabled>Select an exercise...</option>`;
        master_exercise_list.forEach(function(exercise) {
            options_html += `<option value="${exercise._id}" data-exercise-name="${exercise.exercise_name}">${exercise.exercise_name}</option>`;
        });
        return options_html;
    }

    add_exercise_button.addEventListener("click", function() {
        const options_html = generate_exercise_options();
        const new_exercise_html = `
            <div class="exercise-block border rounded p-3 mb-3 bg-light">
                <div class="mb-3">
                    <label class="form-label">Exercise Selection</label>
                    <select class="form-select exercise-selection-input" required>
                        ${options_html}
                    </select>
                </div>
                <div class="sets-container">
                    <div class="row mb-2 set-row">
                        <div class="col"><input type="number" class="form-control weight-input" placeholder="kg" step="0.5" required></div>
                        <div class="col"><input type="number" class="form-control repetitions-input" placeholder="Reps" required></div>
                        <div class="col"><input type="number" class="form-control exertion-input" placeholder="RPE" min="1" max="10" required></div>
                    </div>
                </div>
                <button type="button" class="btn btn-sm btn-outline-secondary mt-2 add-set-button">Add Another Set</button>
            </div>`;
        exercises_container.insertAdjacentHTML("beforeend", new_exercise_html);
    });

    exercises_container.addEventListener("click", function(event) {
        if (event.target.classList.contains("add-set-button")) {
            const container = event.target.previousElementSibling;
            const set_html = `
                <div class="row mb-2 set-row">
                    <div class="col"><input type="number" class="form-control weight-input" step="0.5" required></div>
                    <div class="col"><input type="number" class="form-control repetitions-input" required></div>
                    <div class="col"><input type="number" class="form-control exertion-input" min="1" max="10" required></div>
                </div>`;
            container.insertAdjacentHTML("beforeend", set_html);
        }
    });

    workout_update_form.addEventListener("submit", async function(event) {
        event.preventDefault();
        const muscles_array = document.getElementById("target_muscle_groups").value.split(",").map(s => s.trim()).filter(item => item.length > 0);
        const exercise_blocks = document.querySelectorAll(".exercise-block");
        const exercises_payload = [];
        exercise_blocks.forEach(function(block) {
            const select = block.querySelector(".exercise-selection-input");
            const sets = [];
            block.querySelectorAll(".set-row").forEach(function(row) {
                sets.push({
                    weight_in_kilograms: parseFloat(row.querySelector(".weight-input").value),
                    repetitions: parseInt(row.querySelector(".repetitions-input").value, 10),
                    rate_of_perceived_exertion: parseInt(row.querySelector(".exertion-input").value, 10)
                });
            });
            exercises_payload.push({
                exercise_name: select.options[select.selectedIndex].getAttribute("data-exercise-name"),
                exercise_definition_identifier: select.value,
                sets: sets
            });
        });
        try {
            const response = await fetch(`/api/workouts/${workout_identifier}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRF-Token": get_csrf_token()
                },
                body: JSON.stringify({
                    target_muscle_groups: muscles_array,
                    exercises: exercises_payload
                })
            });
            if (response.ok) {
                window.location.href = "/";
            } else {
                alert("Update failed. Please check your data.");
            }
        } catch (error) {
            console.error("Network error during update:", error);
        }
    });
});