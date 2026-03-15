/**
 * Workout submission controller.
 * Provides searchable exercise selection and request-email workflow.
 */
document.addEventListener("DOMContentLoaded", async function() {
    const workout_logging_form = document.getElementById("workout_logging_form");
    const exercise_request_form = document.getElementById("exercise_request_form");
    const exercises_container = document.getElementById("exercises_container");
    const add_exercise_button = document.getElementById("add_exercise_button");
    const exercise_catalogue_count_badge = document.getElementById("exercise_catalogue_count_badge");
    let master_exercise_list = [];

    function get_csrf_token() {
        const csrf_meta_element = document.querySelector('meta[name="csrf-token"]');
        return csrf_meta_element ? csrf_meta_element.getAttribute("content") : "";
    }

    function initialise_default_date() {
        const date_input = document.getElementById("date_of_workout");
        if (!date_input) {
            return;
        }
        const now = new Date();
        now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
        date_input.value = now.toISOString().slice(0, 16);
    }

    function update_exercise_catalogue_badge() {
        if (!exercise_catalogue_count_badge) {
            return;
        }
        exercise_catalogue_count_badge.textContent = `Exercises: ${master_exercise_list.length}`;
    }

    function create_set_row_markup() {
        return `
            <div class="row g-2 set-row">
                <div class="col-md-4"><input type="number" class="form-control weight-input" placeholder="Weight (kg)" step="0.5" min="0" required></div>
                <div class="col-md-4"><input type="number" class="form-control repetitions-input" placeholder="Repetitions" min="1" required></div>
                <div class="col-md-4"><input type="number" class="form-control exertion-input" placeholder="RPE (1-10)" min="1" max="10" required></div>
            </div>
        `;
    }

    function create_exercise_block_markup() {
        return `
            <div class="exercise-block border rounded-3 p-3 bg-body-tertiary">
                <div class="row g-2 align-items-end mb-3">
                    <div class="col-lg-8 position-relative">
                        <label class="form-label">Exercise Search</label>
                        <input type="text" class="form-control exercise-search-input" placeholder="Start typing an exercise name" autocomplete="off" required>
                        <input type="hidden" class="exercise-identifier-input" required>
                        <div class="exercise-suggestions list-group position-absolute w-100 d-none" style="z-index: 1050;"></div>
                    </div>
                    <div class="col-lg-4 d-flex gap-2">
                        <button type="button" class="btn btn-outline-secondary flex-fill add-set-button">Add Set</button>
                        <button type="button" class="btn btn-outline-danger remove-exercise-button">Remove</button>
                    </div>
                </div>
                <div class="sets-container d-grid gap-2">${create_set_row_markup()}</div>
            </div>
        `;
    }

    function append_new_exercise_block() {
        exercises_container.insertAdjacentHTML("beforeend", create_exercise_block_markup());
    }

    function find_exercise_matches(search_term) {
        const normalised_search_term = search_term.toLowerCase().trim();
        if (normalised_search_term.length < 2) {
            return [];
        }
        return master_exercise_list
            .filter(function(exercise) {
                const exercise_name = String(exercise.exercise_name || "").toLowerCase();
                const primary_muscle_group = String(exercise.primary_muscle_group || "").toLowerCase();
                return exercise_name.includes(normalised_search_term) || primary_muscle_group.includes(normalised_search_term);
            })
            .slice(0, 8);
    }

    function render_exercise_suggestions(exercise_block, matching_exercises) {
        const suggestions_element = exercise_block.querySelector(".exercise-suggestions");
        if (!suggestions_element) {
            return;
        }
        if (!matching_exercises.length) {
            suggestions_element.classList.add("d-none");
            suggestions_element.innerHTML = "";
            return;
        }
        suggestions_element.innerHTML = matching_exercises.map(function(exercise) {
            return `<button type="button" class="list-group-item list-group-item-action exercise-suggestion-option" data-identifier="${exercise._id}" data-name="${exercise.exercise_name}">${exercise.exercise_name} <span class="text-muted">(${exercise.primary_muscle_group})</span></button>`;
        }).join("");
        suggestions_element.classList.remove("d-none");
    }

    function hide_suggestions(exercise_block) {
        const suggestions_element = exercise_block.querySelector(".exercise-suggestions");
        if (!suggestions_element) {
            return;
        }
        suggestions_element.classList.add("d-none");
        suggestions_element.innerHTML = "";
    }

    function select_exercise(exercise_block, exercise_identifier, exercise_name) {
        const search_input_element = exercise_block.querySelector(".exercise-search-input");
        const identifier_input_element = exercise_block.querySelector(".exercise-identifier-input");
        if (!search_input_element || !identifier_input_element) {
            return;
        }
        search_input_element.value = exercise_name;
        identifier_input_element.value = exercise_identifier;
        hide_suggestions(exercise_block);
    }

    async function load_standardised_exercises() {
        const network_response = await fetch("/api/exercises");
        if (!network_response.ok) {
            throw new Error(`Failed to load exercises with status ${network_response.status}`);
        }
        master_exercise_list = await network_response.json();
        update_exercise_catalogue_badge();
    }

    async function submit_exercise_request() {
        const feedback_element = document.getElementById("exercise_request_feedback");
        const requester_email = document.getElementById("exercise_requester_email").value.trim();
        const exercise_name = document.getElementById("requested_exercise_name").value.trim();
        const primary_muscle_group = document.getElementById("requested_primary_muscle_group").value.trim();
        const notes = document.getElementById("requested_exercise_notes").value.trim();

        const network_response = await fetch("/api/exercises/requests", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-CSRF-Token": get_csrf_token(),
            },
            body: JSON.stringify({
                requester_email: requester_email,
                exercise_name: exercise_name,
                primary_muscle_group: primary_muscle_group,
                notes: notes,
            }),
        });

        if (network_response.ok) {
            if (feedback_element) {
                feedback_element.className = "small text-success";
                feedback_element.textContent = "Request sent successfully. Thank you!";
            }
            exercise_request_form.reset();
            return;
        }

        const error_payload = await network_response.json().catch(function() {
            return { error: "Unable to send request." };
        });
        if (feedback_element) {
            feedback_element.className = "small text-danger";
            feedback_element.textContent = error_payload.error || "Unable to send request.";
        }
    }

    function build_workout_payload() {
        const date_input = document.getElementById("date_of_workout");
        let date_of_workout_value = date_input ? date_input.value : "";
        if (!date_of_workout_value) {
            const now = new Date();
            now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
            date_of_workout_value = now.toISOString().slice(0, 16);
        }

        const target_muscle_groups_input = document.getElementById("target_muscle_groups").value;
        const target_muscle_groups_array = target_muscle_groups_input.split(",").map(function(muscle_group) {
            return muscle_group.trim();
        }).filter(function(muscle_group) {
            return muscle_group.length > 0;
        });

        const parsed_exercises_list = [];
        exercises_container.querySelectorAll(".exercise-block").forEach(function(exercise_block) {
            const exercise_search_input = exercise_block.querySelector(".exercise-search-input");
            const exercise_identifier_input = exercise_block.querySelector(".exercise-identifier-input");
            const parsed_sets_list = [];
            exercise_block.querySelectorAll(".set-row").forEach(function(set_row) {
                parsed_sets_list.push({
                    repetitions: parseInt(set_row.querySelector(".repetitions-input").value, 10),
                    weight_in_kilograms: parseFloat(set_row.querySelector(".weight-input").value),
                    rate_of_perceived_exertion: parseInt(set_row.querySelector(".exertion-input").value, 10),
                });
            });
            parsed_exercises_list.push({
                exercise_name: exercise_search_input.value.trim(),
                exercise_definition_identifier: exercise_identifier_input.value,
                sets: parsed_sets_list,
            });
        });

        return {
            date_of_workout: date_of_workout_value,
            target_muscle_groups: target_muscle_groups_array,
            exercises: parsed_exercises_list,
        };
    }

    function validate_selected_exercises() {
        const invalid_exercise_block = Array.from(exercises_container.querySelectorAll(".exercise-block")).find(function(exercise_block) {
            const identifier_input = exercise_block.querySelector(".exercise-identifier-input");
            return !identifier_input.value;
        });
        return !invalid_exercise_block;
    }

    initialise_default_date();
    try {
        await load_standardised_exercises();
    } catch (network_error) {
        console.error("Failed to load standardised exercises:", network_error);
        alert("Unable to load exercises right now. Please refresh and try again.");
    }

    append_new_exercise_block();

    add_exercise_button.addEventListener("click", function() {
        append_new_exercise_block();
    });

    exercises_container.addEventListener("input", function(event) {
        const search_input_element = event.target.closest(".exercise-search-input");
        if (!search_input_element) {
            return;
        }
        const exercise_block = search_input_element.closest(".exercise-block");
        const identifier_input_element = exercise_block.querySelector(".exercise-identifier-input");
        identifier_input_element.value = "";
        const matching_exercises = find_exercise_matches(search_input_element.value);
        render_exercise_suggestions(exercise_block, matching_exercises);
    });

    exercises_container.addEventListener("click", function(event) {
        const add_set_button = event.target.closest(".add-set-button");
        if (add_set_button) {
            const exercise_block = add_set_button.closest(".exercise-block");
            const sets_container = exercise_block.querySelector(".sets-container");
            sets_container.insertAdjacentHTML("beforeend", create_set_row_markup());
            return;
        }

        const remove_exercise_button = event.target.closest(".remove-exercise-button");
        if (remove_exercise_button) {
            const exercise_blocks = exercises_container.querySelectorAll(".exercise-block");
            if (exercise_blocks.length === 1) {
                return;
            }
            remove_exercise_button.closest(".exercise-block").remove();
            return;
        }

        const exercise_suggestion_button = event.target.closest(".exercise-suggestion-option");
        if (exercise_suggestion_button) {
            const exercise_block = exercise_suggestion_button.closest(".exercise-block");
            const exercise_identifier = exercise_suggestion_button.getAttribute("data-identifier");
            const exercise_name = exercise_suggestion_button.getAttribute("data-name");
            select_exercise(exercise_block, exercise_identifier, exercise_name);
        }
    });

    document.addEventListener("click", function(event) {
        exercises_container.querySelectorAll(".exercise-block").forEach(function(exercise_block) {
            if (!exercise_block.contains(event.target)) {
                hide_suggestions(exercise_block);
            }
        });
    });

    workout_logging_form.addEventListener("submit", async function(submission_event) {
        submission_event.preventDefault();
        if (!validate_selected_exercises()) {
            alert("Please select each exercise from the search suggestions before saving.");
            return;
        }
        const workout_payload = build_workout_payload();
        const network_response = await fetch("/api/workouts", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-CSRF-Token": get_csrf_token(),
            },
            body: JSON.stringify(workout_payload),
        });
        if (network_response.ok) {
            window.location.href = "/";
            return;
        }
        const error_payload = await network_response.json().catch(function() {
            return { error: "Unable to save workout." };
        });
        alert(`Validation failed: ${JSON.stringify(error_payload)}`);
    });

    if (exercise_request_form) {
        exercise_request_form.addEventListener("submit", async function(submission_event) {
            submission_event.preventDefault();
            await submit_exercise_request();
        });
    }
});