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
    const calculate_plates_button = document.getElementById("calculate_plates_button");
    const plate_target_weight_input = document.getElementById("plate_target_weight");
    const plate_bar_weight_input = document.getElementById("plate_bar_weight");
    const plate_calculator_result = document.getElementById("plate_calculator_result");
    const rest_duration_seconds_input = document.getElementById("rest_duration_seconds");
    const start_rest_timer_button = document.getElementById("start_rest_timer_button");
    const rest_timer_status = document.getElementById("rest_timer_status");
    const rest_timer_countdown = document.getElementById("rest_timer_countdown");
    const workout_template_selector = document.getElementById("workout_template_selector");
    const load_template_button = document.getElementById("load_template_button");
    const rename_template_button = document.getElementById("rename_template_button");
    const save_template_button = document.getElementById("save_template_button");
    const delete_template_button = document.getElementById("delete_template_button");
    const new_template_name_input = document.getElementById("new_template_name");
    const workout_template_feedback = document.getElementById("workout_template_feedback");
    const save_as_template_after_submit_checkbox = document.getElementById("save_as_template_after_submit_checkbox");
    const should_prefill_from_last = workout_logging_form && workout_logging_form.dataset.prefillFromLast === "true";
    let master_exercise_list = [];
    let last_used_values_map = {};
    let workout_templates = [];
    let rest_timer_interval_identifier = null;
    let rest_remaining_seconds = 0;

    function get_toast_container() {
        const existing_toast_container = document.getElementById("app_toast_container");
        if (existing_toast_container) {
            return existing_toast_container;
        }
        const toast_container = document.createElement("div");
        toast_container.id = "app_toast_container";
        toast_container.className = "toast-container position-fixed top-0 end-0 p-3";
        toast_container.style.zIndex = "1200";
        document.body.appendChild(toast_container);
        return toast_container;
    }

    function show_toast(message, status = "info") {
        if (!message) {
            return;
        }
        if (window.showAppToast) {
            window.showAppToast(message, status);
            return;
        }
        const status_class_name_map = {
            success: "text-bg-success",
            danger: "text-bg-danger",
            warning: "text-bg-warning",
            info: "text-bg-primary",
        };
        const toast_container = get_toast_container();
        const toast_element = document.createElement("div");
        toast_element.className = `toast align-items-center border-0 ${status_class_name_map[status] || status_class_name_map.info}`;
        toast_element.role = "alert";
        toast_element.ariaLive = "assertive";
        toast_element.ariaAtomic = "true";
        toast_element.innerHTML = `
            <div class="d-flex">
                <div class="toast-body">${message}</div>
                <button type="button" class="btn-close btn-close-white me-2 m-auto" data-bs-dismiss="toast" aria-label="Close"></button>
            </div>
        `;
        toast_container.appendChild(toast_element);
        if (window.bootstrap && window.bootstrap.Toast) {
            const toast_instance = new window.bootstrap.Toast(toast_element, { delay: 3500 });
            toast_instance.show();
            toast_element.addEventListener("hidden.bs.toast", function() {
                toast_element.remove();
            }, { once: true });
            return;
        }
        setTimeout(function() {
            toast_element.remove();
        }, 3500);
    }

    function get_csrf_token() {
        const csrf_meta_element = document.querySelector('meta[name="csrf-token"]');
        return csrf_meta_element ? csrf_meta_element.getAttribute("content") : "";
    }

    function format_countdown(total_seconds) {
        const safe_seconds = Math.max(0, Number(total_seconds) || 0);
        const minutes = String(Math.floor(safe_seconds / 60)).padStart(2, "0");
        const seconds = String(safe_seconds % 60).padStart(2, "0");
        return `${minutes}:${seconds}`;
    }

    function render_rest_timer() {
        if (!rest_timer_countdown) {
            return;
        }
        rest_timer_countdown.textContent = format_countdown(rest_remaining_seconds);
    }

    function stop_rest_timer() {
        if (rest_timer_interval_identifier !== null) {
            clearInterval(rest_timer_interval_identifier);
            rest_timer_interval_identifier = null;
        }
    }

    function notify_rest_timer_finished() {
        if (navigator.vibrate) {
            navigator.vibrate([200, 100, 200]);
        }
        if ("Notification" in window && Notification.permission === "granted") {
            new Notification("Rest complete", { body: "Time for your next set." });
        }
    }

    function start_rest_timer() {
        const configured_seconds = parseInt(rest_duration_seconds_input?.value || "120", 10);
        rest_remaining_seconds = Number.isNaN(configured_seconds) ? 120 : Math.max(10, configured_seconds);
        render_rest_timer();
        if (rest_timer_status) {
            rest_timer_status.textContent = "Rest timer running";
        }
        stop_rest_timer();
        rest_timer_interval_identifier = window.setInterval(function() {
            rest_remaining_seconds -= 1;
            render_rest_timer();
            if (rest_remaining_seconds > 0) {
                return;
            }
            stop_rest_timer();
            if (rest_timer_status) {
                rest_timer_status.textContent = "Rest complete";
            }
            notify_rest_timer_finished();
        }, 1000);
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

    function get_query_parameter(parameter_name) {
        const current_url = new URL(window.location.href);
        return current_url.searchParams.get(parameter_name);
    }

    function set_template_feedback(message, status = "muted") {
        if (!workout_template_feedback) {
            return;
        }
        const class_name_by_status = {
            success: "small text-success",
            danger: "small text-danger",
            muted: "small text-muted",
        };
        workout_template_feedback.className = class_name_by_status[status] || class_name_by_status.muted;
        workout_template_feedback.textContent = message;
    }

    function create_set_row_markup(set_data = null) {
        const default_weight = set_data && typeof set_data.weight_in_kilograms !== "undefined"
            ? String(set_data.weight_in_kilograms)
            : "";
        const default_repetitions = set_data && typeof set_data.repetitions !== "undefined"
            ? String(set_data.repetitions)
            : "";
        const default_rpe = set_data && typeof set_data.rate_of_perceived_exertion !== "undefined"
            ? String(set_data.rate_of_perceived_exertion)
            : "";
        return `
            <div class="row g-2 set-row">
                <div class="col-md-4"><input type="number" class="form-control weight-input" placeholder="Weight (kg)" value="${default_weight}" step="0.5" min="0" required></div>
                <div class="col-md-4"><input type="number" class="form-control repetitions-input" placeholder="Repetitions" value="${default_repetitions}" min="1" required></div>
                <div class="col-md-4"><input type="number" class="form-control exertion-input" placeholder="RPE (1-10)" value="${default_rpe}" min="1" max="10" required></div>
            </div>
        `;
    }

    function create_exercise_block_markup(exercise_data = null) {
        const selected_exercise_name = exercise_data?.exercise_name || "";
        const selected_identifier = exercise_data?.exercise_definition_identifier || "";
        const sets = Array.isArray(exercise_data?.sets) && exercise_data.sets.length > 0
            ? exercise_data.sets
            : [null];
        return `
            <div class="exercise-block border rounded-3 p-3 bg-body-tertiary">
                <div class="row g-2 align-items-end mb-3">
                    <div class="col-lg-8 position-relative">
                        <label class="form-label">Exercise Search</label>
                        <input type="text" class="form-control exercise-search-input" placeholder="Start typing an exercise name" value="${selected_exercise_name}" autocomplete="off" required>
                        <input type="hidden" class="exercise-identifier-input" value="${selected_identifier}" required>
                        <div class="exercise-suggestions list-group position-absolute w-100 d-none" style="z-index: 1050;"></div>
                    </div>
                    <div class="col-lg-4 d-flex gap-2">
                        <button type="button" class="btn btn-outline-secondary flex-fill add-set-button">Add Set</button>
                        <button type="button" class="btn btn-outline-danger remove-exercise-button">Remove</button>
                    </div>
                </div>
                <div class="sets-container d-grid gap-2">${sets.map(function(set_data) { return create_set_row_markup(set_data); }).join("")}</div>
            </div>
        `;
    }

    function append_new_exercise_block(exercise_data = null) {
        exercises_container.insertAdjacentHTML("beforeend", create_exercise_block_markup(exercise_data));
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
        const last_used_values = last_used_values_map[exercise_identifier];
        if (last_used_values) {
            const first_set_row = exercise_block.querySelector(".set-row");
            if (first_set_row) {
                first_set_row.querySelector(".weight-input").value = String(last_used_values.weight_in_kilograms);
                first_set_row.querySelector(".repetitions-input").value = String(last_used_values.repetitions);
                first_set_row.querySelector(".exertion-input").value = String(last_used_values.rate_of_perceived_exertion);
            }
        }
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

    async function load_last_used_values() {
        const network_response = await fetch("/api/workouts/last-used-values");
        if (!network_response.ok) {
            return;
        }
        const payload = await network_response.json();
        last_used_values_map = payload.last_used_values || {};
    }

    function render_workout_templates_selector() {
        if (!workout_template_selector) {
            return;
        }
        const selector_options = ["<option value=\"\">Select a template</option>"];
        workout_templates.forEach(function(template) {
            selector_options.push(`<option value="${template._id}">${template.template_name}</option>`);
        });
        workout_template_selector.innerHTML = selector_options.join("");
    }

    async function load_workout_templates() {
        if (!workout_template_selector) {
            return;
        }
        const network_response = await fetch("/api/workout-templates");
        if (!network_response.ok) {
            set_template_feedback("Unable to load templates right now.", "danger");
            return;
        }
        workout_templates = await network_response.json();
        render_workout_templates_selector();
    }

    function find_exercise_by_identifier(exercise_identifier) {
        return master_exercise_list.find(function(exercise_definition) {
            return exercise_definition._id === exercise_identifier;
        });
    }

    function populate_form_from_previous_workout(previous_workout) {
        const target_muscle_groups_input = document.getElementById("target_muscle_groups");
        if (target_muscle_groups_input) {
            target_muscle_groups_input.value = (previous_workout.target_muscle_groups || []).join(", ");
        }
        exercises_container.innerHTML = "";
        (previous_workout.exercises || []).forEach(function(previous_exercise) {
            const exercise_definition = find_exercise_by_identifier(previous_exercise.exercise_definition_identifier);
            append_new_exercise_block({
                exercise_name: exercise_definition?.exercise_name || previous_exercise.exercise_name || "",
                exercise_definition_identifier: previous_exercise.exercise_definition_identifier || "",
                sets: previous_exercise.sets || [],
            });
        });
        if (!exercises_container.querySelector(".exercise-block")) {
            append_new_exercise_block();
        }
    }

    async function load_selected_template(template_identifier) {
        if (!template_identifier) {
            set_template_feedback("Please choose a template first.", "danger");
            return false;
        }
        const network_response = await fetch(`/api/workout-templates/${template_identifier}`);
        if (!network_response.ok) {
            set_template_feedback("Template could not be loaded.", "danger");
            return false;
        }
        const template_payload = await network_response.json();
        populate_form_from_previous_workout(template_payload);
        set_template_feedback(`Loaded template: ${template_payload.template_name}`, "success");
        return true;
    }

    async function prefill_from_last_workout_if_requested() {
        if (!should_prefill_from_last) {
            return false;
        }
        const network_response = await fetch("/api/workouts/last");
        if (!network_response.ok) {
            show_toast("No previous workout found to repeat yet.", "warning");
            return false;
        }
        const previous_workout = await network_response.json();
        populate_form_from_previous_workout(previous_workout);
        return true;
    }

    async function prefill_from_template_query_if_requested() {
        const template_identifier = get_query_parameter("template_id");
        if (!template_identifier) {
            return false;
        }
        if (workout_template_selector) {
            workout_template_selector.value = template_identifier;
        }
        return load_selected_template(template_identifier);
    }

    function calculate_plate_distribution(target_weight, bar_weight) {
        const available_plate_sizes = [25, 20, 15, 10, 5, 2.5, 1.25];
        if (target_weight < bar_weight) {
            return { error: "Target weight must be greater than or equal to bar weight." };
        }
        const total_plate_weight = target_weight - bar_weight;
        const per_side_target = total_plate_weight / 2;
        if (per_side_target < 0 || Math.abs((per_side_target * 100) % 25) !== 0) {
            return { error: "Target cannot be built exactly with standard 1.25kg increments." };
        }
        let remaining = per_side_target;
        const distribution = [];
        available_plate_sizes.forEach(function(plate_size) {
            const count = Math.floor(remaining / plate_size);
            if (count > 0) {
                distribution.push({ plate_size: plate_size, count_per_side: count });
                remaining = Number((remaining - (count * plate_size)).toFixed(4));
            }
        });
        if (remaining > 0) {
            return { error: "Target cannot be built exactly with selected plate sizes." };
        }
        return { distribution: distribution };
    }

    function render_plate_distribution() {
        const target_weight = parseFloat(plate_target_weight_input?.value || "0");
        const bar_weight = parseFloat(plate_bar_weight_input?.value || "20");
        if (Number.isNaN(target_weight) || Number.isNaN(bar_weight)) {
            plate_calculator_result.textContent = "Enter valid numeric values for target and bar weight.";
            plate_calculator_result.className = "small text-danger";
            return;
        }
        const calculation_result = calculate_plate_distribution(target_weight, bar_weight);
        if (calculation_result.error) {
            plate_calculator_result.textContent = calculation_result.error;
            plate_calculator_result.className = "small text-danger";
            return;
        }
        if (!calculation_result.distribution.length) {
            plate_calculator_result.textContent = "No plates needed. Target equals bar weight.";
            plate_calculator_result.className = "small text-muted";
            return;
        }
        plate_calculator_result.textContent = calculation_result.distribution
            .map(function(item) {
                return `${item.count_per_side} x ${item.plate_size}kg per side`;
            })
            .join(" • ");
        plate_calculator_result.className = "small text-success";
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

    function build_template_payload() {
        const workout_payload = build_workout_payload();
        return {
            template_name: (new_template_name_input?.value || "").trim(),
            target_muscle_groups: workout_payload.target_muscle_groups,
            exercises: workout_payload.exercises,
        };
    }

    function build_template_payload_from_workout_payload(template_name, workout_payload) {
        return {
            template_name: template_name.trim(),
            target_muscle_groups: workout_payload.target_muscle_groups,
            exercises: workout_payload.exercises,
        };
    }

    async function save_template_payload(template_payload) {
        const network_response = await fetch("/api/workout-templates", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "X-CSRF-Token": get_csrf_token(),
            },
            body: JSON.stringify(template_payload),
        });
        if (!network_response.ok) {
            const error_payload = await network_response.json().catch(function() {
                return { error: "Unable to save template." };
            });
            return { success: false, error: error_payload.error || "Unable to save template." };
        }
        return { success: true };
    }

    function validate_selected_exercises() {
        const invalid_exercise_block = Array.from(exercises_container.querySelectorAll(".exercise-block")).find(function(exercise_block) {
            const identifier_input = exercise_block.querySelector(".exercise-identifier-input");
            return !identifier_input.value;
        });
        return !invalid_exercise_block;
    }

    initialise_default_date();
    render_rest_timer();
    try {
        await load_standardised_exercises();
        await load_last_used_values();
        await load_workout_templates();
    } catch (network_error) {
        console.error("Failed to load standardised exercises:", network_error);
        show_toast("Unable to load exercises right now. Please refresh and try again.", "danger");
    }

    let prefill_applied = await prefill_from_template_query_if_requested();
    if (!prefill_applied) {
        prefill_applied = await prefill_from_last_workout_if_requested();
    }
    if (!prefill_applied) {
        append_new_exercise_block();
    }

    if ("Notification" in window && Notification.permission === "default") {
        Notification.requestPermission().catch(function() {
            return null;
        });
    }

    add_exercise_button.addEventListener("click", function() {
        append_new_exercise_block();
    });

    if (calculate_plates_button) {
        calculate_plates_button.addEventListener("click", function() {
            render_plate_distribution();
        });
    }

    if (start_rest_timer_button) {
        start_rest_timer_button.addEventListener("click", function() {
            start_rest_timer();
        });
    }

    if (load_template_button) {
        load_template_button.addEventListener("click", async function() {
            await load_selected_template(workout_template_selector?.value || "");
        });
    }

    if (save_template_button) {
        save_template_button.addEventListener("click", async function() {
            const template_payload = build_template_payload();
            if (!template_payload.template_name) {
                set_template_feedback("Enter a template name before saving.", "danger");
                return;
            }
            if (!template_payload.exercises.length) {
                set_template_feedback("Add at least one exercise before saving a template.", "danger");
                return;
            }
            const save_result = await save_template_payload(template_payload);
            if (!save_result.success) {
                set_template_feedback(save_result.error, "danger");
                return;
            }
            set_template_feedback("Template saved.", "success");
            if (new_template_name_input) {
                new_template_name_input.value = "";
            }
            await load_workout_templates();
        });
    }

    if (rename_template_button) {
        rename_template_button.addEventListener("click", async function() {
            const template_identifier = workout_template_selector?.value || "";
            if (!template_identifier) {
                set_template_feedback("Select a template to rename.", "danger");
                return;
            }
            const selected_template = workout_templates.find(function(template) {
                return template._id === template_identifier;
            });
            const current_name = selected_template?.template_name || "";
            const updated_template_name = (new_template_name_input?.value || "").trim();
            if (!updated_template_name) {
                set_template_feedback(`Enter a new template name in the input field (current: ${current_name || "unnamed"}).`, "danger");
                show_toast("Enter a new template name in the template name input before renaming.", "warning");
                return;
            }
            const template_payload = {
                template_name: updated_template_name,
                target_muscle_groups: selected_template?.target_muscle_groups || [],
                exercises: selected_template?.exercises || [],
            };
            const network_response = await fetch(`/api/workout-templates/${template_identifier}`, {
                method: "PUT",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRF-Token": get_csrf_token(),
                },
                body: JSON.stringify(template_payload),
            });
            if (!network_response.ok) {
                const error_payload = await network_response.json().catch(function() {
                    return { error: "Unable to rename template." };
                });
                set_template_feedback(error_payload.error || "Unable to rename template.", "danger");
                show_toast(error_payload.error || "Unable to rename template.", "danger");
                return;
            }
            set_template_feedback("Template updated.", "success");
            show_toast("Template renamed successfully.", "success");
            await load_workout_templates();
            if (workout_template_selector) {
                workout_template_selector.value = template_identifier;
            }
            if (new_template_name_input) {
                new_template_name_input.value = "";
            }
        });
    }

    if (delete_template_button) {
        delete_template_button.addEventListener("click", async function() {
            const template_identifier = workout_template_selector?.value || "";
            if (!template_identifier) {
                set_template_feedback("Select a template to delete.", "danger");
                return;
            }
            const user_confirmed = await (window.showConfirmationModal
                ? window.showConfirmationModal({
                    title: "Delete template",
                    message: "Delete this template? This cannot be undone.",
                    confirmLabel: "Delete",
                    cancelLabel: "Keep",
                    confirmClass: "btn-danger"
                })
                : Promise.resolve(confirm("Delete this template? This cannot be undone."))
            );
            if (!user_confirmed) {
                return;
            }
            const network_response = await fetch(`/api/workout-templates/${template_identifier}`, {
                method: "DELETE",
                headers: {
                    "X-CSRF-Token": get_csrf_token(),
                },
            });
            if (!network_response.ok) {
                set_template_feedback("Unable to delete template.", "danger");
                return;
            }
            set_template_feedback("Template deleted.", "success");
            await load_workout_templates();
        });
    }

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
            start_rest_timer();
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
            show_toast("Please select each exercise from the search suggestions before saving.", "warning");
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
            if (save_as_template_after_submit_checkbox && save_as_template_after_submit_checkbox.checked) {
                const suggested_template_name = `${(workout_payload.target_muscle_groups || []).join("/") || "Workout"} Template`;
                const template_name = (new_template_name_input?.value || suggested_template_name).trim();
                if (template_name) {
                    const template_payload = build_template_payload_from_workout_payload(template_name, workout_payload);
                    const save_result = await save_template_payload(template_payload);
                    if (!save_result.success) {
                        show_toast(`Workout saved, but template save failed: ${save_result.error}`, "warning");
                    } else {
                        show_toast("Workout saved and template created.", "success");
                    }
                }
            }
            window.location.href = "/";
            return;
        }
        const error_payload = await network_response.json().catch(function() {
            return { error: "Unable to save workout." };
        });
        show_toast(error_payload.error || "Unable to save workout.", "danger");
    });

    if (exercise_request_form) {
        exercise_request_form.addEventListener("submit", async function(submission_event) {
            submission_event.preventDefault();
            await submit_exercise_request();
        });
    }
});