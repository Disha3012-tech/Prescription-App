import requests
import os
from dotenv import load_dotenv

load_dotenv()

OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")

if not OPENAI_API_KEY:
    raise ValueError("OPENAI_API_KEY not found in environment variables")


def call_llm(prompt):
    return call_llm_chat([{"role": "user", "content": prompt}])

def call_llm_chat(messages):
    response = requests.post(
        "https://api.openai.com/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {OPENAI_API_KEY}",
            "Content-Type": "application/json"
        },
        json={
            "model": "gpt-4o",
            "messages": messages,
            "temperature": 0.5
        },
        timeout=30
    )

    data = response.json()
    if "choices" in data:
        return data["choices"][0]["message"]["content"]

    raise Exception(f"LLM Error: {data}")
