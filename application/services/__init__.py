"""
Service layer initialisation.
"""
from application.repositories.workout_repository import WorkoutRepository
from application.services.workout_service import WorkoutService

# Instantiate the repository
application_workout_repository = WorkoutRepository()

# Inject the repository into the service
application_workout_service = WorkoutService(workout_repository=application_workout_repository)