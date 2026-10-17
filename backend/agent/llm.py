import json
import os
import re

from . import replay

MODEL = os.getenv("TF_LLM_MODEL", "claude-sonnet-5-5")  # confirm the current model name in your account


def mode():
    if os.getenv("ANTHROPIC_API_KEY") and os.getenv("TF_MODE", "live") != "replay":
        return "live"
    return "replay"


def _parse(text):
    text = re.sub(r"^```(?:json)?|```$", "", text.strip(), flags=re.M).strip()
    try:
        data = json.loads(text)
        return data if isinstance(data, dict) else None
    except ValueError:
        return None


def complete_json(task, payload, system):
    k = replay.key(task, payload)
    if mode() == "live":
        try:
            import anthropic

            msg = anthropic.Anthropic().messages.create(
                model=MODEL, max_tokens=1000,
                system=system + "\nReturn ONLY one JSON object, no other text.",
                messages=[{"role": "user", "content": json.dumps(payload, default=str)}])
            data = _parse("".join(b.text for b in msg.content if getattr(b, "type", "") == "text"))
            if data is not None and os.getenv("TF_RECORD") == "1":
                replay.put(k, data)
            return data
        except Exception:
            return None
    return replay.get(k)