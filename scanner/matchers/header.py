from typing import Any


def header_absent(headers: dict, config: dict) -> tuple[bool, str]:
    """Check if a header is missing from the response."""
    header_name = config.get("header", "").lower()
    headers_lower = {k.lower(): v for k, v in headers.items()}
    
    if header_name not in headers_lower:
        return True, f"Header '{header_name}' not found in response headers."
    return False, ""


def header_present(headers: dict, config: dict) -> tuple[bool, str]:
    """Check if a header exists in the response."""
    header_name = config.get("header", "").lower()
    headers_lower = {k.lower(): v for k, v in headers.items()}
    
    if header_name in headers_lower:
        value = headers_lower[header_name]
        return True, f"Header '{header_name}' found with value: {value}"
    return False, ""


def header_equals(headers: dict, config: dict) -> tuple[bool, str]:
    """Check if a header equals a specific value."""
    header_name = config.get("header", "").lower()
    expected = config.get("value", "")
    headers_lower = {k.lower(): v for k, v in headers.items()}
    actual = headers_lower.get(header_name, "")
    
    if actual.strip() == expected.strip():
        return True, f"Header '{header_name}': {actual}"
    return False, ""


def header_contains(headers: dict, config: dict) -> tuple[bool, str]:
    """Check if a header value contains a string."""
    header_name = config.get("header", "").lower()
    pattern = config.get("pattern", "").lower()
    headers_lower = {k.lower(): v for k, v in headers.items()}
    actual = headers_lower.get(header_name, "")
    
    if pattern in actual.lower():
        return True, f"Header '{header_name}' contains '{pattern}': {actual}"
    return False, ""


def header_value_in(headers: dict, config: dict) -> tuple[bool, str]:
    """Check if a header value is in a list of allowed values."""
    header_name = config.get("header", "").lower()
    allowed = [v.upper() for v in config.get("values", [])]
    headers_lower = {k.lower(): v for k, v in headers.items()}
    actual = headers_lower.get(header_name, "")
    
    if actual.upper() in allowed:
        return True, f"Header '{header_name}': {actual}"
    return False, ""


MATCHERS = {
    "header-absent": header_absent,
    "header-present": header_present,
    "header-equals": header_equals,
    "header-contains": header_contains,
    "header-value-in": header_value_in,
}