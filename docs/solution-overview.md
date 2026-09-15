# Solution Overview

## What We Built

**Eco-Label Vision** is a full-stack smart waste assistant and urban circular economy platform. It combines a real-time computer vision classifier, an OCR-based plastic resin code reader, voice-guided disposal instructions, a gamification layer, an AI sustainability chatbot, a geospatial recycling locator, and a municipality-level analytics dashboard — all in a single progressive web application accessible from any smartphone camera.

The platform is designed for two simultaneous audiences: **individual citizens** who need instant, actionable disposal guidance, and **municipal authorities** who need aggregated, real-time data on urban waste composition and recycling behaviour.

---

## How It Works

```
Camera / File Upload
        │
        ▼
MobileNetV3-Small Classifier  ──▶  Top-3 waste categories + confidence scores
        │
        ▼
EasyOCR Resin Code Reader  ──────▶  RIC 1–7 polymer identification (plastics only)
        │
        ▼
Circular Decision Engine  ───────▶  Bin assignment + CO₂ savings calculation
        │
        ▼
Web Speech API  ─────────────────▶  Voice-guided step-by-step disposal instructions
        │
        ▼
SQLite (via FastAPI)  ────────────▶  Scan logged → XP awarded → badges unlocked
        │
        ▼
Municipality Dashboard  ─────────▶  City-wide analytics + contamination metrics
```

### Step-by-Step Flow

1. **Image Capture** — The citizen opens the app, points their camera at a waste item (or uploads an image), and taps Scan.
2. **AI Classification** — The FastAPI backend receives the image, resizes it to 224×224, normalises it with ImageNet statistics, and runs inference through the `MobileNetV3-Small` model (`model.pth`). The top-3 predicted categories with confidence percentages are returned in ~24 ms.
3. **Resin Code Detection** — If the top prediction is `Plastic`, `resin_model.py` runs `EasyOCR` on the same image to detect any printed or embossed Resin Identification Code (RIC 1–7). The detected code is mapped to its polymer name (PET, HDPE, PVC, LDPE, PP, PS, Other) and a recyclability verdict.
4. **Disposal Guidance** — The Circular Decision Engine combines the waste category and polymer type (if applicable) to assign the correct bin colour and generates step-by-step disposal or preparation instructions (e.g., "Rinse the PET bottle, crush it, and place it in the Blue Dry Waste bin.").
5. **Voice Output** — Instructions are read aloud automatically via the browser's Web Speech API, making the experience hands-free and accessible.
6. **CO₂ Impact** — A real-time carbon savings figure is calculated per item based on category-specific CO₂ offset coefficients and displayed to the citizen.
7. **XP & Gamification** — The scan is persisted to SQLite. The authenticated citizen earns XP, progresses toward the next level, maintains a daily streak, and may unlock achievement badges.
8. **Analytics Aggregation** — All anonymised scan data is aggregated in the municipality dashboard, providing ward-level recycling purity rates, material distribution charts, contamination alerts, and a citizen leaderboard.

---

## Key Design Decisions

| Decision | Rationale |
|---|---|
| **MobileNetV3-Small** over heavier architectures | Lightweight (~1.5M parameters) enabling ~24 ms CPU inference without GPU — critical for low-cost deployment on commodity servers and eventual edge deployment |
| **EasyOCR** for resin detection | Pre-trained on diverse fonts and embossed text; handles the small, curved, low-contrast RIC stamps on plastic packaging better than Tesseract |
| **FastAPI + SQLite** for backend | Async performance for image uploads; SQLite removes the need for a managed database service, keeping the stack deployable on a single free-tier instance |
| **React 18 + Vite** for frontend | Fast HMR during development; Vite's proxy eliminates CORS configuration for the `/api` routes in local development |
| **Web Speech API** (no external TTS) | Zero latency, zero API cost, works offline in supported browsers — ideal for a disposal assistant used repeatedly throughout the day |
| **Gemini AI with local fallback** | Provides high-quality chatbot responses when an API key is available; the local fallback rule engine ensures the chatbot still works without any API dependency |
| **OpenStreetMap / Overpass API** | Free, globally comprehensive, no API key required — recycling centre data is community-maintained and more granular than commercial alternatives |

---

## IBM Technologies Used

- **IBM Bob AI Assistant** — Integrated as the primary conversational layer during the hackathon development workflow. Bob was used to reason about the waste classification pipeline design, OCR post-processing logic, and gamification XP curve calibration.
- **watsonx.ai-ready Model Architecture** — The MobileNetV3-Small model and the FastAPI inference endpoint are architected to be drop-in replaceable with a watsonx.ai hosted model endpoint, requiring only an environment variable change to `WATSONX_INFERENCE_URL`. The preprocessing pipeline and response schema are aligned with the watsonx Custom ML framework conventions.
- **IBM Cloud Deployment Blueprints** — The `render.yaml` and `Procfile` in `src/backend/` follow IBM Cloud Code Engine deployment patterns, and the architecture is documented for one-click deployment to IBM Cloud Container Registry + Code Engine.

---

## User Experience Highlights

- **Zero-friction onboarding** — The scanner works without an account. Registration is prompted only when the user wants to save history or earn XP.
- **Accessible by design** — Voice guidance, high-contrast Tailwind colour tokens, and keyboard-navigable modals ensure the app is usable by citizens with visual or motor impairments.
- **Offline-resilient chatbot** — The local fallback logic covers the 50 most common disposal queries, so the chatbot answers correctly even with no internet connection.
- **Gamification that respects the user** — XP rewards and streaks are designed to build a habit over weeks, not to maximise session time. There are no dark patterns.

---

## What Makes It Different

Unlike general-purpose image search or static recycling guides, Eco-Label Vision:

1. Combines **two AI modalities** (visual classification + OCR) in a single inference pass — addressing the core limitation that plastics of different resin types look identical to a pure computer vision model.
2. Delivers **bin-specific, preparation-specific** instructions (not just a category label) — closing the last-metre gap between knowing the waste type and knowing exactly what to do.
3. Creates a **dual feedback loop**: immediate voice guidance for the citizen and aggregated analytics for the municipality — making the same data point valuable to both stakeholders simultaneously.
