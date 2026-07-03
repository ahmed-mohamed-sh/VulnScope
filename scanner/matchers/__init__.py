from matchers import header, body, status, regex, time as time_matcher

# Merge all matcher registries into one
MATCHER_REGISTRY = {
    **header.MATCHERS,
    **body.MATCHERS,
    **status.MATCHERS,
    **regex.MATCHERS,
    **time_matcher.MATCHERS,
}


def get_matcher(matcher_type: str):
    """Get a matcher function by type name."""
    matcher = MATCHER_REGISTRY.get(matcher_type)
    if not matcher:
        raise ValueError(f"Unknown matcher type: '{matcher_type}'. Available: {list(MATCHER_REGISTRY.keys())}")
    return matcher


def list_matchers() -> list:
    """Return all available matcher types."""
    return list(MATCHER_REGISTRY.keys())