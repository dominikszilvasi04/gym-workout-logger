"""
Repository layer for user exercise goals.
"""
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from bson.objectid import ObjectId
from application.database import database_manager
from application.models.exercise_goal import ExerciseGoalDocument

logger = logging.getLogger(__name__)


def _build_user_scope_filter(user_identifier: Optional[str]) -> Dict[str, Any]:
    if user_identifier is not None:
        return {"user_identifier": user_identifier}
    return {"$or": [{"user_identifier": {"$exists": False}}, {"user_identifier": None}]}


class ExerciseGoalRepository:
    """
    Handles all database operations for ExerciseGoalDocument entities.
    """

    @property
    def collection(self) -> Any:
        if database_manager.database is None:
            raise RuntimeError("Database client is not initialised.")
        return database_manager.database["exercise_goals"]

    def create_goal(self, goal_document: ExerciseGoalDocument) -> str:
        document_dictionary: Dict[str, Any] = goal_document.model_dump(by_alias=True, exclude={"identifier"})
        if goal_document.target_date is not None:
            document_dictionary["target_date"] = datetime.combine(
                goal_document.target_date,
                datetime.min.time(),
                tzinfo=timezone.utc,
            )
        insertion_result = self.collection.insert_one(document_dictionary)
        return str(insertion_result.inserted_id)

    def retrieve_all_goals(self, user_identifier: Optional[str] = None) -> List[ExerciseGoalDocument]:
        query_filter: Dict[str, Any] = _build_user_scope_filter(user_identifier)
        cursor = self.collection.find(query_filter).sort("created_at", -1)
        goals: List[ExerciseGoalDocument] = []
        for document in cursor:
            document["_id"] = str(document["_id"])
            goals.append(ExerciseGoalDocument(**document))
        return goals

    def retrieve_goal_by_identifier(self, identifier: str, user_identifier: Optional[str] = None) -> Optional[ExerciseGoalDocument]:
        if not ObjectId.is_valid(identifier):
            return None
        query_filter: Dict[str, Any] = {"_id": ObjectId(identifier), **_build_user_scope_filter(user_identifier)}
        document = self.collection.find_one(query_filter)
        if document is None:
            return None
        document["_id"] = str(document["_id"])
        return ExerciseGoalDocument(**document)

    def update_goal_by_identifier(
        self,
        identifier: str,
        updated_goal_document: ExerciseGoalDocument,
        user_identifier: Optional[str] = None,
    ) -> bool:
        if not ObjectId.is_valid(identifier):
            return False
        query_filter: Dict[str, Any] = {"_id": ObjectId(identifier), **_build_user_scope_filter(user_identifier)}
        update_payload: Dict[str, Any] = {
            "$set": {
                "exercise_name": updated_goal_document.exercise_name,
                "exercise_definition_identifier": updated_goal_document.exercise_definition_identifier,
                "target_weight_in_kilograms": updated_goal_document.target_weight_in_kilograms,
                "target_repetitions": updated_goal_document.target_repetitions,
                "target_date": datetime.combine(
                    updated_goal_document.target_date,
                    datetime.min.time(),
                    tzinfo=timezone.utc,
                ) if updated_goal_document.target_date is not None else None,
            }
        }
        update_result = self.collection.update_one(query_filter, update_payload)
        return update_result.matched_count > 0

    def delete_goal_by_identifier(self, identifier: str, user_identifier: Optional[str] = None) -> bool:
        if not ObjectId.is_valid(identifier):
            return False
        query_filter: Dict[str, Any] = {"_id": ObjectId(identifier), **_build_user_scope_filter(user_identifier)}
        deletion_result = self.collection.delete_one(query_filter)
        return deletion_result.deleted_count > 0

    def delete_goals_by_user_identifier(self, user_identifier: str) -> int:
        if not user_identifier:
            return 0
        deletion_result = self.collection.delete_many({"user_identifier": user_identifier})
        return int(deletion_result.deleted_count)
