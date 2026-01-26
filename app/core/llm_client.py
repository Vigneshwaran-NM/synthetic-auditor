"""
Local LLM client using Ollama with GPU optimization.
"""

import ollama
import json
import time
from typing import Dict, Any, List, Optional

from app.core.config import config


class LLMClient:
    """Client for interacting with local LLM via Ollama."""

    def __init__(self):
        self.model = config.LLM_MODEL
        self.timeout = config.LLM_TIMEOUT
        self._verify_connection()

    def _verify_connection(self):
        """
        Verify Ollama is running and the configured model is available.
        Compatible across Ollama SDK versions.
        """
        try:
            response = ollama.list()

            # Handle SDK differences safely
            models = [
                getattr(m, "model", getattr(m, "name", None))
                for m in response.models
            ]
            models = [m for m in models if m]

            if not models:
                raise RuntimeError("Ollama is running but no models are available")

            if self.model not in models:
                print(f"⚠ Warning: Model '{self.model}' not found.")
                print(f"  Available models: {models}")

            print(f"✓ Ollama connected")
            print(f"✓ LLM Model selected: {self.model}")
            print(f"✓ GPU mode: {'Enabled' if self._check_gpu() else 'CPU'}")

        except Exception as e:
            raise ConnectionError(
                f"Failed to connect to Ollama: {e}. Make sure Ollama is running."
            )

    def _check_gpu(self) -> bool:
        """
        Best-effort check for GPU usage.
        Ollama does not expose a direct GPU flag, so this is heuristic.
        """
        try:
            info = ollama.show(self.model)
            details = info.get("details", {})
            return bool(details)
        except Exception:
            return False

    def generate_structured_response(
        self,
        prompt: str,
        system_prompt: str = None,
        temperature: float = 0.2,
        max_tokens: int = 2000
    ) -> Dict[str, Any]:
        """
        Generate a structured response from the LLM.

        Args:
            prompt: User prompt
            system_prompt: System-level instructions
            temperature: Creativity control (lower = safer)
            max_tokens: Maximum response length

        Returns:
            Dict with raw content, extracted JSON, and metadata
        """
        messages = []

        if system_prompt:
            messages.append({"role": "system", "content": system_prompt})

        messages.append({"role": "user", "content": prompt})

        try:
            start_time = time.time()

            response = ollama.chat(
                model=self.model,
                messages=messages,
                options={
                    "temperature": temperature,
                    "num_predict": max_tokens,
                    "top_p": 0.9,
                    "repeat_penalty": 1.1,
                },
                stream=False,
            )

            elapsed = time.time() - start_time
            print(f"LLM inference completed in {elapsed:.2f}s")

            content = response["message"]["content"]
            json_content = self._extract_json(content)

            return {
                "success": True,
                "content": content,
                "json": json_content,
                "raw_response": response,
                "inference_time": elapsed,
            }

        except Exception as e:
            print(f"LLM Error: {e}")
            return {
                "success": False,
                "error": str(e),
                "content": "",
                "json": None,
            }

    def _extract_json(self, text: str) -> Optional[Dict[str, Any]]:
        """
        Extract JSON object from LLM output text.
        """
        import re

        # Extract fenced JSON blocks
        match = re.search(r"```(?:json)?\s*(\{.*?\})\s*```", text, re.DOTALL)
        if match:
            text = match.group(1)

        # Extract first JSON object
        match = re.search(r"(\{.*\})", text, re.DOTALL)
        if match:
            try:
                return json.loads(match.group(1))
            except json.JSONDecodeError:
                return None

        return None

    def validate_against_schema(self, response: Dict[str, Any], schema: Dict[str, type]) -> List[str]:
        """
        Validate extracted JSON against a simple schema.
        """
        errors = []

        data = response.get("json")
        if not data:
            return ["No structured JSON found in LLM output"]

        for field, expected_type in schema.items():
            if field not in data:
                errors.append(f"Missing field: {field}")
            elif not isinstance(data[field], expected_type):
                errors.append(
                    f"Field '{field}' expected {expected_type}, got {type(data[field])}"
                )

        return errors
