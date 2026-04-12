from app.llm import call_llm
import json

def explain_medicine(medicine: dict, country: str = "India", currency: str = "INR") -> dict:
    med_name = medicine.get("name", "")
    dosage = medicine.get("dosage", "")
    frequency = medicine.get("frequency", "")
    duration = medicine.get("duration", "")
    form = medicine.get("form", "")

    prompt = f"""
You are a friendly medical assistant helping a patient in {country} understand their prescription.

Medicine: {med_name}
Form: {form or 'not specified'}
Dosage: {dosage or 'not specified'}
Frequency: {frequency or 'not specified'}
Duration: {duration or 'not specified'}
Country: {country}
Currency: {currency}

Provide a complete detailed explanation using your knowledge of this medicine as available in {country}.

Return ONLY this JSON. No explanation, no markdown:
{{
  "brand_name": "most common brand name in {country}",
  "generic_name": "generic/chemical name",
  "medicine_class": "drug class e.g. antibiotic, antipyretic",
  "what_it_does": "simple explanation of what this medicine treats",
  "how_to_take": "simple instructions on how to take it",
  "common_side_effects": ["side effect 1", "side effect 2", "side effect 3"],
  "important_warning": "most important warning for this medicine",
  "simple_summary": "one sentence plain language summary",
  "alternatives": [
    {{
      "name": "alternative brand/generic name available in {country}",
      "type": "brand or generic",
      "approximate_price": "approximate price in {currency} if known, else empty string"
    }}
  ],
  "approximate_price": "approximate price of {med_name} in {currency} in {country} if known, else empty string"
}}
"""

    response_text = call_llm(prompt)
    print(f"LLM explain [{med_name}]:", response_text)

    try:
        clean = response_text.strip().strip("```json").strip("```").strip()
        explanation = json.loads(clean)
    except:
        try:
            start = response_text.find("{")
            end = response_text.rfind("}")
            explanation = json.loads(response_text[start:end+1])
        except:
            explanation = {"simple_summary": response_text}

    return {
        "medicine": med_name,
        "form": form,
        "dosage": dosage,
        "frequency": frequency,
        "duration": duration,
        "explanation": explanation
    }
