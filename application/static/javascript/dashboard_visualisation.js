/**
 * Handles the initialisation and rendering of data visualisations
 * on the main dashboard view using Chart.js.
 */

document.addEventListener("DOMContentLoaded", async function() {
    await initialise_dashboard_visualisations();
});

async function initialise_dashboard_visualisations() {
    try {
        const network_response = await fetch("/api/dashboard/analytics");
        if (!network_response.ok) {
            throw new Error(`Dashboard analytics request failed with status ${network_response.status}`);
        }

        const analytics_payload = await network_response.json();
        populate_summary_cards(analytics_payload.summary);
        initialise_maximum_repetition_chart(analytics_payload.charts.one_rep_max_progression);
        initialise_workout_volume_chart(analytics_payload.charts.workout_volume_progression);
        initialise_weekly_frequency_chart(analytics_payload.charts.weekly_frequency);
        initialise_muscle_group_distribution_chart(analytics_payload.charts.muscle_group_distribution);
    } catch (dashboard_error) {
        console.error("Failed to initialise dashboard visualisations:", dashboard_error);
        display_all_chart_empty_states("Unable to load dashboard analytics right now.");
    }
}

function populate_summary_cards(summary_payload) {
    update_summary_card_text("dashboard_total_workouts", summary_payload.total_workouts);
    update_summary_card_text("dashboard_total_volume", `${formatNumber(summary_payload.total_volume)} kg`);
    update_summary_card_text("dashboard_average_workout_volume", `${formatNumber(summary_payload.average_workout_volume)} kg`);
    update_summary_card_text(
        "dashboard_best_estimated_one_rep_maximum",
        `${formatNumber(summary_payload.strongest_estimated_one_rep_maximum)} kg`
    );
}

function update_summary_card_text(element_identifier, value) {
    const element = document.getElementById(element_identifier);
    if (element) {
        element.textContent = value;
    }
}

function formatNumber(value) {
    return Number(value || 0).toFixed(2);
}

function toggle_chart_empty_state(canvas_identifier, should_show, message = null) {
    const canvas_element = document.getElementById(canvas_identifier);
    const empty_state_element = document.getElementById(`${canvas_identifier}_empty_state`);
    if (!canvas_element || !empty_state_element) {
        return;
    }

    canvas_element.classList.toggle("d-none", should_show);
    empty_state_element.classList.toggle("d-none", !should_show);
    if (message) {
        empty_state_element.textContent = message;
    }
}

function display_all_chart_empty_states(message) {
    [
        "maximum_repetition_chart",
        "workout_volume_chart",
        "weekly_frequency_chart",
        "muscle_group_distribution_chart"
    ].forEach(function(chart_identifier) {
        toggle_chart_empty_state(chart_identifier, true, message);
    });
}

function initialise_maximum_repetition_chart(chart_series) {
    const canvas_element = document.getElementById("maximum_repetition_chart");
    if (!canvas_element) return;
    if (!chart_series.labels.length) {
        toggle_chart_empty_state("maximum_repetition_chart", true);
        return;
    }

    toggle_chart_empty_state("maximum_repetition_chart", false);
    new Chart(canvas_element, {
        type: "line",
        data: {
            labels: chart_series.labels,
            datasets: [{
                label: "Estimated 1RM (kg)",
                data: chart_series.values,
                borderColor: "rgba(13, 110, 253, 1)",
                backgroundColor: "rgba(13, 110, 253, 0.2)",
                borderWidth: 2,
                tension: 0.25,
                fill: true
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: false
                }
            }
        }
    });
}

function initialise_workout_volume_chart(chart_series) {
    const canvas_element = document.getElementById("workout_volume_chart");
    if (!canvas_element) return;

    if (!chart_series.labels.length) {
        toggle_chart_empty_state("workout_volume_chart", true);
        return;
    }

    toggle_chart_empty_state("workout_volume_chart", false);

    new Chart(canvas_element, {
        type: "bar",
        data: {
            labels: chart_series.labels,
            datasets: [{
                label: "Total Volume (kg)",
                data: chart_series.values,
                backgroundColor: "rgba(25, 135, 84, 0.6)",
                borderColor: "rgba(25, 135, 84, 1)",
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true
                }
            }
        }
    });
}

function initialise_weekly_frequency_chart(chart_series) {
    const canvas_element = document.getElementById("weekly_frequency_chart");
    if (!canvas_element) return;

    if (!chart_series.labels.length) {
        toggle_chart_empty_state("weekly_frequency_chart", true);
        return;
    }

    toggle_chart_empty_state("weekly_frequency_chart", false);

    new Chart(canvas_element, {
        type: "line",
        data: {
            labels: chart_series.labels,
            datasets: [{
                label: "Workouts per Week",
                data: chart_series.values,
                borderColor: "rgba(255, 193, 7, 1)",
                backgroundColor: "rgba(255, 193, 7, 0.2)",
                borderWidth: 2,
                tension: 0.2,
                fill: true
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: 0
                    }
                }
            }
        }
    });
}

function initialise_muscle_group_distribution_chart(chart_series) {
    const canvas_element = document.getElementById("muscle_group_distribution_chart");
    if (!canvas_element) return;

    if (!chart_series.labels.length) {
        toggle_chart_empty_state("muscle_group_distribution_chart", true);
        return;
    }

    toggle_chart_empty_state("muscle_group_distribution_chart", false);

    new Chart(canvas_element, {
        type: "doughnut",
        data: {
            labels: chart_series.labels,
            datasets: [{
                data: chart_series.values,
                backgroundColor: [
                    "rgba(13, 110, 253, 0.8)",
                    "rgba(25, 135, 84, 0.8)",
                    "rgba(255, 193, 7, 0.8)",
                    "rgba(220, 53, 69, 0.8)",
                    "rgba(111, 66, 193, 0.8)",
                    "rgba(32, 201, 151, 0.8)",
                    "rgba(13, 202, 240, 0.8)"
                ],
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    position: "bottom"
                }
            }
        }
    });
}