/**
 * Dashboard workout history filtering and pagination controller.
 */

document.addEventListener("DOMContentLoaded", function() {
    const history_table_body = document.getElementById("dashboard_workout_history_body");
    const apply_filters_button = document.getElementById("apply_history_filters_button");
    const reset_filters_button = document.getElementById("reset_history_filters_button");
    const previous_page_button = document.getElementById("history_previous_page_button");
    const next_page_button = document.getElementById("history_next_page_button");
    const pagination_status_element = document.getElementById("history_pagination_status");
    const results_summary_element = document.getElementById("history_results_summary");
    const page_size_element = document.getElementById("history_page_size");

    const start_date_element = document.getElementById("history_start_date");
    const end_date_element = document.getElementById("history_end_date");
    const exercise_filter_element = document.getElementById("history_exercise_filter");
    const muscle_filter_element = document.getElementById("history_muscle_filter");
    const session_tag_filter_element = document.getElementById("history_session_tag_filter");

    if (!history_table_body || !apply_filters_button || !reset_filters_button || !previous_page_button || !next_page_button) {
        return;
    }

    const history_state = {
        current_page: 1,
        total_pages: 0,
        total_items: 0,
        page_limit: Number(page_size_element?.value || 20),
    };

    function format_workout_date(date_value) {
        const parsed_date = new Date(date_value);
        if (Number.isNaN(parsed_date.getTime())) {
            return String(date_value || "");
        }
        return parsed_date.toLocaleString(undefined, {
            year: "numeric",
            month: "2-digit",
            day: "2-digit",
            hour: "2-digit",
            minute: "2-digit",
        });
    }

    function escape_html(value) {
        return String(value || "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#39;");
    }

    function build_query_string() {
        const query_parameters = new URLSearchParams();
        query_parameters.set("page", String(history_state.current_page));
        query_parameters.set("limit", String(history_state.page_limit));

        const start_date = (start_date_element?.value || "").trim();
        const end_date = (end_date_element?.value || "").trim();
        const exercise_name = (exercise_filter_element?.value || "").trim();
        const target_muscle_group = (muscle_filter_element?.value || "").trim();
        const session_tag = (session_tag_filter_element?.value || "").trim();

        if (start_date) query_parameters.set("start_date", start_date);
        if (end_date) query_parameters.set("end_date", end_date);
        if (exercise_name) query_parameters.set("exercise_name", exercise_name);
        if (target_muscle_group) query_parameters.set("target_muscle_group", target_muscle_group);
        if (session_tag) query_parameters.set("session_tag", session_tag);

        return query_parameters.toString();
    }

    function render_history_rows(workouts) {
        if (!Array.isArray(workouts) || workouts.length === 0) {
            history_table_body.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center text-muted">No workouts match these filters yet.</td>
                </tr>
            `;
            return;
        }

        history_table_body.innerHTML = workouts.map(function(workout) {
            const workout_identifier = escape_html(workout._id);
            const workout_date = format_workout_date(workout.date_of_workout);
            const target_muscles = Array.isArray(workout.target_muscle_groups)
                ? workout.target_muscle_groups.map(function(muscle_group) { return escape_html(muscle_group); }).join(", ")
                : "";
            const total_exercises = Array.isArray(workout.exercises) ? workout.exercises.length : 0;

            return `
                <tr>
                    <td>
                        <a href="/workouts/${workout_identifier}" class="text-decoration-none fw-semibold">${escape_html(workout_date)}</a>
                    </td>
                    <td>${target_muscles}</td>
                    <td>${total_exercises}</td>
                    <td class="text-center">
                        <a href="/workouts/${workout_identifier}" class="btn btn-sm btn-outline-secondary">View</a>
                        <a href="/edit/${workout_identifier}" class="btn btn-sm btn-outline-primary">Edit</a>
                        <button class="btn btn-sm btn-outline-danger delete-workout-button" data-workout-identifier="${workout_identifier}">Delete</button>
                    </td>
                </tr>
            `;
        }).join("");
    }

    function render_pagination_state() {
        const safe_page = history_state.total_pages === 0 ? 0 : history_state.current_page;
        if (pagination_status_element) {
            pagination_status_element.textContent = `Page ${safe_page} of ${history_state.total_pages}`;
        }

        const first_item_index = history_state.total_items === 0
            ? 0
            : ((history_state.current_page - 1) * history_state.page_limit) + 1;
        const last_item_index = Math.min(history_state.current_page * history_state.page_limit, history_state.total_items);

        if (results_summary_element) {
            results_summary_element.textContent = `Showing ${first_item_index}-${last_item_index} of ${history_state.total_items} workouts`;
        }

        previous_page_button.disabled = history_state.current_page <= 1;
        next_page_button.disabled = history_state.total_pages === 0 || history_state.current_page >= history_state.total_pages;
    }

    async function load_workout_history() {
        try {
            const query_string = build_query_string();
            const network_response = await fetch(`/api/workouts?${query_string}`);
            const payload = await network_response.json();

            if (!network_response.ok) {
                throw new Error(payload.error || "Unable to load workout history.");
            }

            history_state.total_items = Number(payload.total || 0);
            history_state.total_pages = Number(payload.total_pages || 0);
            history_state.current_page = Number(payload.page || history_state.current_page);
            history_state.page_limit = Number(payload.limit || history_state.page_limit);

            render_history_rows(payload.workouts || []);
            render_pagination_state();
        } catch (error) {
            console.error("Failed to load workout history:", error);
            history_table_body.innerHTML = `
                <tr>
                    <td colspan="4" class="text-center text-danger">Unable to load workout history right now.</td>
                </tr>
            `;
            history_state.total_items = 0;
            history_state.total_pages = 0;
            render_pagination_state();
        }
    }

    function apply_filters() {
        history_state.current_page = 1;
        history_state.page_limit = Number(page_size_element?.value || 20);
        load_workout_history();
    }

    apply_filters_button.addEventListener("click", function() {
        apply_filters();
    });

    reset_filters_button.addEventListener("click", function() {
        if (start_date_element) start_date_element.value = "";
        if (end_date_element) end_date_element.value = "";
        if (exercise_filter_element) exercise_filter_element.value = "";
        if (muscle_filter_element) muscle_filter_element.value = "";
        if (session_tag_filter_element) session_tag_filter_element.value = "";
        if (page_size_element) page_size_element.value = "20";
        apply_filters();
    });

    previous_page_button.addEventListener("click", function() {
        if (history_state.current_page <= 1) {
            return;
        }
        history_state.current_page -= 1;
        load_workout_history();
    });

    next_page_button.addEventListener("click", function() {
        if (history_state.current_page >= history_state.total_pages) {
            return;
        }
        history_state.current_page += 1;
        load_workout_history();
    });

    if (page_size_element) {
        page_size_element.addEventListener("change", function() {
            apply_filters();
        });
    }

    [start_date_element, end_date_element, exercise_filter_element, muscle_filter_element, session_tag_filter_element].forEach(function(filter_element) {
        if (!filter_element) {
            return;
        }
        filter_element.addEventListener("keydown", function(keyboard_event) {
            if (keyboard_event.key === "Enter") {
                keyboard_event.preventDefault();
                apply_filters();
            }
        });
    });

    load_workout_history();
});
