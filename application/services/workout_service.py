"""
Service layer containing logic for the logger.
"""
import logging
from collections import Counter
from datetime import datetime, timedelta, timezone
from typing import List, Optional
from application.models.workout import WorkoutDocument, ExerciseLog, WorkoutSet
from application.repositories.workout_repository import WorkoutRepository

logger = logging.getLogger(__name__)

class WorkoutService:
    """
    Encapsulates all operation logic and calculations for workout operations.
    Acts as the intermediary between the Controller (Flask routes) and the Database (Repository).
    """

    def __init__(self, workout_repository: WorkoutRepository) -> None:
        """
        Initialises the WorkoutService with a dedicated repository instance.
        
        Args:
            workout_repository: The injected data access object.
        """
        self.workout_repository = workout_repository

    def normalise_datetime_to_utc(self, date_time_value: datetime) -> datetime:
        """
        Normalises both naive and timezone-aware datetimes to UTC-aware values.

        Args:
            date_time_value: The datetime to normalise.

        Returns:
            A timezone-aware UTC datetime.
        """
        if date_time_value.tzinfo is None or date_time_value.tzinfo.utcoffset(date_time_value) is None:
            return date_time_value.replace(tzinfo=timezone.utc)
        return date_time_value.astimezone(timezone.utc)

    def calculate_estimated_one_repetition_maximum(self, weight_in_kilograms: float, repetitions: int) -> float:
        """
        Calculates the estimated one repetition maximum using the standard Epley formula.
        
        Args:
            weight_in_kilograms: The weight lifted during the set.
            repetitions: The number of times the weight was lifted.
            
        Returns:
            The estimated absolute maximum weight the user could lift for a single repetition.
        """
        if repetitions <= 0:
            return 0.0
        if repetitions == 1:
            return weight_in_kilograms
        estimated_maximum: float = weight_in_kilograms * (1.0 + (repetitions / 30.0))
        return round(estimated_maximum, 2)

    def calculate_exercise_volume(self, exercise_log: ExerciseLog) -> float:
        """
        Calculates the total physical volume for a specific exercise.
        Volume is defined as Weight x Repetitions across all sets.
        
        Args:
            exercise_log: The Pydantic model representing the exercise and its sets.
            
        Returns:
            The total volume in kilograms.
        """
        total_exercise_volume: float = 0.0
        for workout_set in exercise_log.sets:
            total_exercise_volume += (workout_set.weight_in_kilograms * workout_set.repetitions)
        return round(total_exercise_volume, 2)

    def calculate_total_workout_volume(self, workout_document: WorkoutDocument) -> float:
        """
        Calculates the cumulative volume of the entire workout session.
        
        Args:
            workout_document: The complete workout record.
            
        Returns:
            The sum of all exercise volumes within the workout.
        """
        cumulative_volume: float = 0.0
        for exercise in workout_document.exercises:
            cumulative_volume += self.calculate_exercise_volume(exercise_log=exercise)
        return round(cumulative_volume, 2)

    def record_new_workout_session(self, workout_document: WorkoutDocument) -> str:
        """
        Validates and delegates the persistence of a new workout to the repository layer.
        
        Args:
            workout_document: The thoroughly validated Pydantic model.
            
        Returns:
            The unique string identifier of the newly created database record.
        """
        logger.info("Recording new workout session with %d exercises.", len(workout_document.exercises))
        return self.workout_repository.create_workout(workout_document=workout_document)

    def retrieve_workout_history(self, user_identifier: Optional[str] = None) -> List[WorkoutDocument]:
        """
        Retrieves the complete history of all logged workouts.
        
        Returns:
            A list of validated WorkoutDocument models.
        """
        if user_identifier is None:
            workout_history = self.workout_repository.retrieve_all_workouts()
        else:
            workout_history = self.workout_repository.retrieve_all_workouts(user_identifier=user_identifier)
        logger.debug("Retrieved workout history count=%d", len(workout_history))
        return workout_history
        
    def retrieve_specific_workout(self, identifier: str, user_identifier: Optional[str] = None) -> Optional[WorkoutDocument]:
        """
        Retrieves a single workout session by its unique database identifier.
        
        Args:
            identifier: The string representation of the MongoDB ObjectId.
            
        Returns:
            The WorkoutDocument if found, otherwise None.
        """
        logger.debug("Retrieving workout identifier=%s", identifier)
        if user_identifier is None:
            return self.workout_repository.retrieve_workout_by_identifier(identifier=identifier)
        return self.workout_repository.retrieve_workout_by_identifier(identifier=identifier, user_identifier=user_identifier)
    
    def remove_workout_session(self, identifier: str, user_identifier: Optional[str] = None) -> bool:
        """
        Delegates the deletion of a specific workout session to the repository.
        
        Args:
            identifier: The string representation of the database unique identifier.
            
        Returns:
            A boolean indicating the success of the deletion operation.
        """
        logger.info("Removing workout identifier=%s", identifier)
        if user_identifier is None:
            return self.workout_repository.delete_workout_by_identifier(identifier=identifier)
        return self.workout_repository.delete_workout_by_identifier(identifier=identifier, user_identifier=user_identifier)
    
    def modify_workout_session(
        self,
        identifier: str,
        workout_document: WorkoutDocument,
        user_identifier: Optional[str] = None
    ) -> bool:
        """
        Coordinates the update of a workout session after validation.
        
        Args:
            identifier: The unique identifier for the workout.
            workout_document: The new validated data to be stored.
            
        Returns:
            Success status of the update operation.
        """
        logger.info("Modifying workout identifier=%s", identifier)
        if user_identifier is None:
            return self.workout_repository.update_workout_by_identifier(
                identifier=identifier,
                updated_workout=workout_document
            )
        return self.workout_repository.update_workout_by_identifier(
            identifier=identifier,
            updated_workout=workout_document,
            user_identifier=user_identifier
        )

    def retrieve_recent_workouts(self, user_identifier: Optional[str] = None, limit: int = 5) -> List[WorkoutDocument]:
        """
        Retrieves the most recent workouts for the specified user scope.

        Args:
            user_identifier: Optional user scope for the workout history.
            limit: Maximum number of workouts to return.

        Returns:
            A descending date-sorted list of workouts.
        """
        workout_history = self.retrieve_workout_history(user_identifier=user_identifier)
        sorted_workouts = sorted(
            workout_history,
            key=lambda workout: self.normalise_datetime_to_utc(workout.date_of_workout),
            reverse=True
        )
        return sorted_workouts[:limit]

    def build_profile_summary(self, user_identifier: str) -> dict[str, object]:
        """
        Calculates profile metrics for a specific authenticated user.

        Args:
            user_identifier: The owning user identifier.

        Returns:
            A dictionary containing aggregate workout statistics.
        """
        workouts = self.retrieve_workout_history(user_identifier=user_identifier)
        recent_workouts = sorted(
            workouts,
            key=lambda workout: self.normalise_datetime_to_utc(workout.date_of_workout),
            reverse=True
        )

        total_workouts = len(workouts)
        total_exercises = sum(len(workout.exercises) for workout in workouts)
        total_sets = sum(len(exercise.sets) for workout in workouts for exercise in workout.exercises)
        total_repetitions = sum(
            workout_set.repetitions
            for workout in workouts
            for exercise in workout.exercises
            for workout_set in exercise.sets
        )
        total_volume = sum(self.calculate_total_workout_volume(workout) for workout in workouts)

        target_muscle_counter: Counter[str] = Counter()
        for workout in workouts:
            for muscle_group in workout.target_muscle_groups:
                target_muscle_counter[muscle_group] += 1

        most_trained_muscle_group = None
        if target_muscle_counter:
            most_trained_muscle_group = target_muscle_counter.most_common(1)[0][0]

        return {
            "total_workouts": total_workouts,
            "total_exercises": total_exercises,
            "total_sets": total_sets,
            "total_repetitions": total_repetitions,
            "total_volume": round(total_volume, 2),
            "most_trained_muscle_group": most_trained_muscle_group,
            "latest_workout": recent_workouts[0] if recent_workouts else None,
            "recent_workouts": recent_workouts[:5],
        }

    def calculate_total_sets(self, workout_document: WorkoutDocument) -> int:
        """
        Calculates the number of sets performed in a workout.

        Args:
            workout_document: The complete workout record.

        Returns:
            The total set count.
        """
        return sum(len(exercise.sets) for exercise in workout_document.exercises)

    def calculate_total_repetitions(self, workout_document: WorkoutDocument) -> int:
        """
        Calculates total repetitions completed in a workout.

        Args:
            workout_document: The complete workout record.

        Returns:
            The total repetition count.
        """
        return sum(workout_set.repetitions for exercise in workout_document.exercises for workout_set in exercise.sets)

    def calculate_best_estimated_one_repetition_maximum(self, workout_document: WorkoutDocument) -> float:
        """
        Calculates the best estimated 1RM within a workout based on all sets.

        Args:
            workout_document: The complete workout record.

        Returns:
            The highest estimated 1RM value found.
        """
        estimated_maximums = [
            self.calculate_estimated_one_repetition_maximum(weight_in_kilograms=workout_set.weight_in_kilograms, repetitions=workout_set.repetitions)
            for exercise in workout_document.exercises
            for workout_set in exercise.sets
        ]
        return max(estimated_maximums, default=0.0)

    def calculate_average_workout_rpe(self, workout_document: WorkoutDocument) -> float:
        """
        Calculates the average set RPE for a workout.

        Args:
            workout_document: The complete workout record.

        Returns:
            The average RPE across all sets.
        """
        workout_sets = [
            workout_set
            for exercise in workout_document.exercises
            for workout_set in exercise.sets
        ]
        if not workout_sets:
            return 0.0
        total_rpe = sum(workout_set.rate_of_perceived_exertion for workout_set in workout_sets)
        return round(total_rpe / len(workout_sets), 2)

    def calculate_best_estimated_one_repetition_maximum_for_exercise(
        self,
        workout_document: WorkoutDocument,
        exercise_name: str
    ) -> float:
        """
        Calculates the best estimated 1RM for a specific exercise within a workout.

        Args:
            workout_document: The complete workout record.
            exercise_name: The target exercise name.

        Returns:
            The highest estimated 1RM for the matching exercise.
        """
        matching_estimated_maximums = [
            self.calculate_estimated_one_repetition_maximum(
                weight_in_kilograms=workout_set.weight_in_kilograms,
                repetitions=workout_set.repetitions
            )
            for exercise in workout_document.exercises
            if exercise.exercise_name == exercise_name
            for workout_set in exercise.sets
        ]
        return max(matching_estimated_maximums, default=0.0)

    def calculate_training_streak_weeks(self, workouts: List[WorkoutDocument]) -> int:
        """
        Calculates the number of consecutive active training weeks.

        Args:
            workouts: The workout collection to inspect.

        Returns:
            Count of consecutive ISO calendar weeks with at least one workout.
        """
        if not workouts:
            return 0

        unique_weeks = sorted(
            {(workout.date_of_workout.isocalendar().year, workout.date_of_workout.isocalendar().week) for workout in workouts},
            reverse=True
        )
        streak = 1
        previous_year, previous_week = unique_weeks[0]

        for current_year, current_week in unique_weeks[1:]:
            previous_week_start = datetime.fromisocalendar(previous_year, previous_week, 1)
            current_week_start = datetime.fromisocalendar(current_year, current_week, 1)
            if (previous_week_start - current_week_start).days == 7:
                streak += 1
                previous_year, previous_week = current_year, current_week
                continue
            break

        return streak

    def build_personal_records(self, workouts: List[WorkoutDocument], limit: int = 5) -> List[dict[str, object]]:
        """
        Builds a personal-record leaderboard by exercise.

        Args:
            workouts: The workout collection to inspect.
            limit: Maximum number of records to return.

        Returns:
            Top personal records keyed by exercise.
        """
        records_by_exercise: dict[str, dict[str, object]] = {}
        for workout in workouts:
            for exercise in workout.exercises:
                best_estimated_maximum = self.calculate_best_estimated_one_repetition_maximum_for_exercise(
                    workout_document=workout,
                    exercise_name=exercise.exercise_name
                )

                if best_estimated_maximum <= 0:
                    continue

                existing_record = records_by_exercise.get(exercise.exercise_name)
                if existing_record is None or best_estimated_maximum > existing_record["estimated_one_rep_maximum"]:
                    records_by_exercise[exercise.exercise_name] = {
                        "exercise_name": exercise.exercise_name,
                        "estimated_one_rep_maximum": best_estimated_maximum,
                        "date": workout.date_of_workout.strftime("%Y-%m-%d"),
                    }

        sorted_records = sorted(
            records_by_exercise.values(),
            key=lambda record: record["estimated_one_rep_maximum"],
            reverse=True
        )
        return sorted_records[:limit]

    def filter_workouts_by_range(self, workouts: List[WorkoutDocument], range_days: Optional[int]) -> List[WorkoutDocument]:
        """
        Filters workouts to a trailing date range.

        Args:
            workouts: The workout collection to inspect.
            range_days: Trailing day window, or None for all-time.

        Returns:
            The filtered workout list.
        """
        if range_days is None:
            return workouts

        # Validate and normalise range_days to avoid confusing future-oriented windows.
        if range_days < 0:
            logger.warning("Invalid range_days value provided to filter_workouts_by_range: %s", range_days)
            raise ValueError("range_days must be a non-negative integer")

        # Optionally cap the range to a reasonable maximum to prevent excessive queries.
        max_days = 3650  # e.g. limit to the last 10 years
        if range_days > max_days:
            logger.info(
                "range_days value %s exceeds max_days=%s; capping to maximum.",
                range_days,
                max_days,
            )
            range_days = max_days

        range_start = datetime.now(timezone.utc) - timedelta(days=range_days)
        return [
            workout
            for workout in workouts
            if self.normalise_datetime_to_utc(workout.date_of_workout) >= range_start
        ]

    def build_dashboard_analytics(
        self,
        user_identifier: Optional[str] = None,
        range_days: Optional[int] = None,
        exercise_name: Optional[str] = None
    ) -> dict[str, object]:
        """
        Builds dashboard summary metrics and chart series from real workout data.

        Args:
            user_identifier: Optional user scope for authenticated dashboards.
            range_days: Optional trailing date range for analytics.
            exercise_name: Optional exercise filter for strength progression.

        Returns:
            A serialisable dictionary containing summary cards and chart datasets.
        """
        all_workouts = sorted(
            self.retrieve_workout_history(user_identifier=user_identifier),
            key=lambda workout: self.normalise_datetime_to_utc(workout.date_of_workout)
        )
        filtered_workouts = self.filter_workouts_by_range(all_workouts, range_days=range_days)

        available_exercise_names = sorted(
            {
                exercise.exercise_name
                for workout in all_workouts
                for exercise in workout.exercises
            }
        )
        selected_exercise_name = exercise_name.strip() if exercise_name else None
        if selected_exercise_name == "":
            selected_exercise_name = None

        total_volume = round(sum(self.calculate_total_workout_volume(workout) for workout in filtered_workouts), 2)
        total_sets = sum(self.calculate_total_sets(workout) for workout in filtered_workouts)
        total_repetitions = sum(self.calculate_total_repetitions(workout) for workout in filtered_workouts)
        total_exercises = sum(len(workout.exercises) for workout in filtered_workouts)
        average_session_rpe = round(
            sum(self.calculate_average_workout_rpe(workout) for workout in filtered_workouts) / len(filtered_workouts),
            2
        ) if filtered_workouts else 0.0

        volume_labels = [workout.date_of_workout.strftime("%Y-%m-%d") for workout in filtered_workouts]
        volume_values = [self.calculate_total_workout_volume(workout) for workout in filtered_workouts]

        if selected_exercise_name:
            one_rep_workouts = [
                workout for workout in filtered_workouts
                if any(exercise.exercise_name == selected_exercise_name for exercise in workout.exercises)
            ]
            one_rep_max_labels = [workout.date_of_workout.strftime("%Y-%m-%d") for workout in one_rep_workouts]
            one_rep_max_values = [
                self.calculate_best_estimated_one_repetition_maximum_for_exercise(workout, selected_exercise_name)
                for workout in one_rep_workouts
            ]
        else:
            one_rep_workouts = filtered_workouts
            one_rep_max_labels = volume_labels
            one_rep_max_values = [
                self.calculate_best_estimated_one_repetition_maximum(workout)
                for workout in filtered_workouts
            ]

        weekly_frequency_counter: Counter[str] = Counter()
        target_muscle_counter: Counter[str] = Counter()
        top_exercise_volume_counter: Counter[str] = Counter()
        average_rpe_labels: List[str] = []
        average_rpe_values: List[float] = []
        for workout in filtered_workouts:
            iso_calendar = workout.date_of_workout.isocalendar()
            weekly_frequency_counter[f"{iso_calendar.year}-W{iso_calendar.week:02d}"] += 1
            for muscle_group in workout.target_muscle_groups:
                target_muscle_counter[muscle_group] += 1
            average_rpe_labels.append(workout.date_of_workout.strftime("%Y-%m-%d"))
            average_rpe_values.append(self.calculate_average_workout_rpe(workout))
            for exercise in workout.exercises:
                top_exercise_volume_counter[exercise.exercise_name] += self.calculate_exercise_volume(exercise)

        sorted_weekly_labels = sorted(weekly_frequency_counter.keys())
        weekly_frequency_values = [weekly_frequency_counter[label] for label in sorted_weekly_labels]
        muscle_labels = [entry[0] for entry in target_muscle_counter.most_common()]
        muscle_values = [entry[1] for entry in target_muscle_counter.most_common()]
        top_exercise_volume_entries = top_exercise_volume_counter.most_common(5)
        top_exercise_volume_labels = [entry[0] for entry in top_exercise_volume_entries]
        top_exercise_volume_values = [round(entry[1], 2) for entry in top_exercise_volume_entries]
        strongest_estimated_one_rep_maximum = max(one_rep_max_values, default=0.0)
        average_workout_volume = round(total_volume / len(filtered_workouts), 2) if filtered_workouts else 0.0
        current_training_streak_weeks = self.calculate_training_streak_weeks(all_workouts)
        personal_records = self.build_personal_records(all_workouts)

        return {
            "filters": {
                "range_days": range_days,
                "selected_exercise": selected_exercise_name,
                "available_exercises": available_exercise_names,
            },
            "summary": {
                "total_workouts": len(filtered_workouts),
                "total_volume": total_volume,
                "average_workout_volume": average_workout_volume,
                "total_sets": total_sets,
                "total_repetitions": total_repetitions,
                "total_exercises": total_exercises,
                "strongest_estimated_one_rep_maximum": strongest_estimated_one_rep_maximum,
                "average_session_rpe": average_session_rpe,
                "current_training_streak_weeks": current_training_streak_weeks,
            },
            "charts": {
                "one_rep_max_progression": {
                    "labels": one_rep_max_labels,
                    "values": one_rep_max_values,
                },
                "workout_volume_progression": {
                    "labels": volume_labels,
                    "values": volume_values,
                },
                "muscle_group_distribution": {
                    "labels": muscle_labels,
                    "values": muscle_values,
                },
                "weekly_frequency": {
                    "labels": sorted_weekly_labels,
                    "values": weekly_frequency_values,
                },
                "average_rpe_progression": {
                    "labels": average_rpe_labels,
                    "values": average_rpe_values,
                },
                "top_exercise_volume": {
                    "labels": top_exercise_volume_labels,
                    "values": top_exercise_volume_values,
                },
            },
            "leaderboards": {
                "personal_records": personal_records,
            },
        }