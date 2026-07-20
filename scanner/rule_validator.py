import yaml
import sys
import os
from matchers import list_matchers


REQUIRED_FIELDS = ["id", "info", "matchers"]
REQUIRED_INFO_FIELDS = ["name", "severity", "category", "description"]
VALID_SEVERITIES = ["critical", "high", "medium", "low", "info"]
VALID_METHODS = ["GET", "POST", "PUT", "DELETE", "HEAD", "OPTIONS"]


class RuleValidationError(Exception):
    def __init__(self, message: str, line: int = None):
        self.line = line
        super().__init__(message)


def validate_rule(rule: dict, filepath: str = "") -> list:
    """
    Validate a single rule dict.
    Returns list of errors (empty = valid).
    """
    errors = []

    # Check required top-level fields
    for field in REQUIRED_FIELDS:
        if field not in rule:
            errors.append(f"Missing required field: '{field}'")

    if errors:
        return errors

    # Validate info block
    info = rule.get("info", {})
    if not isinstance(info, dict):
        errors.append("'info' must be a dictionary")
    else:
        for field in REQUIRED_INFO_FIELDS:
            if field not in info:
                errors.append(f"Missing required info field: '{field}'")

        severity = info.get("severity", "").lower()
        if severity and severity not in VALID_SEVERITIES:
            errors.append(
                f"Invalid severity '{severity}'. Must be one of: {VALID_SEVERITIES}"
            )

    # Validate request block (optional but must be valid if present)
    request = rule.get("request", {})
    if request:
        method = request.get("method", "GET").upper()
        if method not in VALID_METHODS:
            errors.append(
                f"Invalid HTTP method '{method}'. Must be one of: {VALID_METHODS}"
            )

        path = request.get("path", "")
        if path and "{{BaseURL}}" not in path and not path.startswith("/"):
            errors.append(
                f"Invalid path '{path}'. Must contain '{{{{BaseURL}}}}' or start with '/'"
            )

    # Validate matchers block
    matchers = rule.get("matchers", {})
    if not isinstance(matchers, dict):
        errors.append("'matchers' must be a dictionary")
    else:
        matcher_type = matchers.get("type")
        if not matcher_type:
            errors.append("'matchers.type' is required")
        else:
            available = list_matchers()
            if matcher_type not in available:
                # Try to suggest closest match
                suggestions = [m for m in available if matcher_type.split("-")[0] in m]
                suggestion_str = f" Did you mean: {suggestions}?" if suggestions else ""
                errors.append(
                    f"Unknown matcher type '{matcher_type}'.{suggestion_str} "
                    f"Available: {available}"
                )

    # Validate fix field (optional but recommended)
    if "fix" not in rule:
        errors.append("Warning: 'fix' field missing (recommended)")

    return errors


def validate_file(filepath: str) -> bool:
    """
    Validate a single YAML rule file.
    Returns True if valid, False if invalid.
    """
    print(f"\n Validating: {filepath}")

    if not os.path.exists(filepath):
        print(f"File not found: {filepath}")
        return False

    try:
        with open(filepath, "r") as f:
            rule = yaml.safe_load(f)
    except yaml.YAMLError as e:
        print(f"YAML parse error: {e}")
        return False

    if not rule:
        print("Empty rule file")
        return False

    errors = validate_rule(rule, filepath)
    warnings = [e for e in errors if e.startswith("⚠️")]
    real_errors = [e for e in errors if not e.startswith("⚠️")]

    if real_errors:
        print(f"Rule invalid: {rule.get('id', 'unknown')}")
        for err in real_errors:
            print(f"   → {err}")
        for warn in warnings:
            print(f"   {warn}")
        return False
    else:
        info = rule.get("info", {})
        print(f"   Rule valid: {rule.get('id')}")
        print(f"   Name     : {info.get('name')}")
        print(f"   Severity : {info.get('severity', '').upper()}")
        print(f"   Category : {info.get('category')}")
        print(f"   Matcher  : {rule.get('matchers', {}).get('type')}")
        for warn in warnings:
            print(f"   {warn}")
        return True


def validate_directory(directory: str) -> dict:
    """
    Validate all YAML rule files in a directory recursively.
    Returns summary dict.
    """
    results = {"valid": 0, "invalid": 0, "files": []}

    for root, _, files in os.walk(directory):
        for filename in files:
            if filename.endswith((".yaml", ".yml")):
                filepath = os.path.join(root, filename)
                is_valid = validate_file(filepath)
                results["files"].append({"path": filepath, "valid": is_valid})
                if is_valid:
                    results["valid"] += 1
                else:
                    results["invalid"] += 1

    print(f"\n{'='*50}")
    print(f"Validation Summary")
    print(f"Valid   : {results['valid']}")
    print(f"Invalid : {results['invalid']}")
    print(f"Total   : {results['valid'] + results['invalid']}")
    print(f"{'='*50}")

    return results


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python rule_validator.py <rule.yaml>        # validate single file")
        print("  python rule_validator.py <directory>        # validate all rules")
        sys.exit(1)

    target = sys.argv[1]

    if os.path.isfile(target):
        is_valid = validate_file(target)
        sys.exit(0 if is_valid else 1)
    elif os.path.isdir(target):
        results = validate_directory(target)
        sys.exit(0 if results["invalid"] == 0 else 1)
    else:
        print(f"'{target}' is not a valid file or directory")
        sys.exit(1)