"""
Service layer initialisation.
"""

from application.repositories.workout_repository import WorkoutRepository
from application.services.workout_service import WorkoutService
from application.repositories.exercise_definition_repository import ExerciseDefinitionRepository
from application.services.exercise_definition_service import ExerciseDefinitionService
from application.repositories.user_repository import UserRepository
from application.services.user_service import UserService
from application.repositories.workout_template_repository import WorkoutTemplateRepository
from application.services.workout_template_service import WorkoutTemplateService
from application.repositories.exercise_goal_repository import ExerciseGoalRepository
from application.services.exercise_goal_service import ExerciseGoalService

# Instantiate the repositories
application_workout_repository = WorkoutRepository()
application_exercise_definition_repository = ExerciseDefinitionRepository()
application_user_repository = UserRepository()
application_workout_template_repository = WorkoutTemplateRepository()
application_exercise_goal_repository = ExerciseGoalRepository()

# Inject the repositories into the services
application_workout_service = WorkoutService(workout_repository=application_workout_repository)
application_exercise_definition_service = ExerciseDefinitionService(
    exercise_definition_repository=application_exercise_definition_repository
)
application_user_service = UserService(
    user_repository=application_user_repository,
    workout_repository=application_workout_repository,
    workout_template_repository=application_workout_template_repository,
    exercise_goal_repository=application_exercise_goal_repository,
)
application_workout_template_service = WorkoutTemplateService(
    workout_template_repository=application_workout_template_repository
)
application_exercise_goal_service = ExerciseGoalService(
    exercise_goal_repository=application_exercise_goal_repository,
    workout_service=application_workout_service,
)
