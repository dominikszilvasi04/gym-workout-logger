"""
Central logging configuration for the application.
"""
import logging

def configure_application_logging(log_level: str = "INFO") -> None:
    """
    Configures root logging for the application.

    Args:
        log_level: Desired logging level (e.g., DEBUG, INFO, WARNING).
    """
    resolved_level = getattr(logging, str(log_level).upper(), logging.INFO)
    root_logger = logging.getLogger()
    if not root_logger.handlers:
        logging.basicConfig(
            level=resolved_level,
            format="%(asctime)s | %(levelname)s | %(name)s | %(message)s"
        )
    else:
        root_logger.setLevel(resolved_level)
