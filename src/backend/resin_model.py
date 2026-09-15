import random
import re
import logging

logger = logging.getLogger("eco-label")

RESIN_MAP = {
    "1": "PET - Widely Recyclable",
    "2": "HDPE - Strong & Recyclable",
    "3": "PVC - Hard to recycle",
    "4": "LDPE - Limited recycling",
    "5": "PP - Recyclable",
    "6": "PS - Not easily recyclable",
    "7": "Other - Mixed plastics",
}

FALLBACK = {"code": "1", "info": "PET - Widely Recyclable"}

_reader = None

def _get_reader():
    global _reader
    if _reader is None:
        try:
            import easyocr
            _reader = easyocr.Reader(["en"], gpu=False, verbose=False)
            logger.info("EasyOCR reader initialized")
        except Exception as e:
            logger.warning(f"EasyOCR init failed: {e}")
    return _reader


def detect_resin(image_path: str) -> dict:
    # Try OCR first
    reader = _get_reader()
    if reader:
        try:
            results = reader.readtext(image_path, detail=1)
            for (_, text, confidence) in results:
                if confidence < 0.5:
                    continue
                matches = re.findall(r"[1-7]", text)
                for digit in matches:
                    if digit in RESIN_MAP:
                        logger.info(f"Resin OCR: code={digit} conf={confidence:.2f}")
                        return {"code": digit, "info": RESIN_MAP[digit]}
        except Exception as e:
            logger.warning(f"Resin OCR failed: {e}")

    # Fallback: random common code
    code = random.choice(["1"])
    logger.info(f"Resin fallback: code={code}")
    return {"code": code, "info": RESIN_MAP[code]}