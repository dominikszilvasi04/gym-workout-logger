"""
Unit tests for the pure business logic contained within the WorkoutService.
"""

from datetime import datetime, timezone
from unittest.mock import Mock
from application.services.workout_service import WorkoutService
from application.repositories.workout_repository import WorkoutRepository
from application.models.workout import ExerciseLog, WorkoutDocument, WorkoutSet


def test_calculate_estimated_one_repetition_maximum() -> None:
    """
    Tests the mathematical accuracy of the Epley formula implementation.
    """
    # We provide a dummy repository because these calculations do not use the database
    dummy_repository = WorkoutRepository()
    workout_service = WorkoutService(workout_repository=dummy_repository)

    # Mathematical check: 100 kg lifted 5 times
    # Formula: 100 * (1 + (5 / 30)) = 116.666...
    calculated_maximum = workout_service.calculate_estimated_one_repetition_maximum(
        weight_in_kilograms=100.0, repetitions=5
    )

    assert calculated_maximum == 116.67


def test_calculate_exercise_volume() -> None:
    """
    Tests that total volume is correctly aggregated across multiple sets.
    """
    dummy_repository = WorkoutRepository()
    workout_service = WorkoutService(workout_repository=dummy_repository)

    mock_set_one = WorkoutSet(
        repetitions=10, weight_in_kilograms=50.0, rate_of_perceived_exertion=7
    )
    mock_set_two = WorkoutSet(repetitions=8, weight_in_kilograms=55.0, rate_of_perceived_exertion=8)
    mock_exercise = ExerciseLog(exercise_name="Bench Press", sets=[mock_set_one, mock_set_two])

    # Mathematical check: (10 * 50) + (8 * 55) = 500 + 440 = 940.0
    calculated_volume = workout_service.calculate_exercise_volume(exercise_log=mock_exercise)

    assert calculated_volume == 940.0


def test_remove_workout_session_delegation() -> None:
    """
    Verifies that the service correctly delegates deletion to the repository.
    """
    mock_repo = Mock(spec=WorkoutRepository)
    mock_repo.delete_workout_by_identifier.return_value = True
    service = WorkoutService(workout_repository=mock_repo)

    result = service.remove_workout_session("mock_id")

    assert result is True
    mock_repo.delete_workout_by_identifier.assert_called_once_with(identifier="mock_id")


def test_calculate_average_workout_rpe_ignores_sets_without_rpe() -> None:
    """
    Verifies average workout RPE is calculated only from sets that include RPE values.
    """
    dummy_repository = WorkoutRepository()
    workout_service = WorkoutService(workout_repository=dummy_repository)

    workout_document = WorkoutDocument(
        date_of_workout=datetime.now(timezone.utc),
        target_muscle_groups=["Chest"],
        exercises=[
            ExerciseLog(
                exercise_name="Bench Press",
                sets=[
                    WorkoutSet(
                        repetitions=8, weight_in_kilograms=80.0, rate_of_perceived_exertion=None
                    ),
                    WorkoutSet(
                        repetitions=6, weight_in_kilograms=85.0, rate_of_perceived_exertion=8
                    ),
                    WorkoutSet(
                        repetitions=5, weight_in_kilograms=90.0, rate_of_perceived_exertion=9
                    ),
                ],
            )
        ],
    )

    calculated_average_rpe = workout_service.calculate_average_workout_rpe(workout_document)
    assert calculated_average_rpe == 8.5


def test_build_dashboard_analytics_excludes_workouts_without_rpe_from_rpe_averages() -> None:
    """
    Verifies dashboard RPE summary and chart only include workouts that contain recorded RPE values.
    """
    mock_repo = Mock(spec=WorkoutRepository)
    workout_service = WorkoutService(workout_repository=mock_repo)

    workout_with_rpe = WorkoutDocument(
        date_of_workout=datetime(2026, 3, 1, 9, 0, tzinfo=timezone.utc),
        target_muscle_groups=["Chest"],
        exercises=[
            ExerciseLog(
                exercise_name="Bench Press",
                sets=[
                    WorkoutSet(
                        repetitions=5, weight_in_kilograms=100.0, rate_of_perceived_exertion=9
                    )
                ],
            )
        ],
    )
    workout_without_rpe = WorkoutDocument(
        date_of_workout=datetime(2026, 3, 8, 9, 0, tzinfo=timezone.utc),
        target_muscle_groups=["Back"],
        exercises=[
            ExerciseLog(
                exercise_name="Row",
                sets=[
                    WorkoutSet(
                        repetitions=8, weight_in_kilograms=70.0, rate_of_perceived_exertion=None
                    )
                ],
            )
        ],
    )
    mock_repo.retrieve_all_workouts.return_value = [workout_with_rpe, workout_without_rpe]

    analytics_payload = workout_service.build_dashboard_analytics(range_days=None)

    assert analytics_payload["summary"]["average_session_rpe"] == 9.0
    assert analytics_payload["charts"]["average_rpe_progression"]["labels"] == ["2026-03-01"]
    assert analytics_payload["charts"]["average_rpe_progression"]["values"] == [9.0]
