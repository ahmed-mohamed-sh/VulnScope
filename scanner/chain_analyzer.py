import yaml
import os
from groq import Groq
import httpx


class ChainAnalyzer:
    def __init__(self, chains_dir: str = "chains"):
         self.chains_dir = chains_dir
         self.chain_rules = self._load_chains()
         api_key = os.getenv("GROQ_API_KEY")
         if not api_key:
            raise RuntimeError("GROQ_API_KEY environment variable is not set")
         print("KEY EXISTS:", os.getenv("GROQ_API_KEY") is not None)
         print("KEY LENGTH:", len(os.getenv("GROQ_API_KEY", "")))
         print("KEY START:", os.getenv("GROQ_API_KEY", "")[:8])
         self.client = Groq(api_key=api_key)
    def _load_chains(self) -> list:
        """Load all chain rule YAML files."""
        chains = []
        for filename in os.listdir(self.chains_dir):
            if filename.endswith((".yaml", ".yml")):
                filepath = os.path.join(self.chains_dir, filename)
                with open(filepath, "r") as f:
                    try:
                        chain = yaml.safe_load(f)
                        if chain:
                            chains.append(chain)
                    except yaml.YAMLError as e:
                        print(f"Failed to parse chain rule {filepath}: {e}")
        print(f"Loaded {len(chains)} chain rules")
        return chains

    def analyze(self, vulnerabilities: list) -> list:
        """
        Check all chain rules against found vulnerabilities.
        Returns list of detected attack chains.
        """
        if not vulnerabilities:
            return []

        found_categories = set(v.get("category", "").lower() for v in vulnerabilities)
        chains_found = []

        for chain in self.chain_rules:
            requires = chain.get("requires", [])

            # Check if all required categories are present
            matched = all(
                any(req["category"].lower() in cat for cat in found_categories)
                for req in requires
            )

            if matched:
                print(f"Attack chain detected: {chain['name']}")

                # Get the matching vulnerabilities for context
                matching_vulns = []
                for req in requires:
                    for v in vulnerabilities:
                        if req["category"].lower() in v.get("category", "").lower():
                            matching_vulns.append(v)
                            break

                chains_found.append({
                    "id": chain["id"],
                    "name": chain["name"],
                    "severity": chain["severity"],
                    "description": chain["description"].strip(),
                    "attack_steps": chain.get("attack_steps", []),
                    "cvss": chain.get("cvss", 0),
                    "remediation": chain.get("remediation", "").strip(),
                    "involved_vulnerabilities": [v["title"] for v in matching_vulns],
                })

        return chains_found

    async def generate_ai_narrative(self, chain: dict, target_url: str) -> str:
        """Use Groq AI to generate a detailed exploit narrative for the chain."""
        try:
            steps = "\n".join([f"{i+1}. {step}" for i, step in enumerate(chain.get("attack_steps", []))])
            vulns = ", ".join(chain.get("involved_vulnerabilities", []))

            response = self.client.chat.completions.create(
                model="llama-3.3-70b-versatile",
                messages=[
                    {
                        "role": "system",
                        "content": "You are a senior penetration tester writing a concise exploit narrative. Be technical but clear. Max 3 sentences."
                    },
                    {
                        "role": "user",
                        "content": f"""
Target: {target_url}
Attack Chain: {chain['name']}
Vulnerabilities involved: {vulns}
Attack steps:
{steps}

Write a concise 3-sentence exploit narrative explaining how an attacker would execute this chain in the real world.
"""
                    }
                ],
                temperature=0.3,
                max_tokens=200,
            )
            return response.choices[0].message.content.strip()
        except Exception as e:
            print(f"AI narrative generation failed: {e}")
            return chain["description"]