import os
import yaml
import httpx
import asyncio
import time
from matchers import get_matcher, list_matchers
from rule_validator import validate_rule
from verifier import VulnVerifier
verifier = VulnVerifier()

class RuleEngine:
    def __init__(self, rules_dir: str = "rules"):
        self.rules_dir = rules_dir
        self.rules = self._load_rules()
        self.payloads_cache = {}

    def _load_rules(self) -> list:
        """Load and validate all YAML rule files recursively."""
        rules = []
        skipped = 0

        for root, _, files in os.walk(self.rules_dir):
            for filename in files:
                if filename.endswith((".yaml", ".yml")):
                    filepath = os.path.join(root, filename)
                    with open(filepath, "r") as f:
                        try:
                            rule = yaml.safe_load(f)
                            if not rule:
                                continue

                            errors = validate_rule(rule, filepath)
                            real_errors = [e for e in errors if not e.startswith("⚠️")]

                            if real_errors:
                                print(f"Skipping invalid rule '{filepath}':")
                                for err in real_errors:
                                    print(f"   → {err}")
                                skipped += 1
                                continue

                            rules.append(rule)

                        except yaml.YAMLError as e:
                            print(f"YAML parse error in '{filepath}': {e}")
                            skipped += 1

        print(f"Loaded {len(rules)} rules ({skipped} skipped)")
        return rules

    def _load_payload_file(self, filename: str) -> list:
        """Load a payload file from the payloads directory."""
        if filename in self.payloads_cache:
            return self.payloads_cache[filename]

        filepath = os.path.join("payloads", filename)
        if not os.path.exists(filepath):
            print(f"Payload file not found: {filepath}")
            return []

        with open(filepath, "r") as f:
            payloads = [line.strip() for line in f if line.strip() and not line.startswith("#")]

        self.payloads_cache[filename] = payloads
        return payloads

    async def run_all_rules(self, target_url: str) -> list:
        """Execute all loaded rules against the target URL."""
        findings = []

        try:
            async with httpx.AsyncClient(
                verify=False,
                timeout=8,
                follow_redirects=True,
                headers={"User-Agent": "Mozilla/5.0 (VulnScope Security Scanner)"}
            ) as client:
                try:
                    base_response = await client.get(target_url)
                    print(f"Base URL fetched: {base_response.status_code}")
                except Exception as e:
                    print(f"Failed to fetch base URL: {type(e).__name__}: {e}")
                    return findings

                tasks = [
                    self._execute_rule(rule, target_url, client, base_response)
                    for rule in self.rules
                ]

                results = await asyncio.gather(*tasks, return_exceptions=True)

                raw_findings = []
                for result in results:
                    if isinstance(result, list):
                        raw_findings.extend(result)
                    elif isinstance(result, dict):
                        raw_findings.append(result)
                    elif isinstance(result, Exception):
                        print(f"Rule execution error: {result}")

                # Verify all findings
                print(f"Verifying {len(raw_findings)} findings...")
                verify_tasks = [
                    verifier.verify(finding, target_url)
                    for finding in raw_findings
                ]
                verified = await asyncio.gather(*verify_tasks, return_exceptions=True)

                for result in verified:
                    if isinstance(result, dict):
                        # Only include verified findings OR unverified medium confidence
                        if result.get("verified") or result.get("confidence") == "MEDIUM":
                            findings.append(result)
                        else:
                            print(f"False positive removed: {result.get('title')} — {result.get('verification_note')}")

        except Exception as e:
            print(f"Engine error: {e}")

        print(f"Found {len(findings)} verified vulnerabilities")
        return findings

    async def _execute_rule(self, rule: dict, target_url: str, client: httpx.AsyncClient, base_response) -> list | dict | None:
        """Execute a single rule and return finding(s) if matched."""
        request_cfg = rule.get("request", {})
        matcher_cfg = rule.get("matchers", {})
        info = rule.get("info", {})

        payload_file = request_cfg.get("payloads")
        if payload_file:
            return await self._execute_payload_rule(rule, target_url, client)

        path_template = request_cfg.get("path", "{{BaseURL}}")
        path = path_template.replace("{{BaseURL}}", target_url)
        extra_headers = request_cfg.get("headers", {})

        if path == target_url and not extra_headers:
            response = base_response
            elapsed = 0.0
        else:
            method = request_cfg.get("method", "GET").upper()
            start = time.time()
            try:
                response = await client.request(method, path, headers=extra_headers)
                elapsed = time.time() - start
            except Exception:
                return None

        matched, evidence = await self._run_matcher(matcher_cfg, response, elapsed)

        if matched:
            return self._build_finding(rule, evidence)

        return None

    async def _execute_payload_rule(self, rule: dict, target_url: str, client: httpx.AsyncClient) -> list:
        """Execute a rule that iterates over payloads."""
        request_cfg = rule.get("request", {})
        matcher_cfg = rule.get("matchers", {})

        payload_file = request_cfg.get("payloads")
        payloads = self._load_payload_file(payload_file)

        if not payloads:
            return []

        # Only test first 5 payloads
        payloads = payloads[:5]

        params = request_cfg.get("params", ["q"])
        if isinstance(params, str):
            params = [params]

        # Only test first 2 params
        params = params[:2]

        tasks = []
        for param in params:
            for payload in payloads:
                tasks.append(self._test_payload(rule, target_url, client, param, payload, matcher_cfg))

        results = await asyncio.gather(*tasks, return_exceptions=True)

        for result in results:
            if isinstance(result, dict):
                return [result]

        return []
    async def _test_payload(self, rule: dict, target_url: str, client: httpx.AsyncClient, param: str, payload: str, matcher_cfg: dict):

        try:
            test_url = f"{target_url}?{param}={payload}"
            start = time.time()
            response = await client.get(test_url)
            elapsed = time.time() - start

            matched, evidence = await self._run_matcher(matcher_cfg, response, elapsed)

            if matched:
                finding = self._build_finding(rule, evidence)
                finding["evidence"] = f"Param '{param}' with payload '{payload[:50]}': {evidence}"
                return finding
        except Exception:
            pass
        return None

    async def _run_matcher(self, matcher_cfg: dict, response, elapsed: float = 0.0) -> tuple[bool, str]:
        """Run the appropriate matcher and return (matched, evidence)."""
        matcher_type = matcher_cfg.get("type")

        try:
            matcher_fn = get_matcher(matcher_type)
        except ValueError as e:
            print(f"{e}")
            return False, ""

        if matcher_type.startswith("header"):
            return matcher_fn(dict(response.headers), matcher_cfg)
        elif matcher_type.startswith("body"):
            return matcher_fn(response.text, matcher_cfg)
        elif matcher_type.startswith("status"):
            return matcher_fn(response.status_code, matcher_cfg)
        elif matcher_type.startswith("regex"):
            return matcher_fn(response.text, matcher_cfg)
        elif matcher_type.startswith("time"):
            return await matcher_fn(elapsed, matcher_cfg)

        return False, ""

    def _build_finding(self, rule: dict, evidence: str) -> dict:
        """Build a vulnerability finding dict from a matched rule."""
        info = rule.get("info", {})
        return {
            "title": info.get("name", rule.get("id", "Unknown")),
            "description": info.get("description", ""),
            "severity": info.get("severity", "info").upper(),
            "category": info.get("category", "general"),
            "evidence": evidence,
            "fix": rule.get("fix", "No fix provided."),
        }

    def reload_rules(self):
        """Hot-reload all rules without restarting the server."""
        print("Reloading rules...")
        self.rules = self._load_rules()
        print(f"Reloaded {len(self.rules)} rules")