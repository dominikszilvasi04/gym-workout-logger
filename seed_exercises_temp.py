"""
Temporary utility to seed or refresh standard exercise definitions.
Delete after use if no longer needed.
"""
import os
from collections.abc import Mapping

from dotenv import load_dotenv

from application.configuration import (
    ApplicationConfiguration,
    DevelopmentConfiguration,
    ProductionConfiguration,
    TestingConfiguration,
)
from application.database import database_manager
from application.exercise_seed_data import STANDARDISED_EXERCISE_DEFINITIONS


load_dotenv()


def resolve_configuration_class() -> type[ApplicationConfiguration]:
    """
    Select the configuration profile based on APPLICATION_ENV.
    """
    application_environment = os.environ.get("APPLICATION_ENV", "development").strip().lower()
    if application_environment == "production":
        return ProductionConfiguration
    if application_environment == "testing":
        return TestingConfiguration
    return DevelopmentConfiguration


def main() -> None:
    """
    Upsert every standard exercise definition into MongoDB.
    """
    configuration_class = resolve_configuration_class()
    database_uri = configuration_class.DATABASE_URI
    database_name = configuration_class.DATABASE_NAME

    if not database_uri or not database_name:
        raise RuntimeError("Database configuration is missing.")

    database_manager.initialise_client(connection_uri=database_uri, database_name=database_name)
    collection = database_manager.database["exercise_definitions"]

    inserted_count = 0
    updated_count = 0

    for exercise_definition in STANDARDISED_EXERCISE_DEFINITIONS:
        if not isinstance(exercise_definition, Mapping):
            continue

        update_result = collection.update_one(
            {"exercise_name": exercise_definition["exercise_name"]},
            {"$set": dict(exercise_definition)},
            upsert=True,
        )

        if update_result.upserted_id is not None:
            inserted_count += 1
        elif update_result.modified_count > 0:
            updated_count += 1

    total_count = collection.count_documents({})
    print(
        "Exercise seeding complete.",
        f"Inserted: {inserted_count}.",
        f"Updated: {updated_count}.",
        f"Total in collection: {total_count}.",
    )


if __name__ == "__main__":
    main()
