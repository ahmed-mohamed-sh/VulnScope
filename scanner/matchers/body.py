def body_contains(text: str, config: dict) -> tuple[bool, str]:
    """Check if response body contains a string."""
    pattern = config.get("pattern", "")
    if pattern.lower() in text.lower():
        return True, f"Pattern '{pattern}' found in response body."
    return False, ""


def body_contains_any(text: str, config: dict) -> tuple[bool, str]:
    """Check if response body contains any of the patterns."""
    patterns = config.get("patterns", [])
    for pattern in patterns:
        if pattern.lower() in text.lower():
            return True, f"Pattern '{pattern}' found in response body."
    return False, ""


def body_not_contains(text: str, config: dict) -> tuple[bool, str]:
    """Check if response body does NOT contain a string."""
    pattern = config.get("pattern", "")
    if pattern.lower() not in text.lower():
        return True, f"Pattern '{pattern}' not found in response body."
    return False, ""


MATCHERS = {
    "body-contains": body_contains,
    "body-contains-any": body_contains_any,
    "body-not-contains": body_not_contains,
}