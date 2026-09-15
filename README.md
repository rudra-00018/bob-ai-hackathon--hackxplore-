# ♻️ Eco-Label Vision: AI-Powered Circular Economy Smart Bin Assistant

> **Snap. Classify. Guide. Reward. Transform Waste into Value.**

---

## 👥 Team

| Field | Value |
|---|---|
| **Team Name** | EcoVision Innovators |
| **Track** | Sustainability |
| **Team Lead** | Anvi Shah |
| **Members** | Rudra Ghataliya , Anshika Badala , Margish Sojitra|

---

## 🎯 Problem Statement

Improper waste disposal and **wish-cycling** (tossing non-recyclable items into recycling bins hoping they will be recycled) cause severe contamination in municipal recycling streams, resulting in thousands of tons of recyclable materials ending up in landfills. Everyday consumers lack immediate, actionable guidance on item-specific disposal and plastic resin identification (RIC 1–7) at the point of disposal, while municipalities lack real-time visibility into urban waste segregation patterns.

---

## 💡 Solution

**Eco-Label Vision** is a full-stack smart waste assistant and urban circular economy platform. It utilizes a **MobileNetV3-Small** deep learning model trained on the UCI RealWaste dataset alongside **EasyOCR resin code detection** to instantly classify waste, identify polymer types, calculate CO₂ emissions averted, provide voice-guided disposal instructions, reward eco-positive actions through gamification, and aggregate actionable insights for municipal authorities.

```
Camera / Upload → MobileNetV3 AI Classifier → EasyOCR Resin Code Reader → Circular Decision Engine → Voice Guidance + XP Rewards + Municipal Analytics
```

---

## ✨ Key Features

- **🤖 Real-Time AI Waste Classifier:** Classifies waste into 9 distinct categories (*Cardboard, Food Organics, Glass, Metal, Miscellaneous Trash, Paper, Plastic, Textile Trash, Vegetation*) with top-3 confidence scores in ~24ms.
- **🔍 OCR Plastic Resin Code Identifier:** Automatically extracts Resin Identification Codes (RIC 1–7: PET, HDPE, PVC, LDPE, PP, PS, Other) to determine exact plastic recyclability and contamination risks.
- **🌱 Carbon Impact & Disposal Guidance:** Calculates real-time CO₂ savings per item, assigns appropriate disposal bins, and reads step-by-step instructions aloud via the Web Speech API.
- **🎮 Circular Gamification Hub:** Citizens earn XP, level up, unlock achievement badges, maintain daily streaks, and play interactive games (*Bin Guessing* and *Waste Catcher*).
- **🗺️ Geospatial Recycling Center Finder:** Locates nearby recycling and drop-off facilities using OpenStreetMap and the Overpass API with category-based filtering.
- **💬 AI Sustainability Chatbot:** Interactive assistant powered by Gemini AI with robust local fallback logic to answer nuanced disposal and upcycling questions.
- **🏙️ Municipality Intelligence Dashboard:** City-wide analytics on recycling rates, waste category distribution, carbon reduction milestones, and citizen leaderboards.

---

## 🛠️ Tech Stack

| Category | Technologies |
|---|---|
| **Languages** | Python 3.10+, JavaScript (ES6+), SQL |
| **Frontend Framework & UI** | React 18, Vite, Tailwind CSS, Framer Motion, Recharts, Lucide React, React-Leaflet, Canvas Confetti |
| **Backend Framework** | FastAPI, Uvicorn, Pydantic, Python-Jose (JWT), Passlib (Bcrypt) |
| **Machine Learning & OCR** | PyTorch, torchvision (MobileNetV3-Small), EasyOCR, NumPy, Pillow |
| **IBM Technologies & Tools** | IBM Bob AI Assistant, watsonx.ai-ready Model Architecture, IBM Cloud deployment blueprints |
| **Database & Storage** | SQLite, SQLAlchemy ORM |
| **APIs & Integrations** | Web Speech API, OpenStreetMap / Overpass API, Google Gemini AI API |

---

## 📁 Repository Structure

```
├── submission.yaml          # Evaluator-ready structured hackathon metadata
├── README.md                # Human-readable project documentation entry point
├── CONTRIBUTING.md          # Submission and contribution instructions
├── docs/                    # Complete architectural and technical documentation
│   ├── problem-statement.md # Detailed domain context and pain point analysis
│   ├── solution-overview.md # End-to-end mechanism and circular economy mapping
│   ├── architecture.md      # Mermaid system diagrams and data flow specifications
│   ├── setup-guide.md       # Exact step-by-step local environment setup
│   └── template-guide.md    # Hackathon template reference
├── demo/                    # Demo artifacts and verification links
│   ├── demo-video-link.txt  # Link to 3-minute video demonstration
│   ├── live-demo-url.txt    # Deployment / local runtime details
│   └── screenshots/         # UI screenshots catalog and walkthrough
│       └── README.md
├── presentation/            # Slide deck and presentation materials
│   ├── slides.pptx          # Complete project slide deck
│   └── README.md            # Slide structure and narrative guide
└── src/                     # All application source code
    ├── .env.example         # Unified environment variable template
    ├── README.md            # Source code directory overview and module breakdown
    ├── backend/             # FastAPI application and AI inference services
    │   ├── main.py          # REST API endpoints, JWT auth, and routing
    │   ├── resin_model.py   # EasyOCR resin code detection module
    │   ├── ecolabel.db      # SQLite database
    │   └── requirements.txt # Python dependencies
    ├── frontend/            # React 18 + Vite frontend application
    │   ├── src/             # Components, pages, hooks, and contexts
    │   ├── public/          # Static assets and bin illustration graphics
    │   ├── package.json     # Node.js dependencies and scripts
    │   └── vite.config.js   # Vite build configuration and proxy setup
    ├── model/               # Machine learning training and evaluation pipeline
    │   ├── download_dataset.py # Automated UCI RealWaste dataset ingestion
    │   ├── train.py         # PyTorch MobileNetV3 transfer learning pipeline
    │   ├── model.pth        # Saved model weights
    │   ├── model_meta.json  # Class names and preprocessing parameters
    │   └── evaluation_metrics.json # Test split accuracy (80.39%) and F1 scores
    └── database/            # Database schema definitions and SQL migrations
        └── schema.js        # Relational schema reference
```

---

## ⚡ How to Run

> For detailed instructions, prerequisites, and troubleshooting, refer to [`docs/setup-guide.md`](docs/setup-guide.md).

### 1. Backend Setup

```bash
cd src/backend
python -m pip install -r requirements.txt
cp .env.example .env
python main.py
```
*Backend runs on `http://localhost:8000` (Interactive API docs at `http://localhost:8000/docs`).*

### 2. Frontend Setup

```bash
cd src/frontend
npm install
npm run dev
```
*Frontend runs on `http://localhost:3000` (proxies `/api` requests to backend on port 8000).*

### 3. (Optional) Model Training & Evaluation

```bash
cd src
# Download UCI RealWaste dataset and create stratified splits:
python model/download_dataset.py

# Train MobileNetV3 transfer learning model:
python model/train.py

# Evaluate checkpoint on held-out test set:
python model/train.py --evaluate-only
```

---

## 🖥️ Demo & Verification

| Artifact | Link / Location |
|---|---|
| 🌐 **Live Demo** | [Launch Live Demo](https://bob-ai-hackathon-hackxplore.vercel.app/app) |
| 🖼️ **Screenshots** | [View Screenshots Catalog](demo/screenshots/README.md) |
| 📊 **Presentation Deck** | [presentation/slides.pptx](presentation/slides.pptx) |

---

## ⚠️ Known Limitations

- **Single-Object Dominant View:** The classifier is optimized for single waste items centered in the camera frame; dense multi-object clutter will require future YOLO-based bounding box segmentation.
- **Lighting Sensitivity for OCR:** Transparent or heavily crumpled plastic containers with faint stamped resin logos require adequate lighting for optimal OCR extraction.
- **Hardware Integration:** IoT weight-sensing smart bin physical hardware integration is architected in software but currently simulated via browser webcam interactions.

---

## 🏅 What We're Most Proud Of

1. **Dual AI Pipeline (CV + OCR):** Combining MobileNetV3 visual classification with EasyOCR resin identification to overcome the common pitfall where all plastics look similar visually but have vastly different chemical recyclabilities (e.g., PET #1 vs PVC #3 vs PS #6).
2. **End-to-End Behavioral Loop:** Turning mundane waste disposal into an engaging, rewarded habit with gamification, voice guidance, and tangible carbon footprint savings.
3. **Dual-Stakeholder Architecture:** Delivering direct value to both individual citizens (smart assistant, gamified rewards) and municipal policymakers (city-wide waste analytics, contamination metrics).
