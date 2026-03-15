"""
Service layer for handling standardised exercise definitions.
"""
import logging
import smtplib
from email.message import EmailMessage
from typing import List
from application.exercise_seed_data import STANDARDISED_EXERCISE_DEFINITIONS
from application.models.exercise_definition import ExerciseDefinition
from application.repositories.exercise_definition_repository import ExerciseDefinitionRepository

logger = logging.getLogger(__name__)


class ExerciseDefinitionService:
    """
    Encapsulates business logic for standard exercise definitions.
    """

    def __init__(self, exercise_definition_repository: ExerciseDefinitionRepository) -> None:
        """
        Initialises the service with a dedicated repository instance.
        
        Args:
            exercise_definition_repository: The injected data access object.
        """
        self.exercise_definition_repository = exercise_definition_repository

    def retrieve_all_standardised_exercises(self) -> List[ExerciseDefinition]:
        """
        Retrieves the complete master list of available exercises.
        
        Returns:
            A strictly typed list of ExerciseDefinition models.
        """
        self.seed_standardised_exercises_if_collection_is_empty()
        exercises = self.exercise_definition_repository.retrieve_all_exercise_definitions()
        logger.debug("Retrieved %d standardised exercises from repository.", len(exercises))
        return exercises

    def seed_standardised_exercises_if_collection_is_empty(self) -> None:
        """
        Seeds the repository with a standard exercise catalogue when empty.
        """
        if self.exercise_definition_repository.count_exercise_definitions() > 0:
            return
        inserted_count = 0
        for exercise_definition_data in STANDARDISED_EXERCISE_DEFINITIONS:
            standardised_exercise_definition = ExerciseDefinition(**exercise_definition_data)
            inserted = self.exercise_definition_repository.upsert_exercise_definition_by_name(
                exercise_definition=standardised_exercise_definition
            )
            if inserted:
                inserted_count += 1
        logger.info("Seeded %d standardised exercise definitions.", inserted_count)

    def send_exercise_request_notification_email(
        self,
        requester_email: str,
        requested_exercise_name: str,
        requested_primary_muscle_group: str,
        request_notes: str,
        application_configuration: dict
    ) -> None:
        """
        Sends an exercise request email to the configured recipient.
        """
        recipient_email = application_configuration.get("EXERCISE_REQUEST_RECIPIENT_EMAIL")
        smtp_host = application_configuration.get("SMTP_HOST")
        smtp_port = application_configuration.get("SMTP_PORT")
        smtp_username = application_configuration.get("SMTP_USERNAME")
        smtp_password = application_configuration.get("SMTP_PASSWORD")
        smtp_sender_email = application_configuration.get("SMTP_SENDER_EMAIL")
        smtp_use_tls = application_configuration.get("SMTP_USE_TLS")
        if not recipient_email or not smtp_host or not smtp_sender_email:
            raise RuntimeError("Exercise request email is not fully configured.")
        email_message = EmailMessage()
        email_message["Subject"] = f"Gym Logger Exercise Request: {requested_exercise_name}"
        email_message["From"] = smtp_sender_email
        email_message["To"] = recipient_email
        email_message.set_content(
            "\n".join(
                [
                    "A user requested a new exercise definition.",
                    "",
                    f"Requester email: {requester_email}",
                    f"Exercise name: {requested_exercise_name}",
                    f"Primary muscle group: {requested_primary_muscle_group}",
                    f"Notes: {request_notes or 'None'}",
                ]
            )
        )
        with smtplib.SMTP(smtp_host, smtp_port, timeout=15) as smtp_client:
            if smtp_use_tls:
                smtp_client.starttls()
            if smtp_username and smtp_password:
                smtp_client.login(smtp_username, smtp_password)
            smtp_client.send_message(email_message)
            