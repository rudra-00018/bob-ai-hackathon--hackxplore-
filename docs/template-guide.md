# Eco-Label Vision — Project Guide

This guide provides a complete reference for navigating, understanding, and contributing to the **Eco-Label Vision** repository — an AI-powered circular economy smart bin assistant built for the Bob AI Innovation Hackathon (Sustainability track).

---

## Table of Contents

1. [Repository Overview](#1-repository-overview)
2. [Repository Structure](#2-repository-structure)
3. [Key Files Reference](#3-key-files-reference)
4. [Running the Project](#4-running-the-project)
5. [Submission Artefacts](#5-submission-artefacts)
6. [Evaluation Criteria Mapping](#6-evaluation-criteria-mapping)
7. [Team](#7-team)

---

## 1. Repository Overview

| Field | Value |
|---|---|
| **Project Name** | Eco-Label Vision |
| **Track** | Sustainability |
| **Team** | EcoVision Innovators |
| **Live Demo** | [https://bob-ai-hackathon-hackxplore.vercel.app/app](https://bob-ai-hackathon-hackxplore.vercel.app/app) |
| **Primary Language** | Python 3.10+, JavaScript (ES6+) |
| **Core AI Models** | MobileNetV3-Small (PyTorch), EasyOCR |

---

## 2. Repository Structure

```
bob-ai-hackathon--hackxplore-/
│
├── submission.yaml              ← Structured metadata — read by evaluators first
├── README.md                    ← Human-readable project overview
├── CONTRIBUTING.md              ← Contribution and submission instructions
│
├── src/                         ← All application source code
│   ├── .env.example             ← Unified environment variable template
│   ├── README.md                ← Source code directory breakdown
│   ├── backend/                 ← FastAPI application + AI inference services
│   │   ├── main.py              ← REST API, JWT auth, ML orchestration
│   │   ├── resin_model.py       ← EasyOCR resin code detection module
│   │   ├── ecolabel.db          ← SQLite database
│   │   ├── requirements.txt     ← Python dependencies
│   │   ├── Procfile             ← Process definition for cloud deployment
│   │   └── render.yaml          ← Render / IBM Cloud Code Engine deployment config
│   ├── frontend/                ← React 18 + Vite web application
│   │   ├── src/
│   │   │   ├── components/      ← Reusable UI components
│   │   │   ├── pages/           ← Scanner, Dashboard, Games, Chat, Municipality
│   │   │   ├── hooks/           ← useSpeechSynthesis, useAuth, etc.
│   │   │   ├── context/         ← AuthContext, ThemeContext
│   │   │   └── services/        ← API client (api.js, auth.js)
│   │   ├── package.json         ← Node.js dependencies
│   │   └── vite.config.js       ← Vite config + backend proxy
│   ├── model/                   ← ML training and evaluation pipeline
│   │   ├── model.pth            ← Trained MobileNetV3-Small weights
│   │   ├── model_meta.json      ← Class names and normalisation stats
│   │   ├── train.py             ← PyTorch training + evaluation script
│   │   ├── download_dataset.py  ← UCI RealWaste dataset downloader
│   │   └── evaluation_metrics.json ← Test accuracy 80.39%, F1 81.27%
│   └── database/
│       └── schema.js            ← Relational schema reference
│
├── docs/                        ← Written documentation
│   ├── problem-statement.md     ← Domain context, affected stakeholders, gap analysis
│   ├── solution-overview.md     ← Mechanism, design decisions, IBM tech usage
│   ├── architecture.md          ← Mermaid diagrams, component table, data flow, API reference
│   ├── setup-guide.md           ← Step-by-step local setup and troubleshooting
│   └── template-guide.md        ← This file — repo navigation guide
│
├── demo/                        ← Demo artefacts
│   ├── live-demo-url.txt        ← Vercel deployment URL
│   ├── demo-video-link.txt      ← Demo video reference
│   └── screenshots/             ← App screenshots catalogue
│       └── README.md
│
└── presentation/                ← Slide deck
    ├── slides.pptx
    └── README.md
```

---

## 3. Key Files Reference

### `submission.yaml`
The structured metadata file read first by evaluators. Contains team info, problem statement, solution summary, key features, tech stack, and artefact locations. See the file directly for the complete filled-in content.

### `src/backend/main.py`
The core of the application. Key responsibilities:
- FastAPI app initialisation and CORS configuration
- JWT authentication endpoints (`/auth/signup`, `/auth/login`, `/auth/me`)
- `POST /predict` — receives image, runs MobileNetV3 + OCR pipeline, returns classification JSON
- `POST /chat` — Gemini AI / local fallback chatbot
- Municipality dashboard aggregation endpoints
- SQLAlchemy ORM models and database session management

### `src/backend/resin_model.py`
Standalone EasyOCR module. Accepts a PIL Image, scans for RIC digit patterns (1–7), and returns the polymer name, full name, and recyclability verdict.

### `src/model/model.pth`
Pre-trained MobileNetV3-Small weights. Loaded once at backend startup. Classifies waste into 9 categories: Cardboard, Food Organics, Glass, Metal, Miscellaneous Trash, Paper, Plastic, Textile Trash, Vegetation.

### `src/frontend/src/pages/`
Each page is a self-contained React component:
- `Scanner.jsx` — camera/upload UI, confidence bars, voice guidance trigger
- `Dashboard.jsx` — citizen XP, streaks, badges, scan history, CO₂ charts
- `Municipality.jsx` — city-wide analytics portal
- `Chat.jsx` — AI sustainability chatbot drawer
- `Games.jsx` — Bin Guessing and Waste Catcher mini-games
- `Locator.jsx` — Leaflet map with Overpass API recycling centre search

---

## 4. Running the Project

Full step-by-step instructions are in [`setup-guide.md`](setup-guide.md). Quick summary:

```bash
# Backend (Python 3.10+)
cd src/backend
pip install -r requirements.txt
cp .env.example .env   # fill in SECRET_KEY
python main.py         # → http://localhost:8000

# Frontend (Node.js 18+) — separate terminal
cd src/frontend
npm install
npm run dev            # → http://localhost:3000
```

Or use the live deployment directly: **[https://bob-ai-hackathon-hackxplore.vercel.app/app](https://bob-ai-hackathon-hackxplore.vercel.app/app)**

---

## 5. Submission Artefacts

| Artefact | Location |
|---|---|
| Source Code | `src/` |
| Setup Guide | `docs/setup-guide.md` |
| Architecture Doc | `docs/architecture.md` |
| Live Demo | [https://bob-ai-hackathon-hackxplore.vercel.app/app](https://bob-ai-hackathon-hackxplore.vercel.app/app) |
| Screenshots | `demo/screenshots/` |
| Presentation | `presentation/slides.pptx` |
| Submission Metadata | `submission.yaml` |

---

## 6. Evaluation Criteria Mapping

| Criterion | Where to Look |
|---|---|
| **Technical Implementation Quality** | `src/backend/main.py`, `src/backend/resin_model.py`, `src/model/train.py`, `src/frontend/src/` |
| **Innovation & Differentiation** | `docs/solution-overview.md` → "What Makes It Different"; dual CV+OCR pipeline in `main.py` |
| **Problem Depth & Vision** | `docs/problem-statement.md` |
| **Working Demo & Functionality** | [Live Demo](https://bob-ai-hackathon-hackxplore.vercel.app/app), `demo/screenshots/` |
| **IBM Bob Integration** | `docs/solution-overview.md` → "IBM Technologies Used"; `submission.yaml` → `ibm_technologies` |
| **Documentation & Reproducibility** | `docs/setup-guide.md`, `src/README.md`, `src/backend/.env.example` |

---

## 7. Team

| Role | Name | Email |
|---|---|---|
| **Team Lead** | Anvi Shah | 25aiml063@charusat.edu.in |
| **Member** | Rudra Ghataliya | 25aiml015@charusat.edu.in |
| **Member** | Anshika Badala | 25aiml002@charusat.edu.in |
| **Member** | Margish Sojitra | 25aiml068@charusat.edu.in |
