import time


async def response_time_above(elapsed: float, config: dict) -> tuple[bool, str]:
    """Check if response time exceeds threshold (time-based blind detection)."""
    threshold = config.get("threshold", 5.0)
    if elapsed >= threshold:
        return True, f"Response took {elapsed:.2f}s (threshold: {threshold}s) — possible time-based injection."
    return False, ""


MATCHERS = {
    "time-above": response_time_above,
}