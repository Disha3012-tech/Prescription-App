from app.llm import call_llm
import json
from rapidfuzz import fuzz

COUNTRY_SHORTHAND = {
    "India": """
- OD=once daily, BD=twice daily, TDS=three times daily, QID=four times daily
- Q6H=every 6 hours, Q8H=every 8 hours, SOS=as needed, HS=at bedtime
- AC=before food, PC=after food, "x 3d"=for 3 days, "x 5d"=for 5 days
- syp=syrup, tab=tablet, cap=capsule, "250/5"=250mg per 5ml""",
    "USA": """
- QD=once daily, BID=twice daily, TID=three times daily, QID=four times daily
- Q6H=every 6 hours, PRN=as needed, HS=at bedtime, AC=before meals, PC=after meals
- po=by mouth, #30=quantity 30""",
    "UK": """
- OD=once daily, BD=twice daily, TDS=three times daily, QDS=four times daily
- PRN=as needed, nocte=at night, mane=in the morning
- "x 5/7"=for 5 days, "x 2/52"=for 2 weeks, "x 1/12"=for 1 month""",
    "Australia": """
- OD=once daily, BD=twice daily, TDS=three times daily, QID=four times daily
- PRN=as needed, nocte=at night, mane=in the morning""",
    "Canada": """
- OD=once daily, BID=twice daily, TID=three times daily, QID=four times daily
- PRN=as needed, HS=at bedtime, AC=before meals, PC=after meals""",
    "Germany": """
- 1-0-0=morning only, 1-0-1=morning and evening, 1-1-1=three times daily, 0-0-1=evening only
- tgl=daily, wöch=weekly, Tbl=tablet, Kps=capsule, Btl=sachet""",
    "Singapore": """
- OD=once daily, BD=twice daily, TDS=three times daily, QID=four times daily
- PRN=as needed, nocte=at night, stat=immediately""",
    "UAE": """
- OD=once daily, BD=twice daily, TDS=three times daily, QID=four times daily
- PRN=as needed, HS=at bedtime, AC=before food, PC=after food""",
    "South Africa": """
- OD=once daily, BD=twice daily, TDS=three times daily, QID=four times daily
- PRN=as needed, nocte=at night, mane=morning""",
    "Brazil": """
- 1x/dia=once daily, 2x/dia=twice daily, 3x/dia=three times daily
- SN=as needed, ao deitar=at bedtime, em jejum=fasting/before food""",
}

def find_bbox_for_medicine(med_name, ocr_words):
    best_match = None
    best_score = 0
    med_lower = med_name.lower()
    for word in ocr_words:
        score = fuzz.partial_ratio(med_lower, word["text"].lower())
        if score > best_score and score > 60:
            best_score = score
            best_match = word
    return best_match

def structure_medicines(meds, text, country="India", ocr_words=None):
    if not meds:
        return []

    med_names = []
    med_confidence_map = {}
    for m in meds:
        if isinstance(m, dict):
            name = m.get("name", "")
            med_names.append(name)
            med_confidence_map[name] = m.get("confidence", 0.7)
        else:
            med_names.append(m)
            med_confidence_map[m] = 0.7

    # country is already full name e.g. "India", "USA", "UK"
    shorthand = COUNTRY_SHORTHAND.get(country, COUNTRY_SHORTHAND["India"])

    lines = [l.strip() for l in text.replace(",", "\n").split("\n") if l.strip()]
    numbered_lines = "\n".join(f"Line {i+1}: {l}" for i, l in enumerate(lines))

    prompt = f"""
You are a clinical pharmacist extracting structured data from a prescription from {country}.

RAW OCR TEXT (line by line):
---
{numbered_lines}
---

Medicines to structure: {med_names}

Find the line containing each medicine, then extract dosage/frequency/duration FROM THAT LINE.

Prescription shorthand for {country}:
{shorthand}

General format: [form] [medicine] [dose] [frequency] x [duration]
e.g. "syp CALPOL 4ml Q6H x 3d" → dosage=4ml, frequency=every 6 hours, duration=3 days

Fields per medicine:
- name: medicine name (fix minor OCR typos)
- form: syrup / tablet / capsule / drops / injection / cream / ointment
- dosage: e.g. "4 ml", "500 mg", "1 tablet"
- frequency: expand to plain English e.g. "TDS" → "3 times daily", "BID" → "twice daily"
- duration: e.g. "3 days", "5 days", "1 week"

Return ONLY JSON array, no markdown:
[{{
  "name": "Calpol",
  "form": "syrup",
  "dosage": "4 ml",
  "frequency": "every 6 hours",
  "duration": "3 days"
}}]
"""

    response_text = call_llm(prompt)
    print("LLM structurer response:", response_text)

    try:
        clean = response_text.strip().strip("```json").strip("```").strip()
        structured = json.loads(clean)
    except:
        try:
            start = response_text.find("[")
            end = response_text.rfind("]")
            structured = json.loads(response_text[start:end+1])
        except:
            structured = [{"name": m, "form": "", "dosage": "", "frequency": "", "duration": ""}
                         for m in med_names]

    for item in structured:
        name = item.get("name", "")
        item["confidence"] = med_confidence_map.get(name, 0.7)
        item["uncertain"] = med_confidence_map.get(name, 0.7) < 0.6
        if ocr_words:
            bbox_match = find_bbox_for_medicine(name, ocr_words)
            item["bbox"] = bbox_match["bbox"] if bbox_match else None
        else:
            item["bbox"] = None

    return structured
