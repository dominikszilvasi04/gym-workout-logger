/**
 * Handles the dynamic form behaviour and submission logic for logging a new workout.
 */

document.addEventListener("DOMContentLoaded", function() {
    const workout_logging_form = document.getElementById("workout_logging_form");
    const exercises_container = document.getElementById("exercises_container");
    const add_exercise_button = document.getElementById("add_exercise_button");

    // --- Dynamic DOM Manipulation ---

    // 1. Add a completely new exercise block when requested
    add_exercise_button.addEventListener("click", function() {
        const new_exercise_html = `
            <div class="exercise-block border rounded p-3 mb-3 bg-light">
                <div class="mb-3">
                    <label class="form-label">Exercise Name</label>
                    <input type="text" class="form-control exercise-name-input" placeholder="e.g. Barbell Squat" required>
                </div>
                
                <h6>Sets</h6>
                <div class="sets-container">
                    <div class="row mb-2 set-row">
                        <div class="col">
                            <input type="number" class="form-control weight-input" placeholder="Weight (kg)" step="0.5" min="0" required>
                        </div>
                        <div class="col">
                            <input type="number" class="form-control repetitions-input" placeholder="Repetitions" min="1" required>
                        </div>
                        <div class="col">
                            <input type="number" class="form-control exertion-input" placeholder="RPE (1-10)" min="1" max="10" required>
                        </div>
                    </div>
                </div>
                <button type="button" class="btn btn-sm btn-outline-secondary mt-2 add-set-button">Add Another Set</button>
            </div>
        `;
        exercises_container.insertAdjacentHTML("beforeend", new_exercise_html);
    });

    // 2. Add a new set row to a specific exercise (using event delegation)
    exercises_container.addEventListener("click", function(event) {
        if (event.target.classList.contains("add-set-button")) {
            const sets_container = event.target.previousElementSibling;
            const new_set_html = `
                <div class="row mb-2 set-row">
                    <div class="col">
                        <input type="number" class="form-control weight-input" placeholder="Weight (kg)" step="0.5" min="0" required>
                    </div>
                    <div class="col">
                        <input type="number" class="form-control repetitions-input" placeholder="Repetitions" min="1" required>
                    </div>
                    <div class="col">
                        <input type="number" class="form-control exertion-input" placeholder="RPE (1-10)" min="1" max="10" required>
                    </div>
                </div>
            `;
            sets_container.insertAdjacentHTML("beforeend", new_set_html);
        }
    });

    // --- Form Submission and API Communication ---

    workout_logging_form.addEventListener("submit", async function(submission_event) {
        // Prevent the browser from refreshing the page
        submission_event.preventDefault();

        // 1. Parse Target Muscle Groups
        const muscles_input_string = document.getElementById("target_muscle_groups").value;
        const target_muscle_groups_array = muscles_input_string.split(",").map(item => item.trim()).filter(item => item.length > 0);

        // 2. Parse Exercises and Sets
        const exercise_blocks = document.querySelectorAll(".exercise-block");
        const parsed_exercises_list = [];

        exercise_blocks.forEach(function(block) {
            const exercise_name_value = block.querySelector(".exercise-name-input").value;
            const set_rows = block.querySelectorAll(".set-row");
            const parsed_sets_list = [];

            set_rows.forEach(function(row) {
                const weight_value = parseFloat(row.querySelector(".weight-input").value);
                const repetitions_value = parseInt(row.querySelector(".repetitions-input").value, 10);
                const exertion_value = parseInt(row.querySelector(".exertion-input").value, 10);

                parsed_sets_list.push({
                    repetitions: repetitions_value,
                    weight_in_kilograms: weight_value,
                    rate_of_perceived_exertion: exertion_value
                });
            });

            parsed_exercises_list.push({
                exercise_name: exercise_name_value,
                sets: parsed_sets_list
            });
        });

        // 3. Construct the exact JSON payload expected by our Pydantic Model
        const application_programming_interface_payload = {
            target_muscle_groups: target_muscle_groups_array,
            exercises: parsed_exercises_list
        };

        // 4. Send the data to our Python backend
        try {
            const network_response = await fetch("/api/workouts", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(application_programming_interface_payload)
            });

            if (network_response.ok) {
                // If successful, redirect the user back to the main dashboard
                window.location.href = "/";
            } else {
                const error_data = await network_response.json();
                alert("Validation Failed: " + JSON.stringify(error_data));
            }
        } catch (network_error) {
            alert("A critical network error occurred while contacting the server.");
        }
    });
});