/**
 * Handles the initialisation and rendering of data visualisations
 * on the main dashboard view using Chart.js.
 */

document.addEventListener("DOMContentLoaded", function() {
    initialise_maximum_repetition_chart();
    initialise_workout_volume_chart();
});

function initialise_maximum_repetition_chart() {
    const canvas_element = document.getElementById("maximum_repetition_chart");
    if (!canvas_element) return;
    const mock_dates = ["2026-03-01", "2026-03-08", "2026-03-15"];
    const mock_weights = [100.0, 102.5, 105.0];

    new Chart(canvas_element, {
        type: "line",
        data: {
            labels: mock_dates,
            datasets: [{
                label: "Estimated 1RM (kg)",
                data: mock_weights,
                borderColor: "rgba(13, 110, 253, 1)",
                backgroundColor: "rgba(13, 110, 253, 0.2)",
                borderWidth: 2,
                tension: 0.1
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

function initialise_workout_volume_chart() {
    const canvas_element = document.getElementById("workout_volume_chart");
    if (!canvas_element) return;

    const mock_dates = ["2026-03-01", "2026-03-08", "2026-03-15"];
    const mock_volumes = [4500, 4800, 5100];

    new Chart(canvas_element, {
        type: "bar",
        data: {
            labels: mock_dates,
            datasets: [{
                label: "Total Volume (kg)",
                data: mock_volumes,
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