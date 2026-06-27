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

    # Run all checks
    vulnerabilities += await check_security_headers(target_url)
    vulnerabilities += await check_ssl(target_url)
    vulnerabilities += await check_xss(target_url)
    vulnerabilities += await check_sensitive_files(target_url)

    # Send results to Next.js API
    async with httpx.AsyncClient() as client:
        await client.post(
            f"{NEXT_APP_URL}/api/scan/results",
            json={
                "scanId": scan_id,
                "vulnerabilities": vulnerabilities,
            }
        )

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