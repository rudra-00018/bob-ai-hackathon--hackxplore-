# Setup Guide

> **This guide covers local development setup. For the live deployed version, visit [https://bob-ai-hackathon-hackxplore.vercel.app/app](https://bob-ai-hackathon-hackxplore.vercel.app/app).**

---

## Prerequisites

Ensure you have the following installed before proceeding:

- [ ] **Python 3.10+** — [python.org/downloads](https://www.python.org/downloads/)
- [ ] **Node.js 18+** and **npm 9+** — [nodejs.org](https://nodejs.org/)
- [ ] **Git** — [git-scm.com](https://git-scm.com/)
- [ ] A modern browser with camera access (Chrome 90+, Firefox 90+, Edge 90+)

> **Optional:** A [Google Gemini API key](https://aistudio.google.com/app/apikey) to enable the AI chatbot's full capabilities. The app runs without it using the built-in local fallback.

---

## 1. Clone the Repository

```bash
git clone https://github.com/rudra-00018/bob-ai-hackathon--hackxplore-.git
cd bob-ai-hackathon--hackxplore-
```

---

## 2. Backend Setup

### 2a. Navigate to the backend directory

```bash
cd src/backend
```

### 2b. (Recommended) Create a virtual environment

```bash
# Windows
python -m venv venv
venv\Scripts\activate

# macOS / Linux
python3 -m venv venv
source venv/bin/activate
```

### 2c. Install Python dependencies

```bash
pip install -r requirements.txt
```

> ⚠️ `EasyOCR` will download its model weights (~100 MB) on the **first run**. This is a one-time download.

### 2d. Configure environment variables

```bash
# Windows
copy .env.example .env

# macOS / Linux
cp .env.example .env
```

Open `.env` and fill in the values:

| Variable | Description | Required |
|---|---|---|
| `SECRET_KEY` | Random string used to sign JWT tokens (any long random string) | Yes |
| `GROQ_API_KEY` | Groq API key for enhanced chatbot responses | No |
| `TOKEN_EXPIRE_HOURS` | JWT token validity in hours (default: `168`) | No |

Example `.env`:
```
SECRET_KEY=change-this-to-a-long-random-secret-string
GROQ_API_KEY=
TOKEN_EXPIRE_HOURS=168
```

### 2e. Start the backend server

```bash
python main.py
```

The backend will start on **`http://localhost:8000`**.

- Interactive API docs (Swagger UI): [http://localhost:8000/docs](http://localhost:8000/docs)
- Health check: [http://localhost:8000/health](http://localhost:8000/health)

Expected output:
```
INFO:     Uvicorn running on http://0.0.0.0:8000 (Press CTRL+C to quit)
INFO:     Application startup complete.
```

---

## 3. Frontend Setup

Open a **new terminal** (keep the backend running).

### 3a. Navigate to the frontend directory

```bash
cd src/frontend
```

### 3b. Install Node.js dependencies

```bash
npm install
```

### 3c. Start the development server

```bash
npm run dev
```

The frontend will start on **`http://localhost:3000`**.

All `/api` requests are automatically proxied to the backend on port `8000` via the Vite proxy configuration in `vite.config.js` — no CORS setup needed.

---

## 4. Verify the Application is Running

1. Open [http://localhost:3000](http://localhost:3000) in your browser.
2. You should see the Eco-Label Vision home page.
3. Navigate to the **Scanner** page.
4. Upload a test image of a plastic bottle, cardboard box, or glass jar.
5. The classification result, disposal guidance, and CO₂ savings should appear within ~2 seconds.
6. If your browser supports speech synthesis, disposal instructions will be read aloud automatically.

---

## 5. (Optional) Model Re-training

If you want to retrain the MobileNetV3 classifier from scratch:

### 5a. Download the UCI RealWaste dataset

```bash
cd src
python model/download_dataset.py
```

This downloads and splits the dataset (~700 MB) into `train/val/test` directories under `src/model/data/`.

### 5b. Train the model

```bash
python model/train.py --epochs 20 --batch-size 32
```

Training progress (loss, accuracy per epoch) is printed to stdout. The best checkpoint is saved to `src/model/model.pth`.

### 5c. Evaluate on the test split

```bash
python model/train.py --evaluate-only
```

Expected output: accuracy ~80.39%, macro F1 ~81.27%.

---

## 6. Project Structure Quick Reference

```
src/
├── backend/
│   ├── main.py            # FastAPI app — run this to start the backend
│   ├── resin_model.py     # EasyOCR resin detection
│   ├── requirements.txt   # Python dependencies
│   └── .env.example       # Environment variable template
├── frontend/
│   ├── src/               # React components, pages, hooks, contexts
│   ├── package.json       # Node dependencies
│   └── vite.config.js     # Dev server + proxy config
└── model/
    ├── model.pth           # Pre-trained model weights (used by backend)
    ├── model_meta.json     # Class names and normalisation parameters
    └── train.py            # Training script
```

---

## 7. Troubleshooting

| Issue | Cause | Solution |
|---|---|---|
| `ModuleNotFoundError` on backend start | Dependencies not installed | Run `pip install -r requirements.txt` inside the `src/backend/` directory with your virtualenv active |
| EasyOCR download hangs | First-run model download (~100 MB) | Wait for the download to complete; ensure internet access |
| Frontend shows "Network Error" on scan | Backend not running or wrong port | Ensure `python main.py` is running on port 8000 |
| Camera not working in browser | Browser requires HTTPS for `getUserMedia` in production | Use `http://localhost:3000` for local dev; HTTPS is handled automatically on Vercel |
| `sqlite3.OperationalError` | Database file permissions | Ensure `src/backend/ecolabel.db` is writable; delete it to reset (data will be recreated) |
| JWT `401 Unauthorized` | Expired or invalid token | Log out and log back in to obtain a fresh token |
| Chatbot returns generic responses | `GROQ_API_KEY` not set | This is expected — the local fallback handles common questions. Add a Groq key for richer responses |
| Port 3000 already in use | Another process on port 3000 | Change the port in `vite.config.js` or kill the conflicting process |
| Port 8000 already in use | Another process on port 8000 | Change the port in `main.py` (`uvicorn.run(..., port=8001)`) and update `vite.config.js` proxy target |

---

## 8. Live Demo

If you just want to see the app without local setup:

🌐 **[https://bob-ai-hackathon-hackxplore.vercel.app/app](https://bob-ai-hackathon-hackxplore.vercel.app/app)**
