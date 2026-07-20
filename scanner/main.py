from fastapi import FastAPI
from pydantic import BaseModel
import httpx
import asyncio
import ssl
import socket
from engine import RuleEngine
from chain_analyzer import ChainAnalyzer
from exploiter import ExploitationEngine

engine = RuleEngine(rules_dir="rules")
chain_analyzer = ChainAnalyzer(chains_dir="chains")
exploitation_engine = ExploitationEngine()

app = FastAPI()

NEXT_APP_URL = "http://localhost:3000"

# Load engine once at startup — hot reloads rules automatically
engine = RuleEngine(rules_dir="rules")
chain_analyzer = ChainAnalyzer(chains_dir="chains")

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
    attack_chains = []
    print(f"Starting scan for {target_url}")

    try:
        ssl_vulns = await check_ssl(target_url)
        rule_vulns = await asyncio.wait_for(
            engine.run_all_rules(target_url),
            timeout=120
        )
        all_vulns = ssl_vulns + rule_vulns

        # Exploit confirmed vulnerabilities
        print(f"Running exploitation engine on {len(all_vulns)} findings...")
        exploit_tasks = [
            exploitation_engine.exploit(vuln, target_url)
            for vuln in all_vulns
        ]
        vulnerabilities = await asyncio.gather(*exploit_tasks, return_exceptions=True)
        vulnerabilities = [v for v in vulnerabilities if isinstance(v, dict)]

        exploited_count = sum(1 for v in vulnerabilities if v.get("exploited"))
        print(f"Successfully exploited {exploited_count}/{len(vulnerabilities)} vulnerabilities")

        # Run attack chain detection
        if vulnerabilities:
            print(f"Running attack chain analysis...")
            chains = chain_analyzer.analyze(vulnerabilities)
            for chain in chains:
                narrative = await chain_analyzer.generate_ai_narrative(chain, target_url)
                chain["ai_narrative"] = narrative
                attack_chains.append(chain)
            print(f"Found {len(attack_chains)} attack chains")

    except asyncio.TimeoutError:
        print(f"Scan timed out for {target_url}")
    except Exception as e:
        print(f"Scan error: {e}")

    print(f"Found {len(vulnerabilities)} vulnerabilities, {len(attack_chains)} attack chains")

    try:
        print(f"Sending results to Next.js...")
        async with httpx.AsyncClient(timeout=30) as client:
            res = await client.post(
                f"{NEXT_APP_URL}/api/scan/results",
                json={
                    "scanId": scan_id,
                    "vulnerabilities": vulnerabilities,
                    "attackChains": attack_chains,
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