import re


def regex_match(text: str, config: dict) -> tuple[bool, str]:
    """Check if response body matches a regex pattern."""
    pattern = config.get("pattern", "")
    try:
        match = re.search(pattern, text, re.IGNORECASE)
        if match:
            return True, f"Regex pattern matched: '{match.group(0)[:100]}'"
    except re.error as e:
        print(f"Invalid regex pattern '{pattern}': {e}")
    return False, ""


def regex_not_match(text: str, config: dict) -> tuple[bool, str]:
    """Check if response body does NOT match a regex pattern."""
    pattern = config.get("pattern", "")
    try:
        match = re.search(pattern, text, re.IGNORECASE)
        if not match:
            return True, f"Regex pattern '{pattern}' not found in response."
    except re.error:
        pass
    return False, ""


MATCHERS = {
    "regex-match": regex_match,
    "regex-not-match": regex_not_match,
}