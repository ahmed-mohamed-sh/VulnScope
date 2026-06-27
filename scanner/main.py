from fastapi import FastAPI
from pydantic import BaseModel
import httpx
import asyncio
import os
from datetime import datetime
import ssl
import socket
import re

app = FastAPI()

NEXT_APP_URL = "http://localhost:3000"

class ScanRequest(BaseModel):
    scanId: str
    targetUrl: str

@app.post("/scan")
async def run_scan(req: ScanRequest):
    asyncio.create_task(perform_scan(req.scanId, req.targetUrl))
    return {"status": "started"}

async def perform_scan(scan_id: str, target_url: str):
    vulnerabilities = []

    try:
        checks = await asyncio.gather(
            check_security_headers(target_url),
            check_ssl(target_url),
            check_xss(target_url),
            check_sensitive_files(target_url),
            check_cors(target_url),
            check_open_redirect(target_url),
            check_sqli(target_url),
            check_clickjacking(target_url),
            return_exceptions=True
        )

        for result in checks:
            if isinstance(result, list):
                vulnerabilities += result

    except Exception as e:
        print(f"Scan error: {e}")

    # Always send results back
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            await client.post(
                f"{NEXT_APP_URL}/api/scan/results",
                json={
                    "scanId": scan_id,
                    "vulnerabilities": vulnerabilities,
                }
            )
    except Exception as e:
        print(f"Failed to send results: {e}")

async def check_security_headers(url: str) -> list:
    vulns = []
    try:
        async with httpx.AsyncClient(verify=False, timeout=10) as client:
            res = await client.get(url)
            headers = res.headers

            security_headers = {
                "x-frame-options": ("Missing X-Frame-Options", "HIGH", "Add 'X-Frame-Options: DENY' to prevent clickjacking attacks."),
                "x-content-type-options": ("Missing X-Content-Type-Options", "MEDIUM", "Add 'X-Content-Type-Options: nosniff' to prevent MIME sniffing."),
                "strict-transport-security": ("Missing HSTS Header", "HIGH", "Add 'Strict-Transport-Security' to enforce HTTPS connections."),
                "content-security-policy": ("Missing Content-Security-Policy", "HIGH", "Implement a CSP header to prevent XSS and injection attacks."),
                "referrer-policy": ("Missing Referrer-Policy", "LOW", "Add 'Referrer-Policy' to control referrer information."),
                "permissions-policy": ("Missing Permissions-Policy", "LOW", "Add 'Permissions-Policy' to control browser features."),
            }

            for header, (title, severity, fix) in security_headers.items():
                if header not in headers:
                    vulns.append({
                        "title": title,
                        "description": f"The security header '{header}' is missing from the HTTP response.",
                        "severity": severity,
                        "category": "Headers",
                        "evidence": f"Header '{header}' not found in response headers.",
                        "fix": fix,
                    })
    except Exception as e:
        pass
    return vulns

async def check_ssl(url: str) -> list:
    vulns = []
    try:
        from urllib.parse import urlparse
        parsed = urlparse(url)
        hostname = parsed.hostname
        port = parsed.port or 443

        if parsed.scheme != "https":
            vulns.append({
                "title": "No HTTPS",
                "description": "The target is not using HTTPS, exposing data in transit.",
                "severity": "CRITICAL",
                "category": "SSL",
                "evidence": f"URL scheme is '{parsed.scheme}' instead of 'https'.",
                "fix": "Enable HTTPS with a valid SSL/TLS certificate.",
            })
            return vulns

        ctx = ssl.create_default_context()
        with socket.create_connection((hostname, port), timeout=5) as sock:
            with ctx.wrap_socket(sock, server_hostname=hostname) as ssock:
                cert = ssock.getpeercert()
                protocol = ssock.version()

                if protocol in ["TLSv1", "TLSv1.1", "SSLv2", "SSLv3"]:
                    vulns.append({
                        "title": f"Weak TLS Version: {protocol}",
                        "description": f"The server is using an outdated TLS version ({protocol}).",
                        "severity": "HIGH",
                        "category": "SSL",
                        "evidence": f"Negotiated protocol: {protocol}",
                        "fix": "Upgrade to TLS 1.2 or TLS 1.3.",
                    })
    except Exception:
        pass
    return vulns

async def check_xss(url: str) -> list:
    vulns = []
    xss_payloads = [
        "<script>alert(1)</script>",
        '"><script>alert(1)</script>',
        "javascript:alert(1)",
    ]
    try:
        async with httpx.AsyncClient(verify=False, timeout=10) as client:
            for payload in xss_payloads:
                test_url = f"{url}?q={payload}&search={payload}"
                res = await client.get(test_url)
                if payload in res.text:
                    vulns.append({
                        "title": "Reflected XSS Vulnerability",
                        "description": "User input is reflected in the response without sanitization.",
                        "severity": "HIGH",
                        "category": "XSS",
                        "evidence": f"Payload '{payload}' was reflected in the response.",
                        "fix": "Sanitize and encode all user input before rendering it in the browser.",
                    })
                    break
    except Exception:
        pass
    return vulns

async def check_sensitive_files(url: str) -> list:
    vulns = []
    sensitive_paths = [
        "/.env", "/.git/config", "/config.php",
        "/wp-config.php", "/phpinfo.php", "/admin",
        "/.htaccess", "/backup.sql", "/db.sql",
    ]
    try:
        async with httpx.AsyncClient(verify=False, timeout=10) as client:
            for path in sensitive_paths:
                res = await client.get(f"{url}{path}")
                if res.status_code == 200 and len(res.text) > 0:
                    vulns.append({
                        "title": f"Exposed Sensitive File: {path}",
                        "description": f"The file '{path}' is publicly accessible.",
                        "severity": "CRITICAL",
                        "category": "Exposure",
                        "evidence": f"GET {url}{path} returned HTTP 200",
                        "fix": f"Restrict access to '{path}' or remove it from the web root.",
                    })
    except Exception:
        pass
    return vulns
async def check_cors(url: str) -> list:
    vulns = []
    try:
        async with httpx.AsyncClient(verify=False, timeout=10) as client:
            res = await client.get(url, headers={"Origin": "https://evil.com"})
            acao = res.headers.get("access-control-allow-origin", "")
            acac = res.headers.get("access-control-allow-credentials", "")

            if acao == "*":
                vulns.append({
                    "title": "Wildcard CORS Policy",
                    "description": "The server allows requests from any origin using a wildcard CORS policy.",
                    "severity": "MEDIUM",
                    "category": "CORS",
                    "evidence": f"Access-Control-Allow-Origin: {acao}",
                    "fix": "Restrict CORS to trusted domains instead of using wildcard (*).",
                })
            elif acao == "https://evil.com":
                vulns.append({
                    "title": "Reflected CORS Origin",
                    "description": "The server reflects the attacker-controlled Origin header back in the response.",
                    "severity": "HIGH",
                    "category": "CORS",
                    "evidence": f"Access-Control-Allow-Origin: {acao}, Access-Control-Allow-Credentials: {acac}",
                    "fix": "Validate Origin against a strict whitelist of trusted domains.",
                })
    except Exception:
        pass
    return vulns


async def check_open_redirect(url: str) -> list:
    vulns = []
    redirect_payloads = [
        "https://evil.com",
        "//evil.com",
        "/\\evil.com",
    ]
    params = ["redirect", "url", "next", "return", "returnUrl", "redirect_url", "goto"]
    try:
        async with httpx.AsyncClient(verify=False, timeout=10, follow_redirects=False) as client:
            for param in params:
                for payload in redirect_payloads:
                    test_url = f"{url}?{param}={payload}"
                    res = await client.get(test_url)
                    location = res.headers.get("location", "")
                    if res.status_code in [301, 302, 303, 307, 308] and "evil.com" in location:
                        vulns.append({
                            "title": "Open Redirect Vulnerability",
                            "description": f"The parameter '{param}' can redirect users to arbitrary external URLs.",
                            "severity": "MEDIUM",
                            "category": "Open Redirect",
                            "evidence": f"GET {test_url} → Location: {location}",
                            "fix": "Validate redirect URLs against a whitelist of allowed domains.",
                        })
                        return vulns
    except Exception:
        pass
    return vulns


async def check_sqli(url: str) -> list:
    vulns = []
    payloads = [
        "'",
        "' OR '1'='1",
        "\" OR \"1\"=\"1",
        "' OR 1=1--",
        "1' ORDER BY 1--",
        "' UNION SELECT NULL--",
        "1; DROP TABLE users--",
    ]
    error_signatures = [
        "sql syntax",
        "mysql_fetch",
        "ora-01756",
        "sqlstate",
        "unclosed quotation",
        "syntax error",
        "microsoft ole db",
        "odbc drivers",
        "warning: mysql",
        "postgresql",
        "sqlite",
        "you have an error in your sql",
        "division by zero",
        "supplied argument is not a valid mysql",
        "column count doesn't match",
        "table or view not found",
    ]
    params = ["id", "search", "q", "query", "user", "username", "product", "item", "cat", "artist"]
    try:
        async with httpx.AsyncClient(
            verify=False,
            timeout=15,
            headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"}
        ) as client:
            for param in params:
                for payload in payloads:
                    test_url = f"{url}?{param}={payload}"
                    try:
                        res = await client.get(test_url)
                        body = res.text.lower()
                        for sig in error_signatures:
                            if sig in body:
                                vulns.append({
                                    "title": "SQL Injection Vulnerability",
                                    "description": f"The parameter '{param}' appears vulnerable to SQL injection.",
                                    "severity": "CRITICAL",
                                    "category": "SQLi",
                                    "evidence": f"Payload '{payload}' triggered: '{sig}'",
                                    "fix": "Use parameterized queries or prepared statements.",
                                })
                                return vulns
                    except Exception:
                        continue
    except Exception:
        pass
    return vulns


async def check_clickjacking(url: str) -> list:
    vulns = []
    try:
        async with httpx.AsyncClient(verify=False, timeout=10) as client:
            res = await client.get(url)
            xfo = res.headers.get("x-frame-options", "")
            csp = res.headers.get("content-security-policy", "")

            has_frame_protection = (
                xfo.upper() in ["DENY", "SAMEORIGIN"] or
                "frame-ancestors" in csp.lower()
            )

            if not has_frame_protection:
                vulns.append({
                    "title": "Clickjacking Vulnerability",
                    "description": "The page can be embedded in an iframe, making it vulnerable to clickjacking attacks.",
                    "severity": "MEDIUM",
                    "category": "Clickjacking",
                    "evidence": f"X-Frame-Options: '{xfo or 'not set'}', CSP frame-ancestors: not set",
                    "fix": "Add 'X-Frame-Options: DENY' or CSP 'frame-ancestors none' to prevent framing.",
                })
    except Exception:
        pass
    return vulns