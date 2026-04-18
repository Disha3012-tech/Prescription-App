import requests
import os
from dotenv import load_dotenv
import base64

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

def call_llm_vision(image_path: str, prompt: str) -> str:
    """Send image directly to GPT-4o vision, bypassing OCR."""
    with open(image_path, "rb") as f:
        image_data = base64.b64encode(f.read()).decode("utf-8")
    
    ext = image_path.split(".")[-1].lower()
    media_type = "image/png" if ext == "png" else "image/jpeg"
    
    response = requests.post(
        "https://api.openai.com/v1/chat/completions",
        headers={
            "Authorization": f"Bearer {OPENAI_API_KEY}",
            "Content-Type": "application/json"
        },
        json={
            "model": "gpt-4o",
            "messages": [{
                "role": "user",
                "content": [
                    {
                        "type": "image_url",
                        "image_url": {
                            "url": f"data:{media_type};base64,{image_data}",
                            "detail": "high"
                        }
                    },
                    {
                        "type": "text",
                        "text": prompt
                    }
                ]
            }],
            "temperature": 0.3,
            "max_tokens": 1500
        },
        timeout=60
    )
    
    data = response.json()
    if "choices" in data:
        return data["choices"][0]["message"]["content"]
    
    raise Exception(f"Vision LLM Error: {data}")
