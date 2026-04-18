import httpx
from rapidfuzz import fuzz
from concurrent.futures import ThreadPoolExecutor, as_completed

cache = {}

def search_rxnorm(term: str) -> list[str]:
    term = term.lower().strip()
    if term in cache:
        return cache[term]
    try:
        resp = httpx.get(
            "https://rxnav.nlm.nih.gov/REST/approximateTerm.json",
            params={"term": term, "maxEntries": 3},  # reduced from 5
            timeout=2  # reduced from 3
        )
        data = resp.json()
        results = [c["name"] for c in data.get("approximateGroup", {}).get("candidate", [])]
        cache[term] = results
        return results
    except:
        cache[term] = []
        return []


def detect_medicines(text: str) -> list[dict]:
    tokens = text.split()
    candidates = []
    seen_matched = set()

    spans = tokens + [f"{tokens[i]} {tokens[i+1]}" for i in range(len(tokens) - 1)]

    SKIP_WORDS = {
        "take", "tablet", "cap", "capsule", "once", "twice", "daily",
        "morning", "night", "before", "after", "food", "water", "days",
        "weeks", "with", "the", "and", "for", "use", "apply", "oral",
        "tab", "mg", "ml", "dr", "rx", "sig", "date", "name", "age",
        "patient", "doctor", "clinic", "hospital", "phone", "address",
        "sign", "stamp", "ref", "page"
    }
    spans = [s for s in spans if s.lower() not in SKIP_WORDS]

    # Cap at 30 spans max — prescriptions rarely have more than 15 medicines
    spans = spans[:30]

    # Fire all RxNorm calls in parallel instead of sequentially
    rxnorm_results = {}
    with ThreadPoolExecutor(max_workers=10) as executor:
        future_to_span = {executor.submit(search_rxnorm, span): span for span in spans}
        for future in as_completed(future_to_span):
            span = future_to_span[future]
            try:
                rxnorm_results[span] = future.result()
            except:
                rxnorm_results[span] = []

    for span in spans:
        clean = span.strip()
        if len(clean) < 4:
            continue
        if clean.replace(".", "").replace("/", "").isdigit():
            continue

        for hit in rxnorm_results.get(span, []):
            score = fuzz.WRatio(clean.lower(), hit.lower())
            if score < 55:
                continue
            hit_lower = hit.lower()
            if hit_lower in seen_matched:
                continue
            candidates.append({
                "raw": clean,
                "matched": hit,
                "score": score,
                "source": "rxnorm"
            })
            seen_matched.add(hit_lower)

    candidates.sort(key=lambda x: -x["score"])
    return candidates
