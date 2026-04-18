from app.llm import call_llm
import json

COUNTRY_BRAND_CONTEXT = {
    "India": "Indian brands: Calpol, Meftal, Delcon, Levolin, Dolo, Combiflam, Zincovit, Ascoril, Grilinctus, Augmentin, Ciplox, Pan, Pantop, Shelcal, Benadryl, Phenergan, Wikoryl, Glycomet, Glyciphage, Karela, Niclosamide, Atorvastatin, Sukolast, Amoxycillin, Metformin, Pantoprazole, Ranitidine, Cetirizine, Montelukast, Azithromycin, Ciprofloxacin, Norfloxacin, Ofloxacin, Levofloxacin, Amlodipine, Losartan, Telmisartan, Atenolol, Metoprolol",
    "USA": "US brands: Tylenol, Advil, Motrin, Zyrtec, Claritin, Benadryl, Zithromax, Augmentin, Amoxil, Prilosec, Nexium, Lipitor, Zocor, Metformin, Glucophage",
    "UK": "UK brands: Panadol, Nurofen, Calpol, Amoxil, Zithromax, Omeprazole, Atorvastatin, Salbutamol, Ventolin, Cetirizine",
    "Australia": "Australian brands: Panadol, Nurofen, Amoxil, Augmentin, Ventolin, Nexium, Lipitor, Telfast, Claratyne",
    "Canada": "Canadian brands: Tylenol, Advil, Amoxil, Biaxin, Prevacid, Lipitor, Glucophage, Ventolin, Reactine",
    "Germany": "German brands: Aspirin, Ibuprofen, Paracetamol, Amoxicillin, Omeprazol, Metformin, Atorvastatin, Pantoprazol",
    "Singapore": "Singapore brands: Panadol, Nurofen, Augmentin, Ventolin, Nexium, Lipitor, Zyrtec, Telfast",
    "UAE": "UAE brands: Panadol, Brufen, Augmentin, Flagyl, Nexium, Lipitor, Ventolin, Zyrtec",
    "South Africa": "South Africa brands: Panado, Nurofen, Augmentin, Zithromax, Ventolin, Nexium, Lipitor",
    "Brazil": "Brazil brands: Tylenol, Buscopan, Amoxicilina, Azitromicina, Omeprazol, Atorvastatina, Metformina",
}

def correct_medicines(meds, text, country="India", trocr_text="", fuzzy_candidates=None):
    country_name = country
    brand_context = COUNTRY_BRAND_CONTEXT.get(country, f"Common brands used in {country}")

    if fuzzy_candidates:
        candidate_lines = [
            f"  - OCR read \"{c['raw']}\" → likely \"{c['matched']}\" (match score: {c['score']})"
            for c in fuzzy_candidates
        ]
        candidates_str = "\n".join(candidate_lines)
    else:
        candidates_str = "  (none found)"

    # Detect which format the prescription likely is
    text_lower = text.lower()
    has_form_prefix = any(kw in text_lower for kw in ["syp", "tab", "cap", "inj", "drops", "oint"])

    if has_form_prefix:
        detection_strategy = """
STRATEGY: This prescription uses form prefixes (syp/tab/cap).
- Scan for lines containing "syp", "tab", "cap", "inj", "drops" — each = one medicine entry.
- The medicine name follows the form prefix on the same line.
- e.g. "syp Calpol 4ml TDS" → medicine is "Calpol"
"""
    else:
        detection_strategy = """
STRATEGY: This is a HANDWRITTEN prescription WITHOUT form prefixes (no syp/tab/cap).
- Do NOT look for syp/tab/cap — they won't be there.
- Instead, scan ALL lines for words that look like medicine names.
- Use the RxNorm candidates heavily — they are your best signal.
- Use your pharmacological knowledge: if an OCR fragment partially resembles a 
  known medicine (even 50% match), include it with appropriate confidence.
- Common patterns in handwritten prescriptions:
  * Medicine name followed by dose: "Glycomet 500 BD"
  * Medicine name followed by frequency: "Atorvastatin — night"  
  * Medicine name on its own line: "Karela tab"
  * Abbreviated names: "Niclos" = Niclosamide, "Atorva" = Atorvastatin
- It is MUCH BETTER to include 6 uncertain medicines than return 0.
"""

    prompt = f"""
You are a clinical pharmacist extracting medicines from a prescription OCR.
This prescription is from: {country_name}

RAW OCR TEXT (your PRIMARY source):
---
{text}
---

RXNORM FUZZY-MATCHED CANDIDATES (strong signal — trust score > 65):
{candidates_str}

{detection_strategy}

KNOWN BRANDS/GENERICS for {country_name}:
{brand_context}

UNIVERSAL RULES:
1. Correct minor OCR typos: "Glyciphge" → "Glyciphage", "Atorvasttn" → "Atorvastatin"
2. Do NOT include: patient name, doctor name, dates, diagnoses, clinic name, addresses
3. Do NOT merge multiple medicines into one entry
4. Include medicines with confidence as low as 0.3 — user will confirm or reject
5. RxNorm candidates with score > 65 should almost always be included

Return ONLY a JSON array, no markdown:
[{{"name": "corrected name", "confidence": 0.0-1.0, "ocr_fragment": "original OCR word(s)"}}]
"""

    response_text = call_llm(prompt)
    print("LLM corrector response:", response_text)

    try:
        clean = response_text.strip().strip("```json").strip("```").strip()
        parsed = json.loads(clean)
        result = []
        for item in parsed:
            if isinstance(item, str):
                result.append({"name": item, "confidence": 0.5, "ocr_fragment": item})
            elif isinstance(item, dict):
                result.append(item)
        return result
    except:
        try:
            start = response_text.find("[")
            end = response_text.rfind("]")
            return json.loads(response_text[start:end+1])
        except:
            return []
