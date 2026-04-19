import easyocr
import cv2
import numpy as np
import os
import pytesseract
from concurrent.futures import ThreadPoolExecutor
from rapidfuzz import fuzz

import pytesseract
import shutil

import shutil

tess_path = shutil.which("tesseract")

if tess_path:
    pytesseract.pytesseract.tesseract_cmd = tess_path
else:
    pytesseract.pytesseract.tesseract_cmd = r"C:\Program Files\Tesseract-OCR\tesseract.exe"
    
reader = easyocr.Reader(['en'], gpu=False)
TESS_CONFIG = r'--oem 3 --psm 6 -c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789./-()' 


def preprocess_image(image_path: str) -> list[str]:
    img = cv2.imread(image_path)
    h, w = img.shape[:2]
    
    scale = min(3.0, max(1.5, 1600 / w))
    img = cv2.resize(img, None, fx=scale, fy=scale, interpolation=cv2.INTER_LANCZOS4)
    gray = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)

    coords = np.column_stack(np.where(gray < 200))
    if len(coords) > 100:
        angle = cv2.minAreaRect(coords)[-1]
        angle = angle if angle > -45 else angle + 90
        if abs(angle) > 0.5:
            M = cv2.getRotationMatrix2D((w*scale/2, h*scale/2), angle, 1.0)
            gray = cv2.warpAffine(gray, M, (int(w*scale), int(h*scale)),
                                  flags=cv2.INTER_CUBIC,
                                  borderMode=cv2.BORDER_REPLICATE)

    paths = []
    base = image_path.replace(".", "_v{}_.")

    # Variant 1: CLAHE (printed + stamped)
    denoised = cv2.fastNlMeansDenoising(gray, h=7)
    clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8,8))
    v1 = clahe.apply(denoised)
    p1 = base.format(1); cv2.imwrite(p1, v1); paths.append(p1)

    # Variant 2: adaptive threshold (handwriting + uneven lighting)
    v2 = cv2.adaptiveThreshold(denoised, 255,
           cv2.ADAPTIVE_THRESH_GAUSSIAN_C, cv2.THRESH_BINARY, 31, 10)
    p2 = base.format(2); cv2.imwrite(p2, v2); paths.append(p2)

    # Variant 3 removed — sharpening adds ~40% time for marginal gain
    v3 = cv2.convertScaleAbs(denoised, alpha=1.8, beta=10)
    _, v3 = cv2.threshold(v3, 140, 255, cv2.THRESH_BINARY)
    p3 = base.format(3); cv2.imwrite(p3, v3); paths.append(p3)
    return paths

TESS_CONFIG = r'--oem 3 --psm 6 -c tessedit_char_whitelist=ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789./-()' 

def run_tesseract(image_path: str) -> list[dict]:
    img = cv2.imread(image_path)
    data = pytesseract.image_to_data(img, config=TESS_CONFIG,
                                      output_type=pytesseract.Output.DICT)
    words = []
    for i, text in enumerate(data['text']):
        text = text.strip()
        conf = int(data['conf'][i])
        if text and conf > 5:
            l, t, w, h = data['left'][i], data['top'][i], data['width'][i], data['height'][i]
            bbox = [[l, t], [l+w, t], [l+w, t+h], [l, t+h]]
            words.append({"text": text, "confidence": conf / 100, "bbox": bbox})
    return words

def process_variant(vpath):
    easy = reader.readtext(vpath, detail=1, paragraph=False,
                           width_ths=0.7, contrast_ths=0.05,
                           adjust_contrast=0.5, text_threshold=0.45,
                           low_text=0.25)
    tess = run_tesseract(vpath)
    return easy, tess

def extract_text(image_path: str) -> dict:
    variants = preprocess_image(image_path)
    all_easy, all_tess = [], []

    # Run both engines on both variants concurrently
    with ThreadPoolExecutor(max_workers=2) as executor:
        futures = [executor.submit(process_variant, vpath) for vpath in variants]
        for f in futures:
            easy, tess = f.result()
            all_easy.extend(easy)
            all_tess.extend(tess)

    words = merge_ocr_results(all_easy, all_tess)

    for vpath in variants:
        if os.path.exists(vpath):
            os.remove(vpath)

    full_text = " ".join(w["text"] for w in words)
    avg_conf = sum(w["confidence"] for w in words) / max(len(words), 1)

    return {"full_text": full_text, "words": words,
            "avg_confidence": round(avg_conf * 100, 2), "trocr_text": ""}

def merge_ocr_results(easy_results, tess_results):
    merged, used = [], set()
    
    # Lower the bar — include low-confidence words, LLM will sort them out
    easy_words = []
    for b, t, c in easy_results:
        if float(c) > 0.1:
            # Convert numpy types to native python types for JSON safety
            clean_bbox = [[int(v) for v in pt] for pt in b]
            easy_words.append({"text": str(t), "confidence": float(c), "bbox": clean_bbox})
    all_words = easy_words + tess_results
    all_words.sort(key=lambda x: -x["confidence"])
    
    for w in all_words:
        text = w["text"].strip()
        if not text or len(text) < 2:
            continue
        # Loosen dedup threshold — cursive reads same word differently each time
        if any(fuzz.ratio(text.lower(), u) > 75 for u in used):
            continue
        merged.append(w)
        used.add(text.lower())
    
    return merged
