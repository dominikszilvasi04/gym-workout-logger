/**
 * Handles the initialisation and rendering of data visualisations
 * on the main dashboard view using Chart.js.
 */

const dashboardChartInstances = {};

document.addEventListener("DOMContentLoaded", async function() {
    attach_dashboard_filter_handlers();
    await load_dashboard_analytics();
});

function attach_dashboard_filter_handlers() {
    const rangeFilterElement = document.getElementById("dashboard_range_filter");
    const exerciseFilterElement = document.getElementById("dashboard_exercise_filter");

    if (rangeFilterElement) {
        rangeFilterElement.addEventListener("change", async function() {
            await load_dashboard_analytics();
        });
    }

    if (exerciseFilterElement) {
        exerciseFilterElement.addEventListener("change", async function() {
            await load_dashboard_analytics();
        });
    }
}

async function load_dashboard_analytics() {
    try {
        const rangeFilterElement = document.getElementById("dashboard_range_filter");
        const exerciseFilterElement = document.getElementById("dashboard_exercise_filter");
        const queryParameters = new URLSearchParams();

        if (rangeFilterElement && rangeFilterElement.value) {
            queryParameters.set("range_days", rangeFilterElement.value);
        }
        if (exerciseFilterElement && exerciseFilterElement.value) {
            queryParameters.set("exercise_name", exerciseFilterElement.value);
        }

        const requestUrl = queryParameters.toString()
            ? `/api/dashboard/analytics?${queryParameters.toString()}`
            : "/api/dashboard/analytics";

        const networkResponse = await fetch(requestUrl);
        if (!networkResponse.ok) {
            throw new Error(`Dashboard analytics request failed with status ${networkResponse.status}`);
        }

        const analyticsPayload = await networkResponse.json();
        populateExerciseFilterOptions(analyticsPayload.filters);
        populateSummaryCards(analyticsPayload.summary);
        renderPersonalRecords(analyticsPayload.leaderboards.personal_records);
        renderLineChart("maximum_repetition_chart", analyticsPayload.charts.one_rep_max_progression, {
            label: analyticsPayload.filters.selected_exercise
                ? `${analyticsPayload.filters.selected_exercise} Estimated 1RM (kg)`
                : "Estimated 1RM (kg)",
            borderColor: "rgba(13, 110, 253, 1)",
            backgroundColor: "rgba(13, 110, 253, 0.2)",
            beginAtZero: false,
            precision: null,
        });
        renderBarChart("workout_volume_chart", analyticsPayload.charts.workout_volume_progression, {
            label: "Total Volume (kg)",
            backgroundColor: "rgba(25, 135, 84, 0.6)",
            borderColor: "rgba(25, 135, 84, 1)",
        });
        renderLineChart("weekly_frequency_chart", analyticsPayload.charts.weekly_frequency, {
            label: "Workouts per Week",
            borderColor: "rgba(255, 193, 7, 1)",
            backgroundColor: "rgba(255, 193, 7, 0.2)",
            beginAtZero: true,
            precision: 0,
        });
        renderDoughnutChart("muscle_group_distribution_chart", analyticsPayload.charts.muscle_group_distribution);
        renderLineChart("average_rpe_chart", analyticsPayload.charts.average_rpe_progression, {
            label: "Average Workout RPE",
            borderColor: "rgba(220, 53, 69, 1)",
            backgroundColor: "rgba(220, 53, 69, 0.2)",
            beginAtZero: false,
            min: 0,
            max: 10,
            precision: 1,
        });
        renderBarChart("top_exercise_volume_chart", analyticsPayload.charts.top_exercise_volume, {
            label: "Exercise Volume (kg)",
            backgroundColor: "rgba(111, 66, 193, 0.6)",
            borderColor: "rgba(111, 66, 193, 1)",
            indexAxis: "y",
        });
    } catch (dashboardError) {
        console.error("Failed to initialise dashboard visualisations:", dashboardError);
        displayAllChartEmptyStates("Unable to load dashboard analytics right now.");
    }
}

function populateExerciseFilterOptions(filtersPayload) {
    const exerciseFilterElement = document.getElementById("dashboard_exercise_filter");
    if (!exerciseFilterElement || !filtersPayload) {
        return;
    }

    const selectedExercise = filtersPayload.selected_exercise || "";
    const availableExercises = filtersPayload.available_exercises || [];

    // Clear any existing options
    exerciseFilterElement.innerHTML = "";

    // Add default "All exercises" option
    const defaultOption = document.createElement("option");
    defaultOption.value = "";
    defaultOption.textContent = "All exercises";
    exerciseFilterElement.appendChild(defaultOption);

    // Add options for each available exercise using safe DOM APIs
    availableExercises.forEach(function(exerciseName) {
        const option = document.createElement("option");
        option.value = exerciseName;
        option.textContent = exerciseName;
        if (exerciseName === selectedExercise) {
            option.selected = true;
        }
        exerciseFilterElement.appendChild(option);
    });
}

function populateSummaryCards(summaryPayload) {
    updateSummaryCardText("dashboard_total_workouts", summaryPayload.total_workouts);
    updateSummaryCardText("dashboard_total_volume", `${formatNumber(summaryPayload.total_volume)} kg`);
    updateSummaryCardText("dashboard_average_workout_volume", `${formatNumber(summaryPayload.average_workout_volume)} kg`);
    updateSummaryCardText(
        "dashboard_best_estimated_one_rep_maximum",
        `${formatNumber(summaryPayload.strongest_estimated_one_rep_maximum)} kg`
    );
    updateSummaryCardText("dashboard_average_session_rpe", formatNumber(summaryPayload.average_session_rpe));
    updateSummaryCardText("dashboard_current_training_streak_weeks", `${summaryPayload.current_training_streak_weeks} wk`);
}

function updateSummaryCardText(elementIdentifier, value) {
    const element = document.getElementById(elementIdentifier);
    if (element) {
        element.textContent = value;
    }
}

function renderPersonalRecords(personalRecords) {
    const tableElement = document.getElementById("dashboard_personal_records_table");
    const tableBodyElement = document.getElementById("dashboard_personal_records_body");
    const emptyStateElement = document.getElementById("dashboard_personal_records_empty_state");
    if (!tableElement || !tableBodyElement || !emptyStateElement) {
        return;
    }

    if (!personalRecords.length) {
        tableElement.classList.add("d-none");
        emptyStateElement.classList.remove("d-none");
        tableBodyElement.innerHTML = "";
        return;
    }

    tableElement.classList.remove("d-none");
    emptyStateElement.classList.add("d-none");
    tableBodyElement.innerHTML = personalRecords.map(function(record) {
        return `
            <tr>
                <td>${escapeHtml(record.exercise_name)}</td>
                <td>${formatNumber(record.estimated_one_rep_maximum)} kg</td>
                <td>${escapeHtml(record.date)}</td>
            </tr>
        `;
    }).join("");
}

function formatNumber(value) {
    return Number(value || 0).toFixed(2);
}

function escapeHtml(value) {
    return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function escapeHtmlAttribute(value) {
    return escapeHtml(value);
}

function toggleChartEmptyState(canvasIdentifier, shouldShow, message = null) {
    const canvasElement = document.getElementById(canvasIdentifier);
    const emptyStateElement = document.getElementById(`${canvasIdentifier}_empty_state`);
    if (!canvasElement || !emptyStateElement) {
        return;
    }

    canvasElement.classList.toggle("d-none", shouldShow);
    emptyStateElement.classList.toggle("d-none", !shouldShow);
    if (message) {
        emptyStateElement.textContent = message;
    }
}

function displayAllChartEmptyStates(message) {
    [
        "maximum_repetition_chart",
        "workout_volume_chart",
        "weekly_frequency_chart",
        "muscle_group_distribution_chart",
        "average_rpe_chart",
        "top_exercise_volume_chart"
    ].forEach(function(chartIdentifier) {
        toggleChartEmptyState(chartIdentifier, true, message);
    });
}

function destroyExistingChart(chartIdentifier) {
    const existingChart = dashboardChartInstances[chartIdentifier];
    if (existingChart) {
        existingChart.destroy();
    }
}

function renderLineChart(chartIdentifier, chartSeries, chartOptions) {
    const canvasElement = document.getElementById(chartIdentifier);
    if (!canvasElement) return;
    destroyExistingChart(chartIdentifier);

    if (!chartSeries.labels.length) {
        toggleChartEmptyState(chartIdentifier, true);
        return;
    }

    toggleChartEmptyState(chartIdentifier, false);
    dashboardChartInstances[chartIdentifier] = new Chart(canvasElement, {
        type: "line",
        data: {
            labels: chartSeries.labels,
            datasets: [{
                label: chartOptions.label,
                data: chartSeries.values,
                borderColor: chartOptions.borderColor,
                backgroundColor: chartOptions.backgroundColor,
                borderWidth: 2,
                tension: 0.25,
                fill: true
            }]
        },
        options: {
            responsive: true,
            scales: {
                y: {
                    beginAtZero: chartOptions.beginAtZero,
                    min: chartOptions.min,
                    max: chartOptions.max,
                    ticks: chartOptions.precision === null ? {} : { precision: chartOptions.precision }
                }
            }
        }
    });
}

function renderBarChart(chartIdentifier, chartSeries, chartOptions) {
    const canvasElement = document.getElementById(chartIdentifier);
    if (!canvasElement) return;
    destroyExistingChart(chartIdentifier);

    if (!chartSeries.labels.length) {
        toggleChartEmptyState(chartIdentifier, true);
        return;
    }

    toggleChartEmptyState(chartIdentifier, false);
    dashboardChartInstances[chartIdentifier] = new Chart(canvasElement, {
        type: "bar",
        data: {
            labels: chartSeries.labels,
            datasets: [{
                label: chartOptions.label,
                data: chartSeries.values,
                backgroundColor: chartOptions.backgroundColor,
                borderColor: chartOptions.borderColor,
                borderWidth: 1
            }]
        },
        options: {
            responsive: true,
            indexAxis: chartOptions.indexAxis || "x",
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: {
                        precision: chartOptions.indexAxis === "y" ? 2 : 0
                    }
                }
            }
        }
    });
}

function renderDoughnutChart(chartIdentifier, chartSeries) {
    const canvasElement = document.getElementById(chartIdentifier);
    if (!canvasElement) return;
    destroyExistingChart(chartIdentifier);

    if (!chartSeries.labels.length) {
        toggleChartEmptyState(chartIdentifier, true);
        return;
    }

    toggleChartEmptyState(chartIdentifier, false);
    dashboardChartInstances[chartIdentifier] = new Chart(canvasElement, {
        type: "doughnut",
        data: {
            labels: chartSeries.labels,
            datasets: [{
                data: chartSeries.values,
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