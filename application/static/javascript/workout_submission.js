/**
 * Workout Submission Controller
 * Handles the dynamic form behaviour, asynchronous data fetching from the 
 * Application Programming Interface, and submission logic for logging a new workout session.
 */
document.addEventListener("DOMContentLoaded", async function() {
    const workout_logging_form = document.getElementById("workout_logging_form");
    const exercises_container = document.getElementById("exercises_container");
    const add_exercise_button = document.getElementById("add_exercise_button");
    /** * The master list of standardised exercises retrieved from the server.
     */
    let master_exercise_list = [];

    function get_csrf_token() {
        const csrf_meta_element = document.querySelector('meta[name="csrf-token"]');
        return csrf_meta_element ? csrf_meta_element.getAttribute("content") : "";
    }

    /**
     * Sets the date input to the current local date and time.
     */
    function initialise_default_date() {
        const date_input = document.getElementById("date_of_workout");
        if (date_input) {
            const now = new Date();
            now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
            date_input.value = now.toISOString().slice(0, 16);
        }
    }

    initialise_default_date();

    // This initial fetch populates the master_exercise_list which is used to generate dropdown options for exercise selection.
    try {
        const network_response = await fetch("/api/exercises");
        if (network_response.ok) {
            master_exercise_list = await network_response.json();
        } else {
            alert("Failed to load standardised exercises from the server.");
        }
    } catch (network_error) {
        console.error("Critical network failure:", network_error);
    }


    /**
     * Generates the HTML string for the exercise selection dropdown menu.
     * Iterates through the master_exercise_list to build valid options.
     * * @returns {string} The HTML string containing the option elements.
     */
    function generate_exercise_options() {
        let options_html = `<option value="" disabled selected>Select an exercise...</option>`;
        master_exercise_list.forEach(function(exercise) {
            options_html += `<option value="${exercise._id}" data-exercise-name="${exercise.exercise_name}">${exercise.exercise_name} (${exercise.primary_muscle_group})</option>`;
        });
        return options_html;
    }

    /**
     * Appends a new exercise input block to the exercises container.
     * Injects the dynamically generated dropdown options.
     * * @returns {void}
     */
    function append_new_exercise_block() {
        const options_html = generate_exercise_options();
        const new_exercise_html = `
            <div class="exercise-block border rounded p-3 mb-3 bg-light">
                <div class="mb-3">
                    <label class="form-label">Exercise Selection</label>
                    <select class="form-select exercise-selection-input" required>
                        ${options_html}
                    </select>
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
    }

    // Initialise the first empty block automatically upon page load
    append_new_exercise_block();
    add_exercise_button.addEventListener("click", function() {
        append_new_exercise_block();
    });

    /**
     * Event listener using event delegation to handle dynamic 'Add Set' button clicks.
     * * @param {Event} event - The click event triggered within the exercises container.
     */
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

    /**
     * Intercepts the form submission, parses the Document Object Model, 
     * constructs the strict JSON payload, and transmits it to the backend.
     * * @param {SubmitEvent} submission_event - The default form submission event.
     */
    workout_logging_form.addEventListener("submit", async function(submission_event) {
        submission_event.preventDefault();
        const date_input = document.getElementById("date_of_workout");
        let date_of_workout_value = date_input ? date_input.value : "";
        if (!date_of_workout_value) {
            const now = new Date();
            now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
            date_of_workout_value = now.toISOString().slice(0, 16);
        }

        const muscles_input_string = document.getElementById("target_muscle_groups").value;
        const target_muscle_groups_array = muscles_input_string.split(",").map(item => item.trim()).filter(item => item.length > 0);
        const exercise_blocks = document.querySelectorAll(".exercise-block");
        const parsed_exercises_list = [];
        exercise_blocks.forEach(function(block) {
            const selection_element = block.querySelector(".exercise-selection-input");
            const exercise_identifier_value = selection_element.value;
            const exercise_name_value = selection_element.options[selection_element.selectedIndex].getAttribute("data-exercise-name");
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
                exercise_definition_identifier: exercise_identifier_value,
                sets: parsed_sets_list
            });
        });

        const application_programming_interface_payload = {
            date_of_workout: date_of_workout_value,
            target_muscle_groups: target_muscle_groups_array,
            exercises: parsed_exercises_list
        };

        try {
            const network_response = await fetch("/api/workouts", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRF-Token": get_csrf_token()
                },
                body: JSON.stringify(application_programming_interface_payload)
            });

            if (network_response.ok) {
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