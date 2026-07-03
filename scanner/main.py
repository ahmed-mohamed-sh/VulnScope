from fastapi import FastAPI
from pydantic import BaseModel
import httpx
import asyncio
import ssl
import socket
from engine import RuleEngine

app = FastAPI()

NEXT_APP_URL = "http://localhost:3000"

# Load engine once at startup — hot reloads rules automatically
engine = RuleEngine(rules_dir="rules")

class ScanRequest(BaseModel):
    scanId: str
    targetUrl: str

@app.post("/scan")
async def run_scan(req: ScanRequest):
    loop = asyncio.get_event_loop()
    loop.create_task(perform_scan(req.scanId, req.targetUrl))
    return {"status": "started"}

@app.post("/reload-rules")
async def reload_rules():
    """Hot-reload all rules without restarting the server."""
    engine.reload_rules()
    return {"status": "reloaded", "rules": len(engine.rules)}

async def perform_scan(scan_id: str, target_url: str):
    vulnerabilities = []
    print(f"Starting scan for {target_url}")

    try:
        # Check SSL separately (needs raw socket, not httpx)
        ssl_vulns = await check_ssl(target_url)

        # Run all YAML rules via engine
        rule_vulns = await asyncio.wait_for(
            engine.run_all_rules(target_url),
            timeout=60
        )

        vulnerabilities = ssl_vulns + rule_vulns

    except asyncio.TimeoutError:
        print(f"Scan timed out for {target_url}")
    except Exception as e:
        print(f"Scan error: {e}")

    print(f"Found {len(vulnerabilities)} vulnerabilities")

    # Send results back to Next.js
    try:

        print(f"Sending results to Next.js...")
        async with httpx.AsyncClient(timeout=30) as client:
            res = await client.post(
                f"{NEXT_APP_URL}/api/scan/results",
                json={
                    "scanId": scan_id,
                    "vulnerabilities": vulnerabilities,
                }
            )
            print(f"Results sent: {res.status_code} - {res.text}")
    except Exception as e:
        print(f"Failed to send results: {type(e).__name__}: {e}")
async def check_ssl(url: str) -> list:
    """SSL check kept separate since it needs raw socket access."""
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