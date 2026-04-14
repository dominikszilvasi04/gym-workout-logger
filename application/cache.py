"""
Application-wide cache utilities.
"""

from __future__ import annotations

import logging
from pathlib import Path
from typing import Any

from cachelib import FileSystemCache

logger = logging.getLogger(__name__)


class ApplicationCacheManager:
    """
    Central cache manager with namespace-based version invalidation.
    """

    def __init__(self) -> None:
        self._cache: FileSystemCache | None = None
        self._default_timeout_seconds = 300

    def initialise(self, cache_directory: str, default_timeout_seconds: int = 300) -> None:
        cache_path = Path(cache_directory)
        cache_path.mkdir(parents=True, exist_ok=True)
        self._cache = FileSystemCache(cache_dir=str(cache_path), threshold=2000)
        self._default_timeout_seconds = max(default_timeout_seconds, 1)
        logger.info(
            "Application cache initialised at %s with default timeout %s seconds.",
            cache_path,
            self._default_timeout_seconds,
        )

    @property
    def cache(self) -> FileSystemCache:
        if self._cache is None:
            raise RuntimeError("Application cache has not been initialised.")
        return self._cache

    def get(self, cache_key: str) -> Any:
        return self.cache.get(cache_key)

    def set(self, cache_key: str, value: Any, timeout_seconds: int | None = None) -> None:
        self.cache.set(cache_key, value, timeout=timeout_seconds or self._default_timeout_seconds)

    def delete(self, cache_key: str) -> None:
        self.cache.delete(cache_key)

    def get_namespace_version(self, namespace: str) -> int:
        version = self.cache.get(self._namespace_version_key(namespace))
        if isinstance(version, int) and version >= 0:
            return version
        self.cache.set(self._namespace_version_key(namespace), 1, timeout=0)
        return 1

    def bump_namespace_version(self, namespace: str) -> int:
        next_version = self.get_namespace_version(namespace) + 1
        self.cache.set(self._namespace_version_key(namespace), next_version, timeout=0)
        return next_version

    def build_cache_key(self, namespace: str, *segments: object) -> str:
        version = self.get_namespace_version(namespace)
        component_segments = [namespace, str(version), *(str(segment) for segment in segments)]
        return ":".join(component_segments)

    def invalidate_namespace(self, namespace: str) -> int:
        return self.bump_namespace_version(namespace)

    @staticmethod
    def _namespace_version_key(namespace: str) -> str:
        return f"__namespace_version__:{namespace}"


application_cache_manager = ApplicationCacheManager()

# Cache namespaces used across the application.
WORKOUT_CACHE_NAMESPACE = "workout"
WORKOUT_RELATED_CACHE_NAMESPACE = "workout-related"
GOAL_CACHE_NAMESPACE = "goal"
PROFILE_CACHE_NAMESPACE = "profile"
ADMIN_USER_CACHE_NAMESPACE = "admin-users"
ADMIN_AUDIT_LOG_CACHE_NAMESPACE = "admin-audit-logs"
