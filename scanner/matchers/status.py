def status_equals(status_code: int, config: dict) -> tuple[bool, str]:
    """Check if status code equals expected."""
    expected = config.get("code", 200)
    if status_code == expected:
        return True, f"Response returned status code {status_code}."
    return False, ""


def status_in(status_code: int, config: dict) -> tuple[bool, str]:
    """Check if status code is in expected list."""
    expected = config.get("codes", [])
    if status_code in expected:
        return True, f"Response returned status code {status_code}."
    return False, ""


def status_not_in(status_code: int, config: dict) -> tuple[bool, str]:
    """Check if status code is NOT in list."""
    expected = config.get("codes", [])
    if status_code not in expected:
        return True, f"Response returned unexpected status code {status_code}."
    return False, ""


MATCHERS = {
    "status-equals": status_equals,
    "status-in": status_in,
    "status-not-in": status_not_in,
}