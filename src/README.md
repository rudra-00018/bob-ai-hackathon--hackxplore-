# 💻 Eco-Label Vision — Source Code Guide

This directory contains the entire source code for the **Eco-Label Vision** platform, organized into modular, clean sub-packages for backend services, frontend application, machine learning models, and database schema.

---

## 📁 Source Code Organization

```
src/
├── .env.example              # Unified environment configuration template
├── backend/                  # FastAPI Application & AI Inference Services
│   ├── main.py               # REST API endpoints, JWT authentication & app initialization
│   ├── resin_model.py        # EasyOCR resin code detection & polymer mapping
│   ├── ecolabel.db           # SQLite local database
│   ├── requirements.txt      # Python dependencies
│   └── .env.example          # Backend-specific environment template
├── frontend/                 # React 18 + Vite Web Application
│   ├── src/
│   │   ├── components/       # Reusable UI components (Navbar, Scanner, Cards, Modals)
│   │   ├── pages/            # Page views (Home, Scanner, Dashboard, Games, Chat, Municipality)
│   │   ├── hooks/            # Custom React hooks (useSpeechSynthesis, useAuth, etc.)
│   │   ├── context/          # Global application state contexts (AuthContext, ThemeContext)
│   │   ├── services/         # API client & HTTP network requests (api.js, auth.js)
│   │   ├── config/           # App configuration constants
│   │   ├── App.jsx           # Root React router and layout component
│   │   ├── main.jsx          # DOM mount entry point
│   │   └── index.css         # Global Tailwind CSS and glassmorphism styling
│   ├── public/               # Static assets, bin images, and favicon
│   ├── package.json          # Node.js dependencies and build scripts
│   ├── tailwind.config.js    # Tailwind theme & color configurations
│   └── vite.config.js        # Vite bundler configuration & backend API proxy
├── model/                    # Machine Learning Pipeline & Dataset Utilities
│   ├── download_dataset.py   # Automated UCI RealWaste dataset downloader & split generator
│   ├── train.py              # PyTorch MobileNetV3 transfer learning training & eval script
│   ├── model.pth             # Trained PyTorch model weights
│   ├── model_meta.json       # Model metadata, class labels, and normalization stats
│   ├── evaluation_metrics.json # Performance metrics on held-out test split
│   └── confusion_matrix.csv  # Detailed test set confusion matrix
└── database/                 # Relational Database Schema & Migrations
    └── schema.js             # Data model schema definitions for users, scans, and badges
```

---

## 🧩 Subsystem Breakdown

### 1. Backend (`src/backend`)
Built with **FastAPI** for asynchronous, high-speed API performance:
- **`main.py`**: Handles incoming image requests via `/predict`, applies image transforms, invokes the PyTorch model, coordinates with `resin_model.py`, computes CO₂ offsets, logs scans into SQLite, and provides JWT-protected endpoints for citizen and municipal dashboards.
- **`resin_model.py`**: Utilizes **EasyOCR** to detect Resin Identification Codes (RIC 1 through 7: PET, HDPE, PVC, LDPE, PP, PS, OTHER) on plastic packaging and yields granular recyclability verdicts.
- **Key API Routes:**
  - `POST /predict`: Accepts image file upload, runs MobileNetV3 + OCR pipeline, returns full classification & guidance JSON.
  - `POST /auth/signup`, `POST /auth/login`, `GET /auth/me`: User authentication and role issuance.
  - `GET /history`, `GET /stats`: Historical scans and carbon savings aggregation.
  - `GET /municipality/dashboard`, `GET /municipality/users`: Urban-level waste analytics and leaderboards.
  - `POST /chat`: Gemini AI / local fallback sustainability guidance chatbot.
  - `GET /health`: Health check and model readiness status.

### 2. Frontend (`src/frontend`)
Built with **React 18**, **Vite**, and **Tailwind CSS**:
- **Interactive Scanner:** Live camera feed, snapshot capture, drag-and-drop file upload, real-time confidence bars, top-3 candidates, and automatic Web Speech API voice guidance.
- **Citizen Dashboard:** Real-time metrics for total scans, CO₂ emissions averted, streak counter, XP progress bar, unlocked badges, and Recharts breakdown graphs.
- **Gamification Suite:**
  - *Bin Guessing Game:* Drag-and-drop item sorting with confetti feedback and instant accuracy validation.
  - *Waste Catcher Game:* Reflex mini-game catching falling recyclable items into the matching bin.
- **AI Chatbot:** Responsive conversational drawer answering recycling queries with step-by-step upcycling ideas.
- **Recycling Locator:** Interactive Leaflet / OpenStreetMap visualizer searching for nearby municipal sorting and e-waste facilities via the Overpass API.
- **Municipality Portal:** High-level dashboard with city-wide recycling purity, material distributions, and top recyclers.

### 3. Model Pipeline (`src/model`)
- **Dataset:** UCI RealWaste dataset (4,752 images across 9 classes: *Cardboard, Food Organics, Glass, Metal, Miscellaneous Trash, Paper, Plastic, Textile Trash, Vegetation*).
- **Architecture:** `MobileNetV3-Small` pre-trained on ImageNet-1K with a custom classification head.
- **Class Balancing:** `WeightedRandomSampler` applied to address minor class imbalances.
- **Measured Test Metrics (Held-out 15% split):**
  - **Accuracy:** `80.39%`
  - **Macro F1-Score:** `81.27%`
  - **Weighted F1-Score:** `79.98%`
  - **Inference Speed:** `~23.6 ms` per image on standard CPU.

---

## 🚀 Quick Launch

### Backend
```bash
cd src/backend
python -m pip install -r requirements.txt
python main.py
```

### Frontend
```bash
cd src/frontend
npm install
npm run dev
```

### Model Re-training
```bash
cd src
python model/download_dataset.py
python model/train.py --epochs 10 --batch-size 32
```
