"""
Unit tests for the pure business logic contained within the WorkoutService.
"""
from application.services.workout_service import WorkoutService
from application.repositories.workout_repository import WorkoutRepository
from application.models.workout import ExerciseLog, WorkoutSet

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
        weight_in_kilograms=100.0, 
        repetitions=5
    )
    
    assert calculated_maximum == 116.67

def test_calculate_exercise_volume() -> None:
    """
    Tests that total volume is correctly aggregated across multiple sets.
    """
    dummy_repository = WorkoutRepository()
    workout_service = WorkoutService(workout_repository=dummy_repository)
    
    mock_set_one = WorkoutSet(repetitions=10, weight_in_kilograms=50.0, rate_of_perceived_exertion=7)
    mock_set_two = WorkoutSet(repetitions=8, weight_in_kilograms=55.0, rate_of_perceived_exertion=8)
    mock_exercise = ExerciseLog(exercise_name="Bench Press", sets=[mock_set_one, mock_set_two])
    
    # Mathematical check: (10 * 50) + (8 * 55) = 500 + 440 = 940.0
    calculated_volume = workout_service.calculate_exercise_volume(exercise_log=mock_exercise)
    
    assert calculated_volume == 940.0

def test_remove_workout_session_delegation(mocker):
    """
    Verifies that the service correctly delegates deletion to the repository.
    """
    mock_repo = mocker.Mock(spec=WorkoutRepository)
    mock_repo.delete_workout_by_identifier.return_value = True
    service = WorkoutService(workout_repository=mock_repo)
    
    result = service.remove_workout_session("mock_id")
    
    assert result is True
    mock_repo.delete_workout_by_identifier.assert_called_once_with(identifier="mock_id")