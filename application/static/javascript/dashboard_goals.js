/**
 * Dashboard goals controller.
 */

document.addEventListener("DOMContentLoaded", function() {
    const create_goal_form = document.getElementById("create_goal_form");
    const goal_progress_list = document.getElementById("goal_progress_list");
    const goal_summary_text = document.getElementById("goal_summary_text");

    if (!create_goal_form || !goal_progress_list || !goal_summary_text) {
        return;
    }

    function get_csrf_token() {
        const csrf_meta_element = document.querySelector('meta[name="csrf-token"]');
        return csrf_meta_element ? csrf_meta_element.getAttribute("content") : "";
    }

    function show_toast(message, level = "info") {
        if (window.showAppToast) {
            window.showAppToast(message, level);
        }
    }

    function escape_html(value) {
        return String(value || "")
            .replaceAll("&", "&amp;")
            .replaceAll("<", "&lt;")
            .replaceAll(">", "&gt;")
            .replaceAll('"', "&quot;")
            .replaceAll("'", "&#39;");
    }

    function build_goal_item_markup(goal) {
        const progress_value = Math.max(0, Math.min(Number(goal.progress_percentage || 0), 100));
        const achievement_badge = goal.is_achieved
            ? '<span class="badge text-bg-success">Achieved</span>'
            : '<span class="badge text-bg-secondary">In progress</span>';
        const target_date_markup = goal.target_date
            ? `<div class="small text-muted">Target date: ${escape_html(goal.target_date)}</div>`
            : "";

        return `
            <div class="border rounded-3 p-3 bg-light-subtle">
                <div class="d-flex justify-content-between align-items-start mb-2 gap-2">
                    <div>
                        <div class="fw-semibold">${escape_html(goal.exercise_name)}</div>
                        <div class="small text-muted">Target: ${Number(goal.target_weight_in_kilograms).toFixed(2)} kg × ${goal.target_repetitions}</div>
                        <div class="small text-muted">Current best e1RM: ${Number(goal.current_best_estimated_one_rep_maximum || 0).toFixed(2)} kg</div>
                        ${target_date_markup}
                    </div>
                    <div class="d-flex align-items-center gap-2">
                        ${achievement_badge}
                        <button type="button" class="btn btn-sm btn-outline-danger delete-goal-button" data-goal-identifier="${escape_html(goal._id)}">Delete</button>
                    </div>
                </div>
                <div class="progress" role="progressbar" aria-label="Goal progress" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${progress_value}">
                    <div class="progress-bar ${goal.is_achieved ? "bg-success" : ""}" style="width: ${progress_value.toFixed(2)}%">${progress_value.toFixed(0)}%</div>
                </div>
            </div>
        `;
    }

    function render_goals(goals) {
        const safe_goals = Array.isArray(goals) ? goals : [];
        goal_summary_text.textContent = `${safe_goals.length} goal${safe_goals.length === 1 ? "" : "s"}`;
        if (!safe_goals.length) {
            goal_progress_list.innerHTML = '<div class="text-muted">No goals yet. Add one and start tracking progress.</div>';
            return;
        }
        goal_progress_list.innerHTML = safe_goals.map(build_goal_item_markup).join("");
    }

    async function load_goals() {
        try {
            const network_response = await fetch("/api/goals");
            const payload = await network_response.json();
            if (!network_response.ok) {
                throw new Error(payload.error || "Unable to load goals.");
            }
            render_goals(payload);
        } catch (error) {
            console.error("Failed to load goals:", error);
            goal_progress_list.innerHTML = '<div class="text-danger">Unable to load goals right now.</div>';
        }
    }

    async function create_goal(submission_event) {
        submission_event.preventDefault();

        const exercise_name = (document.getElementById("goal_exercise_name")?.value || "").trim();
        const target_weight = Number(document.getElementById("goal_target_weight")?.value || 0);
        const target_repetitions = Number(document.getElementById("goal_target_repetitions")?.value || 0);
        const target_date = (document.getElementById("goal_target_date")?.value || "").trim();

        if (!exercise_name || target_weight <= 0 || target_repetitions <= 0) {
            show_toast("Please complete all required goal fields.", "warning");
            return;
        }

        const request_payload = {
            exercise_name: exercise_name,
            target_weight_in_kilograms: target_weight,
            target_repetitions: target_repetitions,
        };
        if (target_date) {
            request_payload.target_date = target_date;
        }

        try {
            const network_response = await fetch("/api/goals", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "X-CSRF-Token": get_csrf_token(),
                },
                body: JSON.stringify(request_payload),
            });
            const payload = await network_response.json().catch(function() {
                return {};
            });
            if (!network_response.ok) {
                throw new Error(payload.error || "Unable to create goal.");
            }
            create_goal_form.reset();
            show_toast("Goal created.", "success");
            await load_goals();
        } catch (error) {
            console.error("Failed to create goal:", error);
            show_toast(error.message || "Unable to create goal.", "danger");
        }
    }

    async function delete_goal(goal_identifier) {
        const user_confirmed = await (window.showConfirmationModal
            ? window.showConfirmationModal({
                title: "Delete goal",
                message: "Delete this goal? This cannot be undone.",
                confirmLabel: "Delete",
                cancelLabel: "Keep",
                confirmClass: "btn-danger"
            })
            : Promise.resolve(confirm("Delete this goal? This cannot be undone."))
        );
        if (!user_confirmed) {
            return;
        }

        try {
            const network_response = await fetch(`/api/goals/${goal_identifier}`, {
                method: "DELETE",
                headers: {
                    "X-CSRF-Token": get_csrf_token(),
                },
            });
            const payload = await network_response.json().catch(function() {
                return {};
            });
            if (!network_response.ok) {
                throw new Error(payload.error || "Unable to delete goal.");
            }
            show_toast("Goal deleted.", "success");
            await load_goals();
        } catch (error) {
            console.error("Failed to delete goal:", error);
            show_toast(error.message || "Unable to delete goal.", "danger");
        }
    }

    create_goal_form.addEventListener("submit", create_goal);

    goal_progress_list.addEventListener("click", function(click_event) {
        const delete_button = click_event.target.closest(".delete-goal-button");
        if (!delete_button) {
            return;
        }
        const goal_identifier = delete_button.getAttribute("data-goal-identifier");
        if (!goal_identifier) {
            return;
        }
        delete_goal(goal_identifier);
    });

    load_goals();
});
