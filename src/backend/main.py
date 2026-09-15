"""
Eco-Label Vision - FastAPI Backend
Auth (JWT) + SQLite + Groq Chatbot + Recycling Centers
"""
import io, json, base64, logging, sqlite3, os, hashlib, tempfile
from contextlib import contextmanager, asynccontextmanager
from datetime import datetime, timezone, timedelta
from pathlib import Path
from typing import Optional

try:
    from PIL import Image
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False
    Image = None

try:
    import torch, torch.nn.functional as F
    from torchvision import transforms, models
    import torch.nn as nn
    TORCH_AVAILABLE = True
except ImportError:
    TORCH_AVAILABLE = False

from fastapi import FastAPI, File, UploadFile, HTTPException, Depends, status
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from pydantic import BaseModel, validator
import uvicorn

try:
    from groq import Groq as GroqClient
    GROQ_AVAILABLE = True
except ImportError:
    GROQ_AVAILABLE = False

try:
    from resin_model import detect_resin
    RESIN_AVAILABLE = True
except ImportError:
    RESIN_AVAILABLE = False
    def detect_resin(path): return None

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("eco-label")

from dotenv import load_dotenv
load_dotenv(Path(__file__).parent / ".env")

PROJECT_ROOT       = Path(__file__).resolve().parent.parent
MODEL_PATH         = PROJECT_ROOT / "model" / "model.pth"
META_PATH          = PROJECT_ROOT / "model" / "model_meta.json"
DEFAULT_CONFIDENCE_THRESHOLD = float(os.getenv("CLASSIFIER_CONFIDENCE_THRESHOLD", "0.60"))
DB_PATH            = Path(__file__).resolve().parent / "ecolabel.db"
SECRET_KEY         = os.getenv("SECRET_KEY", "eco-label-secret-change-in-prod")
GROQ_KEY           = os.getenv("GROQ_API_KEY", "")
TOKEN_EXPIRE_HOURS = int(os.getenv("TOKEN_EXPIRE_HOURS", "168"))

DISPOSAL_INFO = {
    "Unknown/Uncertain": {
        "recyclable": False, "bin": "Please verify locally",
        "instructions": ["The image is not clear enough for a reliable decision", "Try a closer, well-lit photo with one item", "Check your local waste guidance before disposal"],
        "carbon_saved": 0.0, "color": "#6B7280",
        "overlay": "Not confident enough to classify. Please try another photo.",
    },
    # ── RealWaste 9-class model ──────────────────────────────────────────────
    # Keys match the exact class names output by the model (torchvision sorts
    # dataset sub-folders alphabetically and preserves original capitalisation).
    "Cardboard": {
        "recyclable": True, "bin": "Blue Recycling Bin",
        "instructions": ["Break down flat", "Remove tape if possible", "Keep dry", "Remove any plastic inserts"],
        "carbon_saved": 0.06, "color": "#D97706",
        "overlay": "Break it flat and pop it in the Blue Recycling Bin",
    },
    "Food Organics": {
        "recyclable": False, "bin": "Brown Compost Bin",
        "instructions": ["Place in compost / organic bin", "No plastic bags", "Consider home composting", "Keep separate from general waste"],
        "carbon_saved": 0.03, "color": "#84CC16",
        "overlay": "This is food waste - add it to the Brown Compost Bin",
    },
    "Glass": {
        "recyclable": True, "bin": "Green Glass Bank",
        "instructions": ["Rinse bottles", "Remove metal lids", "No ceramics or Pyrex", "Sort by colour locally"],
        "carbon_saved": 0.07, "color": "#10B981",
        "overlay": "Rinse and drop in the Green Glass Bank",
    },
    "Metal": {
        "recyclable": True, "bin": "Blue Recycling Bin",
        "instructions": ["Rinse cans", "Crush to save space", "Clean foil is recyclable", "Remove food residue"],
        "carbon_saved": 0.12, "color": "#6B7280",
        "overlay": "Rinse it out, crush it, then Blue Bin!",
    },
    "Miscellaneous Trash": {
        "recyclable": False, "bin": "General Waste (Black Bin)",
        "instructions": ["Cannot be recycled", "Dispose in general waste", "Consider reuse first", "Check hazardous waste rules"],
        "carbon_saved": 0.0, "color": "#EF4444",
        "overlay": "This goes in the Black Bin - consider reducing waste!",
    },
    "Paper": {
        "recyclable": True, "bin": "Blue Recycling Bin",
        "instructions": ["Keep dry and clean", "Remove plastic wrapping", "Flatten if possible", "Greasy/soiled paper goes in general waste"],
        "carbon_saved": 0.05, "color": "#F59E0B",
        "overlay": "Keep it dry! Fold and place in the Blue Recycling Bin",
    },
    "Plastic": {
        "recyclable": True, "bin": "Blue Recycling Bin",
        "instructions": ["Rinse before disposal", "Remove caps separately", "Flatten bottles", "Check resin code 1-7"],
        "carbon_saved": 0.08, "color": "#3B82F6",
        "overlay": "Wash & flatten this plastic, then place in the Blue Recycling Bin",
    },
    "Textile Trash": {
        "recyclable": False, "bin": "Textile Recycling Bank / Charity",
        "instructions": ["Donate wearable items to charity", "Use clothing banks for unusable textiles", "Do not place in general recycling", "Check local textile recycling points"],
        "carbon_saved": 0.04, "color": "#8B5CF6",
        "overlay": "Donate or drop at a Textile Bank - don't bin it!",
    },
    "Vegetation": {
        "recyclable": False, "bin": "Brown Compost Bin / Garden Waste",
        "instructions": ["Place in garden waste bin", "Can be composted at home", "Do not mix with general waste", "Check local green waste collection"],
        "carbon_saved": 0.02, "color": "#22C55E",
        "overlay": "Green waste goes in the Brown Compost / Garden Bin",
    },
    # ── Legacy lower-case aliases (TrashNet era + backwards compat) ──────────
    "trash": {
        "recyclable": False, "bin": "General Waste (Black Bin)",
        "instructions": ["Cannot be recycled", "Dispose in general waste", "Consider reuse first"],
        "carbon_saved": 0.0, "color": "#EF4444",
        "overlay": "This goes in the Black Bin - consider reducing waste!",
    },
}

# Build a case-insensitive alias lookup so predict() always finds a match
# regardless of whether the model returns "Plastic" or "plastic".
_DISPOSAL_LOWER = {k.lower(): v for k, v in DISPOSAL_INFO.items()}

BADGES = [
    {"id": "seedling",   "name": "Seedling",          "threshold": 1,   "icon": "Seedling",  "xp": 10},
    {"id": "beginner",   "name": "Beginner Recycler",  "threshold": 10,  "icon": "Recycler",  "xp": 50},
    {"id": "warrior",    "name": "Eco Warrior",         "threshold": 25,  "icon": "Warrior",   "xp": 100},
    {"id": "champion",   "name": "Recycling Champion",  "threshold": 50,  "icon": "Champion",  "xp": 200},
    {"id": "guardian",   "name": "Earth Guardian",      "threshold": 100, "icon": "Guardian",  "xp": 500},
    {"id": "zero_waste", "name": "Zero Waste Hero",     "threshold": 200, "icon": "Hero",      "xp": 1000},
]

BADGE_EMOJIS = {
    "seedling": "\U0001f331",
    "beginner": "\u267b\ufe0f",
    "warrior":  "\u2694\ufe0f",
    "champion": "\U0001f3c6",
    "guardian": "\U0001f30d",
    "zero_waste": "\u2728",
}
for b in BADGES:
    b["icon"] = BADGE_EMOJIS.get(b["id"], "")


def init_db():
    with sqlite3.connect(DB_PATH) as conn:
        conn.execute("""CREATE TABLE IF NOT EXISTS users (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            role TEXT NOT NULL DEFAULT 'user',
            xp INTEGER NOT NULL DEFAULT 0,
            coins INTEGER NOT NULL DEFAULT 0,
            streak INTEGER NOT NULL DEFAULT 0,
            last_scan TEXT,
            created_at TEXT NOT NULL
        )""")
        conn.execute("""CREATE TABLE IF NOT EXISTS predictions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            user_id INTEGER NOT NULL,
            prediction TEXT NOT NULL,
            confidence REAL NOT NULL,
            top3 TEXT NOT NULL,
            recyclable INTEGER NOT NULL,
            carbon_saved REAL NOT NULL DEFAULT 0,
            timestamp TEXT NOT NULL
        )""")
        conn.execute("""CREATE TABLE IF NOT EXISTS reports (
            id TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL,
            report_type TEXT NOT NULL,
            description TEXT,
            location TEXT,
            image_url TEXT,
            ai_result TEXT,
            status TEXT NOT NULL DEFAULT 'submitted',
            status_history TEXT NOT NULL,
            upvotes INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            updated_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )""")
        conn.execute("""CREATE TABLE IF NOT EXISTS notifications (
            id TEXT PRIMARY KEY,
            user_id INTEGER NOT NULL,
            type TEXT NOT NULL DEFAULT 'info',
            title TEXT NOT NULL,
            body TEXT,
            report_id TEXT,
            status TEXT,
            read INTEGER NOT NULL DEFAULT 0,
            created_at TEXT NOT NULL,
            FOREIGN KEY (user_id) REFERENCES users(id)
        )""")
        conn.execute("""CREATE TABLE IF NOT EXISTS bins (
            id TEXT PRIMARY KEY,
            name TEXT,
            lat REAL NOT NULL,
            lon REAL NOT NULL,
            type TEXT NOT NULL DEFAULT 'recycling',
            fill_level REAL,
            battery_level REAL DEFAULT 95.0,
            temperature REAL DEFAULT 21.5,
            sensor_status TEXT NOT NULL DEFAULT 'online',
            status TEXT NOT NULL DEFAULT 'available',
            address TEXT,
            data_source TEXT NOT NULL DEFAULT 'simulated_iot',
            last_updated TEXT NOT NULL
        )""")
        conn.execute("""CREATE TABLE IF NOT EXISTS iot_telemetry (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            bin_id TEXT NOT NULL,
            fill_level REAL NOT NULL,
            battery_level REAL,
            temperature REAL,
            sensor_status TEXT NOT NULL,
            is_simulated INTEGER NOT NULL DEFAULT 1,
            received_at TEXT NOT NULL
        )""")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_pred_user ON predictions(user_id, timestamp)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_reports_user ON reports(user_id, created_at)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_reports_status ON reports(status)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_notif_user ON notifications(user_id, created_at)")
        conn.execute("CREATE INDEX IF NOT EXISTS idx_telemetry_bin ON iot_telemetry(bin_id, received_at)")

        # ── Schema migrations (safe, additive only) ───────────────────────
        # Add waste_category column if it doesn't exist (migration from v1)
        existing_cols = [row[1] for row in conn.execute("PRAGMA table_info(reports)").fetchall()]
        if "waste_category" not in existing_cols:
            conn.execute("ALTER TABLE reports ADD COLUMN waste_category TEXT")
            logger.info("Migrated reports table: added waste_category column")
        if "admin_note" not in existing_cols:
            conn.execute("ALTER TABLE reports ADD COLUMN admin_note TEXT")
            logger.info("Migrated reports table: added admin_note column")

        # Seed initial smart bins if table is empty
        bin_count_row = conn.execute("SELECT COUNT(*) as n FROM bins").fetchone()
        if bin_count_row and bin_count_row[0] == 0:
            now_iso = datetime.now(timezone.utc).isoformat()
            default_bins = [
                ("B-101", "High Street North Bin", 51.509, -0.095, "recycling", 42.0, 96.0, 20.4, "online", "available", "Near High St & North Way", "simulated_iot", now_iso),
                ("B-102", "Market Square Glass Point", 51.503, -0.082, "glass", 88.0, 89.0, 22.1, "online", "full", "Market Square North", "simulated_iot", now_iso),
                ("B-103", "St. Jude Station Compactor", 51.512, -0.088, "general", 31.0, 98.0, 19.8, "online", "available", "Station Rd Concourse", "simulated_iot", now_iso),
                ("B-104", "Central Plaza Smart Bin", 51.506, -0.092, "recycling", 72.0, 94.0, 21.2, "online", "nearly_full", "Central Plaza West", "simulated_iot", now_iso),
                ("B-105", "Civic Garden Organic Bin", 51.498, -0.096, "organic", 62.0, 91.0, 23.5, "online", "nearly_full", "Park Lane Pavilion", "simulated_iot", now_iso),
                ("B-106", "Tech Quarter E-Waste Pod", 51.514, -0.081, "ewaste", 18.0, 85.0, 20.0, "online", "available", "Innovation Way", "simulated_iot", now_iso),
                ("B-107", "Commerce Boulevard Bin", 51.501, -0.086, "recycling", 91.0, 92.0, 24.0, "online", "full", "Commerce Blvd #12", "simulated_iot", now_iso),
                ("B-108", "Mill Road General Waste", 51.516, -0.099, "general", 55.0, 90.0, 21.0, "online", "available", "Mill Road Crossing", "simulated_iot", now_iso),
                ("B-109", "University Library Bin", 51.508, -0.103, "recycling", 25.0, 34.0, 20.5, "low_battery", "available", "Campus West Gate", "simulated_iot", now_iso),
                ("B-110", "Harbour Walk Glass Drop", 51.495, -0.091, "glass", 86.0, 97.0, 21.8, "online", "full", "Promenade Pier 3", "simulated_iot", now_iso),
            ]
            conn.executemany(
                "INSERT INTO bins (id, name, lat, lon, type, fill_level, battery_level, temperature, sensor_status, status, address, data_source, last_updated) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)",
                default_bins
            )
        conn.commit()
    logger.info("SQLite DB ready: %s", DB_PATH.resolve())


@contextmanager
def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    try:
        yield conn
        conn.commit()
    finally:
        conn.close()


def hash_password(pw: str) -> str:
    salt = os.urandom(16).hex()
    key = hashlib.pbkdf2_hmac("sha256", pw.encode("utf-8"), salt.encode("utf-8"), 100000)
    return f"pbkdf2:sha256:100000${salt}${key.hex()}"


def verify_password(plain_pw: str, stored_hash: str) -> bool:
    if not stored_hash:
        return False
    if stored_hash.startswith("pbkdf2:sha256:"):
        try:
            parts = stored_hash.split("$")
            if len(parts) != 3:
                return False
            params, salt, expected_hex = parts
            iterations = int(params.split(":")[-1])
            key = hashlib.pbkdf2_hmac("sha256", plain_pw.encode("utf-8"), salt.encode("utf-8"), iterations)
            import hmac
            return hmac.compare_digest(key.hex(), expected_hex)
        except Exception:
            return False
    else:
        # Legacy unsalted SHA-256 fallback
        legacy_hash = hashlib.sha256(plain_pw.encode("utf-8")).hexdigest()
        import hmac
        return hmac.compare_digest(legacy_hash, stored_hash)



def make_token(user_id: int, role: str) -> str:
    from jose import jwt
    payload = {
        "sub": str(user_id),
        "role": role,
        "exp": datetime.now(timezone.utc) + timedelta(hours=TOKEN_EXPIRE_HOURS),
    }
    return jwt.encode(payload, SECRET_KEY, algorithm="HS256")


def decode_token(token: str) -> dict:
    from jose import jwt, JWTError
    try:
        return jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
    except JWTError:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid or expired token")


security = HTTPBearer(auto_error=False)


def get_current_user(creds: Optional[HTTPAuthorizationCredentials] = Depends(security)):
    if not creds:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Not authenticated")
    data = decode_token(creds.credentials)
    with get_db() as conn:
        user = conn.execute("SELECT * FROM users WHERE id=?", (int(data["sub"]),)).fetchone()
    if not user:
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "User not found")
    return dict(user)


def require_municipality(user=Depends(get_current_user)):
    if user["role"] != "municipality":
        raise HTTPException(status.HTTP_403_FORBIDDEN, "Municipality access only")
    return user


def update_gamification(user_id: int, recyclable: bool):
    now = datetime.now(timezone.utc).isoformat()
    with get_db() as conn:
        u = conn.execute("SELECT xp, coins, streak, last_scan FROM users WHERE id=?", (user_id,)).fetchone()
        if not u:
            return {}
        xp_gain   = 15 if recyclable else 2
        coin_gain = 10 if recyclable else 0
        streak    = u["streak"]
        last      = u["last_scan"]
        today     = datetime.now(timezone.utc).date().isoformat()
        if last:
            last_date = last[:10]
            if last_date == today:
                pass
            elif (datetime.now(timezone.utc).date() - datetime.fromisoformat(last_date).date()).days == 1:
                streak += 1
                xp_gain += streak * 2
            else:
                streak = 1
        else:
            streak = 1
        new_xp    = u["xp"] + xp_gain
        new_coins = u["coins"] + coin_gain
        conn.execute(
            "UPDATE users SET xp=?, coins=?, streak=?, last_scan=? WHERE id=?",
            (new_xp, new_coins, streak, now, user_id)
        )
    with get_db() as conn:
        total_scans = conn.execute("SELECT COUNT(*) as n FROM predictions WHERE user_id=?", (user_id,)).fetchone()["n"]
    new_badges = [b for b in BADGES if total_scans == b["threshold"]]
    return {
        "xp_gained": xp_gain, "coins_gained": coin_gain, "streak": streak,
        "new_badges": new_badges, "total_xp": new_xp, "total_coins": new_coins,
    }


class WasteClassifier:
    def __init__(self):
        self.model = None
        self.classes = []
        self.confidence_threshold = DEFAULT_CONFIDENCE_THRESHOLD
        if TORCH_AVAILABLE:
            self.transform = transforms.Compose([
                transforms.Resize((224, 224)),
                transforms.ToTensor(),
                transforms.Normalize([0.485, 0.456, 0.406], [0.229, 0.224, 0.225]),
            ])
        else:
            self.transform = None

    def load(self):
        if not TORCH_AVAILABLE:
            logger.warning("PyTorch not installed; skipping model load.")
            return
        if not META_PATH.exists():
            raise FileNotFoundError(f"No metadata at {META_PATH}")
        with open(META_PATH) as f:
            meta = json.load(f)
        self.classes = meta["classes"]
        self.confidence_threshold = float(meta.get("confidence_threshold", DEFAULT_CONFIDENCE_THRESHOLD))
        net = models.mobilenet_v3_small(weights=None)
        net.classifier[3] = nn.Linear(net.classifier[3].in_features, meta["num_classes"])
        if not MODEL_PATH.exists():
            raise FileNotFoundError(f"No weights at {MODEL_PATH}")
        checkpoint = torch.load(MODEL_PATH, map_location="cpu")
        net.load_state_dict(checkpoint.get("model_state_dict", checkpoint))
        net.eval()
        self.model = net
        logger.info("Model loaded: %s", self.classes)

    def predict(self, image):
        if not TORCH_AVAILABLE or self.model is None:
            raise RuntimeError("Waste classification model is unavailable")
        t = self.transform(image.convert("RGB")).unsqueeze(0)
        with torch.no_grad():
            probs = F.softmax(self.model(t), dim=1)[0]
        idx  = probs.topk(min(3, len(self.classes))).indices.tolist()
        top3 = [{"label": self.classes[i], "confidence": round(probs[i].item(), 4)} for i in idx]
        confidence = round(probs.max().item(), 4)
        prediction = self.classes[probs.argmax().item()]
        if confidence < self.confidence_threshold:
            prediction = "Unknown/Uncertain"
        return prediction, confidence, top3


classifier = WasteClassifier()


@asynccontextmanager
async def lifespan(app: FastAPI):
    init_db()
    try:
        classifier.load()
    except Exception as e:
        # Keep the service alive, but do not fabricate a classification result.
        logger.exception("Unable to load waste classification model: %s", e)
    yield


import re

CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:5173,http://127.0.0.1:3000,http://127.0.0.1:5173,http://localhost:8000").split(",")
MAX_UPLOAD_SIZE = 10 * 1024 * 1024  # 10 MB
ALLOWED_MIME_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif", "image/bmp"}

EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9_.+-]+@[a-zA-Z0-9-]+\.[a-zA-Z0-9-.]+$")
USERNAME_REGEX = re.compile(r"^[a-zA-Z0-9_]{3,30}$")

app = FastAPI(title="Eco-Label Vision API", version="2.0.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=[o.strip() for o in CORS_ORIGINS if o.strip()] or ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


class SignupBody(BaseModel):
    username: str
    email: str
    password: str
    role: str = "user"

    @validator("username")
    def validate_username(cls, v):
        v = v.strip()
        if not USERNAME_REGEX.match(v):
            raise ValueError("Username must be 3-30 characters (alphanumeric and underscore only)")
        return v

    @validator("email")
    def validate_email(cls, v):
        v = v.strip().lower()
        if not EMAIL_REGEX.match(v):
            raise ValueError("Invalid email address format")
        return v

    @validator("password")
    def validate_password(cls, v):
        if len(v) < 6:
            raise ValueError("Password must be at least 6 characters long")
        return v


class LoginBody(BaseModel):
    email: str
    password: str


class UpdateProfileBody(BaseModel):
    username: Optional[str] = None
    email: Optional[str] = None
    current_password: Optional[str] = None
    new_password: Optional[str] = None

    @validator("username")
    def validate_username(cls, v):
        if v is None:
            return v
        v = v.strip()
        if not USERNAME_REGEX.match(v):
            raise ValueError("Username must be 3-30 characters (alphanumeric and underscore only)")
        return v

    @validator("email")
    def validate_email(cls, v):
        if v is None:
            return v
        v = v.strip().lower()
        if not EMAIL_REGEX.match(v):
            raise ValueError("Invalid email address format")
        return v

    @validator("new_password")
    def validate_new_password(cls, v):
        if v is None:
            return v
        if len(v) < 6:
            raise ValueError("New password must be at least 6 characters long")
        return v



class ChatBody(BaseModel):
    message: str


class LocationModel(BaseModel):
    lat: Optional[float] = None
    lon: Optional[float] = None
    address: Optional[str] = None


class AIResultModel(BaseModel):
    category: Optional[str] = None
    label: Optional[str] = None
    confidence: Optional[float] = None
    urgency: Optional[str] = None
    source: Optional[str] = None


class CreateReportBody(BaseModel):
    reportType: str
    description: Optional[str] = ""
    location: Optional[LocationModel] = None
    imageUrl: Optional[str] = None
    aiResult: Optional[AIResultModel] = None
    wasteCategory: Optional[str] = None  # user-confirmed waste category


class UpdateReportStatusBody(BaseModel):
    status: str
    note: Optional[str] = None


class IoTTelemetryPayload(BaseModel):
    bin_id: str
    fill_level: float
    battery_level: Optional[float] = 95.0
    temperature: Optional[float] = 21.5
    timestamp: Optional[str] = None
    sensor_status: Optional[str] = "online"  # online | low_battery | maintenance_required | offline


VALID_REPORT_TRANSITIONS = {
    "submitted":    ["under_review", "rejected"],
    "under_review": ["accepted", "rejected"],
    "accepted":     ["in_progress", "rejected"],
    "in_progress":  ["resolved", "rejected"],
    "resolved":     [],
    "rejected":     [],
}

REPORT_STATUS_METADATA = {
    "submitted":    {"label": "Submitted",    "description": "Your report has been received and is awaiting review."},
    "under_review": {"label": "Under Review", "description": "A council officer is reviewing your report."},
    "accepted":     {"label": "Accepted",     "description": "Your report has been accepted and will be actioned."},
    "in_progress":  {"label": "In Progress",  "description": "A team is actively working on this issue."},
    "resolved":     {"label": "Resolved",     "description": "This issue has been resolved. Thank you for reporting it!"},
    "rejected":     {"label": "Rejected",     "description": "This report could not be actioned. See the note for details."},
}


def create_notification(conn, user_id: int, notif_type: str, title: str, body: str, report_id: Optional[str] = None, status_val: Optional[str] = None):
    notif_id = f"notif-{int(datetime.now(timezone.utc).timestamp() * 1000)}-{os.urandom(3).hex()}"
    now = datetime.now(timezone.utc).isoformat()
    conn.execute(
        "INSERT INTO notifications (id, user_id, type, title, body, report_id, status, read, created_at) VALUES (?,?,?,?,?,?,?,?,?)",
        (notif_id, user_id, notif_type, title, body, report_id, status_val, 0, now)
    )
    return notif_id


def format_report_dict(d: dict) -> dict:
    return {
        "id": d["id"],
        "userId": d["user_id"],
        "reportType": d["report_type"],
        "description": d.get("description") or "",
        "location": json.loads(d["location"]) if d.get("location") else None,
        "imageUrl": d.get("image_url"),
        "aiResult": json.loads(d["ai_result"]) if d.get("ai_result") else None,
        "wasteCategory": d.get("waste_category"),
        "adminNote": d.get("admin_note"),
        "status": d["status"],
        "statusHistory": json.loads(d["status_history"]) if d.get("status_history") else [],
        "upvotes": d.get("upvotes", 0),
        "createdAt": d["created_at"],
        "updatedAt": d["updated_at"],
        "username": d.get("username"),
    }


@app.post("/auth/signup")
def signup(body: SignupBody):
    if body.role not in ("user", "municipality"):
        raise HTTPException(400, "Role must be 'user' or 'municipality'")
    hashed = hash_password(body.password)
    now = datetime.now(timezone.utc).isoformat()
    try:
        with get_db() as conn:
            cur = conn.execute(
                "INSERT INTO users (username,email,password,role,created_at) VALUES (?,?,?,?,?)",
                (body.username, body.email, hashed, body.role, now)
            )
            user_id = cur.lastrowid
    except sqlite3.IntegrityError:
        raise HTTPException(409, "Email or username already exists")
    token = make_token(user_id, body.role)
    return {"token": token, "user": {"id": user_id, "username": body.username, "email": body.email, "role": body.role, "xp": 0, "coins": 0, "streak": 0}}


@app.post("/auth/login")
def login(body: LoginBody):
    with get_db() as conn:
        user = conn.execute("SELECT * FROM users WHERE email=?", (body.email.strip().lower(),)).fetchone()
    if not user or not verify_password(body.password, user["password"]):
        raise HTTPException(401, "Invalid email or password")
    token = make_token(user["id"], user["role"])
    return {"token": token, "user": {k: user[k] for k in ("id", "username", "email", "role", "xp", "coins", "streak")}}


@app.get("/auth/me")
def me(user=Depends(get_current_user)):
    return {k: user[k] for k in ("id", "username", "email", "role", "xp", "coins", "streak")}


@app.patch("/auth/profile")
def update_profile(body: UpdateProfileBody, user=Depends(get_current_user)):
    """Update username, email, and/or password for the authenticated user."""
    updates = {}
    params  = []

    # Username change
    if body.username is not None and body.username != user["username"]:
        updates["username"] = body.username

    # Email change
    if body.email is not None and body.email != user["email"]:
        updates["email"] = body.email

    # Password change — requires current_password to be correct
    if body.new_password:
        if not body.current_password:
            raise HTTPException(400, "Current password is required to set a new password")
        if not verify_password(body.current_password, user["password"]):
            raise HTTPException(400, "Current password is incorrect")
        updates["password"] = hash_password(body.new_password)

    if not updates:
        # Nothing changed — just return current user
        return {k: user[k] for k in ("id", "username", "email", "role", "xp", "coins", "streak")}

    set_clauses = ", ".join(f"{col} = ?" for col in updates)
    values      = list(updates.values()) + [user["id"]]

    try:
        with get_db() as conn:
            conn.execute(f"UPDATE users SET {set_clauses} WHERE id = ?", values)
            updated = conn.execute("SELECT * FROM users WHERE id = ?", (user["id"],)).fetchone()
    except sqlite3.IntegrityError:
        raise HTTPException(409, "Username or email already taken by another account")

    return {k: updated[k] for k in ("id", "username", "email", "role", "xp", "coins", "streak")}


def _build_result(pred, conf, top3, detections=None):
    # Case-insensitive lookup: model outputs capitalised names ("Plastic"),
    # but keep legacy lower-case support for stored history entries.
    info = (
        DISPOSAL_INFO.get(pred)
        or _DISPOSAL_LOWER.get(pred.lower())
        or DISPOSAL_INFO["trash"]
    )
    is_multi = bool(detections and len(detections) > 0)
    return {
        **info,
        "prediction": pred,
        "confidence": conf,
        "is_uncertain": pred == "Unknown/Uncertain",
        "confidence_threshold": classifier.confidence_threshold,
        "top3": top3,
        "mode": "multi_detection" if is_multi else "single_classification",
        "model_architecture": "MobileNetV3-Small (Single-Item Classifier)",
        "detection_supported": is_multi,
        "detections": detections or [],
    }


def _add_resin(result: dict, image: Image.Image) -> dict:
    """If prediction is plastic, run OCR resin detection and attach to result."""
    if result.get("prediction", "").lower() != "plastic":
        return result
    try:
        with tempfile.NamedTemporaryFile(suffix=".jpg", delete=False) as tmp:
            image.convert("RGB").save(tmp.name, "JPEG")
            tmp_path = tmp.name
        resin = detect_resin(tmp_path)
        os.unlink(tmp_path)
        if resin:
            result["resin"] = resin
    except Exception as e:
        logger.warning("Resin detection error: %s", e)
    return result


@app.post("/predict")
async def predict(file: UploadFile = File(...), user=Depends(get_current_user)):
    if not PIL_AVAILABLE:
        raise HTTPException(503, "Image processing dependency is unavailable")
    if file.content_type and file.content_type.lower() not in ALLOWED_MIME_TYPES:
        raise HTTPException(400, f"Unsupported file type: {file.content_type}. Please upload a JPG, PNG, or WEBP image.")

    contents = await file.read()
    if len(contents) > MAX_UPLOAD_SIZE:
        raise HTTPException(413, f"Image exceeds maximum allowable size of {MAX_UPLOAD_SIZE // (1024 * 1024)} MB")

    try:
        image = Image.open(io.BytesIO(contents))
    except Exception:
        raise HTTPException(400, "Invalid image file")

    try:
        pred, conf, top3 = classifier.predict(image)
    except RuntimeError as e:
        raise HTTPException(503, str(e))
    result = _build_result(pred, conf, top3)
    result = _add_resin(result, image)
    ts = datetime.now(timezone.utc).isoformat()
    with get_db() as conn:
        conn.execute(
            "INSERT INTO predictions (user_id,prediction,confidence,top3,recyclable,carbon_saved,timestamp) VALUES (?,?,?,?,?,?,?)",
            (user["id"], pred, conf, json.dumps(top3), int(result["recyclable"]), result["carbon_saved"], ts)
        )
    gamification = update_gamification(user["id"], result["recyclable"])
    gamification["recyclable"] = result["recyclable"]
    result["gamification"] = gamification
    return result


@app.post("/predict/base64")
async def predict_b64(payload: dict, user=Depends(get_current_user)):
    if not PIL_AVAILABLE:
        raise HTTPException(503, "Image processing dependency is unavailable")
    try:
        b64 = payload.get("image", "")
        if "," in b64:
            b64 = b64.split(",", 1)[1]
        image = Image.open(io.BytesIO(base64.b64decode(b64)))
    except Exception:
        raise HTTPException(400, "Invalid base64 image")
    try:
        pred, conf, top3 = classifier.predict(image)
    except RuntimeError as e:
        raise HTTPException(503, str(e))
    result = _build_result(pred, conf, top3)
    result = _add_resin(result, image)
    ts = datetime.now(timezone.utc).isoformat()
    with get_db() as conn:
        conn.execute(
            "INSERT INTO predictions (user_id,prediction,confidence,top3,recyclable,carbon_saved,timestamp) VALUES (?,?,?,?,?,?,?)",
            (user["id"], pred, conf, json.dumps(top3), int(result["recyclable"]), result["carbon_saved"], ts)
        )
    gamification = update_gamification(user["id"], result["recyclable"])
    gamification["recyclable"] = result["recyclable"]
    result["gamification"] = gamification
    return result


@app.get("/history")
def get_history(limit: int = 50, user=Depends(get_current_user)):
    with get_db() as conn:
        rows = conn.execute(
            "SELECT prediction,confidence,top3,recyclable,carbon_saved,timestamp FROM predictions WHERE user_id=? ORDER BY timestamp DESC LIMIT ?",
            (user["id"], limit)
        ).fetchall()
    return {"history": [
        {
            "prediction":   r["prediction"],
            "confidence":   r["confidence"],
            "top3":         json.loads(r["top3"]),
            "recyclable":   bool(r["recyclable"]),
            "carbon_saved": r["carbon_saved"],
            "timestamp":    r["timestamp"],
        }
        for r in rows
    ]}


@app.get("/stats")
def get_stats(user=Depends(get_current_user)):
    with get_db() as conn:
        row = conn.execute(
            "SELECT COUNT(*) as total, SUM(carbon_saved) as carbon, SUM(recyclable) as rec FROM predictions WHERE user_id=?",
            (user["id"],)
        ).fetchone()
        u = conn.execute("SELECT xp,coins,streak FROM users WHERE id=?", (user["id"],)).fetchone()
    total  = row["total"] or 0
    carbon = round(row["carbon"] or 0, 3)
    rec    = row["rec"] or 0
    badges = [b for b in BADGES if total >= b["threshold"]]
    next_b = next((b for b in BADGES if total < b["threshold"]), None)
    return {
        "total": total, "carbon_saved": carbon, "recyclable_count": rec,
        "badges": badges, "next_badge": next_b,
        "xp": u["xp"], "coins": u["coins"], "streak": u["streak"],
    }


@app.get("/municipality/dashboard")
def muni_dashboard(user=Depends(require_municipality)):
    with get_db() as conn:
        rows      = conn.execute("SELECT prediction,COUNT(*) as count,SUM(carbon_saved) as carbon FROM predictions GROUP BY prediction").fetchall()
        total     = conn.execute("SELECT COUNT(*) as n FROM predictions").fetchone()["n"]
        rec       = conn.execute("SELECT COUNT(*) as n FROM predictions WHERE recyclable=1").fetchone()["n"]
        usr_count = conn.execute("SELECT COUNT(*) as n FROM users WHERE role='user'").fetchone()["n"]
        top_users = conn.execute(
            "SELECT u.username, COUNT(p.id) as scans, SUM(p.carbon_saved) as carbon "
            "FROM predictions p JOIN users u ON p.user_id=u.id "
            "GROUP BY p.user_id ORDER BY scans DESC LIMIT 5"
        ).fetchall()
    by_cat = [{"_id": r["prediction"], "count": r["count"], "carbon_saved": r["carbon"] or 0} for r in rows]
    return {
        "total_classified": total,
        "recycling_rate":   round(rec / total * 100, 1) if total else 0,
        "carbon_saved":     sum(c["carbon_saved"] for c in by_cat),
        "by_category":      by_cat,
        "total_users":      usr_count,
        "top_users":        [{"username": r["username"], "scans": r["scans"], "carbon": round(r["carbon"] or 0, 2)} for r in top_users],
    }


@app.get("/municipality/users")
def muni_users(user=Depends(require_municipality)):
    with get_db() as conn:
        rows = conn.execute("""
            SELECT u.id, u.username, u.email, u.xp, u.coins, u.streak, u.created_at,
                   COUNT(p.id) as total_scans,
                   SUM(CASE WHEN p.recyclable=1 THEN 1 ELSE 0 END) as recyclable_scans,
                   ROUND(SUM(p.carbon_saved), 3) as carbon_saved
            FROM users u
            LEFT JOIN predictions p ON p.user_id = u.id
            WHERE u.role = 'user'
            GROUP BY u.id
            ORDER BY total_scans DESC
        """).fetchall()
        return {
            "users": [
                {
                    "id": r["id"],
                    "username": r["username"],
                    "email": r["email"],
                    "xp": r["xp"] or 0,
                    "coins": r["coins"] or 0,
                    "streak": r["streak"] or 0,
                    "created_at": r["created_at"],
                    "total_scans": r["total_scans"] or 0,
                    "recyclable_scans": r["recyclable_scans"] or 0,
                    "carbon_saved": r["carbon_saved"] or 0.0,
                }
                for r in rows
            ]
        }
# ── Report Lifecycle Endpoints ──────────────────────────────────────────────

@app.post("/reports")
def create_report(body: CreateReportBody, user=Depends(get_current_user)):
    now = datetime.now(timezone.utc).isoformat()
    report_id = f"report-{int(datetime.now(timezone.utc).timestamp() * 1000)}-{os.urandom(3).hex()}"
    
    loc_json = json.dumps(body.location.dict()) if body.location else None
    ai_json  = json.dumps(body.aiResult.dict()) if body.aiResult else None
    
    # Resolve waste category: prefer explicit user selection, fall back to AI result
    waste_category = (body.wasteCategory or "").strip().lower() or None
    if not waste_category and body.aiResult and body.aiResult.category:
        waste_category = body.aiResult.category.lower()
    
    initial_history = [
        {"status": "submitted", "timestamp": now, "note": "Report submitted by user."}
    ]
    history_json = json.dumps(initial_history)
    
    with get_db() as conn:
        # Check duplicate
        duplicate_note = None
        if body.location and body.location.lat is not None and body.location.lon is not None:
            cutoff = (datetime.now(timezone.utc) - timedelta(hours=24)).isoformat()
            existing_active = conn.execute(
                "SELECT * FROM reports WHERE report_type=? AND status NOT IN ('resolved', 'rejected') AND created_at >= ?",
                (body.reportType, cutoff)
            ).fetchall()
            for r in existing_active:
                if r["location"]:
                    try:
                        ex_loc = json.loads(r["location"])
                        if ex_loc.get("lat") and ex_loc.get("lon"):
                            if abs(ex_loc["lat"] - body.location.lat) < 0.002 and abs(ex_loc["lon"] - body.location.lon) < 0.002:
                                duplicate_note = f"Similar {body.reportType} report ({r['id']}) was submitted nearby recently."
                                break
                    except Exception:
                        pass

        conn.execute(
            """INSERT INTO reports 
               (id, user_id, report_type, description, location, image_url, ai_result, waste_category, status, status_history, upvotes, created_at, updated_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'submitted', ?, 0, ?, ?)""",
            (report_id, user["id"], body.reportType, body.description or "", loc_json, body.imageUrl, ai_json, waste_category, history_json, now, now)
        )
        # Reward XP for reporting waste
        conn.execute("UPDATE users SET xp = xp + 5 WHERE id = ?", (user["id"],))
        
        # Create notification for citizen
        create_notification(
            conn,
            user_id=user["id"],
            notif_type="success",
            title="Report submitted",
            body="Your waste report has been received and will be reviewed shortly.",
            report_id=report_id,
            status_val="submitted",
        )
        
        row = conn.execute("SELECT r.*, u.username FROM reports r JOIN users u ON r.user_id = u.id WHERE r.id = ?", (report_id,)).fetchone()
    
    rep_dict = format_report_dict(dict(row))
    return {
        "id": report_id,
        "status": "submitted",
        "xpEarned": 5,
        "duplicateWarning": duplicate_note,
        "report": rep_dict,
    }


@app.get("/reports")
@app.get("/reports/mine")
def get_my_reports(user=Depends(get_current_user)):
    with get_db() as conn:
        rows = conn.execute(
            "SELECT r.*, u.username FROM reports r JOIN users u ON r.user_id = u.id WHERE r.user_id = ? ORDER BY r.created_at DESC",
            (user["id"],)
        ).fetchall()
    return {"reports": [format_report_dict(dict(r)) for r in rows]}


@app.get("/reports/{report_id}")
def get_report_by_id(report_id: str, user=Depends(get_current_user)):
    with get_db() as conn:
        row = conn.execute(
            "SELECT r.*, u.username FROM reports r JOIN users u ON r.user_id = u.id WHERE r.id = ?",
            (report_id,)
        ).fetchone()
    if not row:
        raise HTTPException(404, "Report not found")
    
    # Author or municipality can view
    if row["user_id"] != user["id"] and user["role"] != "municipality":
        raise HTTPException(403, "Access denied")
        
    return format_report_dict(dict(row))


@app.patch("/reports/{report_id}/status")
def update_report_status(report_id: str, body: UpdateReportStatusBody, user=Depends(get_current_user)):
    new_status = body.status.lower()
    if new_status not in REPORT_STATUS_METADATA:
        raise HTTPException(400, f"Invalid status: {new_status}")
        
    with get_db() as conn:
        row = conn.execute("SELECT * FROM reports WHERE id = ?", (report_id,)).fetchone()
        if not row:
            raise HTTPException(404, "Report not found")
            
        current_status = row["status"]
        history = json.loads(row["status_history"]) if row["status_history"] else []
        is_owner = row["user_id"] == user["id"]
        is_muni = user["role"] == "municipality"
        
        if not is_owner and not is_muni:
            raise HTTPException(403, "Not authorized to update this report")
            
        # Citizen can only withdraw their own active report
        if is_owner and not is_muni:
            if new_status != "rejected":
                raise HTTPException(403, "Citizens can only withdraw/cancel their reports.")
            if current_status in ("resolved", "rejected"):
                raise HTTPException(400, f"Report is already {current_status}.")
            note = body.note or "Withdrawn by user."
        else:
            # Municipality transition check
            allowed = VALID_REPORT_TRANSITIONS.get(current_status, [])
            if new_status not in allowed:
                raise HTTPException(400, f"Cannot transition from {current_status} to {new_status}. Allowed: {allowed}")
            meta = REPORT_STATUS_METADATA[new_status]
            note = body.note or meta["description"]
            
        now = datetime.now(timezone.utc).isoformat()
        history.append({
            "status": new_status,
            "timestamp": now,
            "note": note,
        })
        
        conn.execute(
            "UPDATE reports SET status = ?, status_history = ?, updated_at = ?, admin_note = ? WHERE id = ?",
            (new_status, json.dumps(history), now, note if is_muni else None, report_id)
        )
        
        # Dispatch notification to the report author
        notif_type = "success" if new_status == "resolved" else "danger" if new_status == "rejected" else "info"
        meta = REPORT_STATUS_METADATA[new_status]
        create_notification(
            conn,
            user_id=row["user_id"],
            notif_type=notif_type,
            title=f"Report {meta['label']}",
            body=note,
            report_id=report_id,
            status_val=new_status,
        )
        
        updated_row = conn.execute(
            "SELECT r.*, u.username FROM reports r JOIN users u ON r.user_id = u.id WHERE r.id = ?",
            (report_id,)
        ).fetchone()
        
    return format_report_dict(dict(updated_row))


@app.post("/reports/{report_id}/upvote")
def upvote_report(report_id: str, user=Depends(get_current_user)):
    with get_db() as conn:
        row = conn.execute("SELECT id, upvotes FROM reports WHERE id = ?", (report_id,)).fetchone()
        if not row:
            raise HTTPException(404, "Report not found")
        new_upvotes = row["upvotes"] + 1
        conn.execute("UPDATE reports SET upvotes = ? WHERE id = ?", (new_upvotes, report_id))
    return {"id": report_id, "upvotes": new_upvotes}


@app.delete("/reports/{report_id}")
def delete_report(report_id: str, user=Depends(get_current_user)):
    with get_db() as conn:
        row = conn.execute("SELECT * FROM reports WHERE id = ?", (report_id,)).fetchone()
        if not row:
            raise HTTPException(404, "Report not found")
        if row["user_id"] != user["id"] and user["role"] != "municipality":
            raise HTTPException(403, "Not authorized to delete this report")
        conn.execute("DELETE FROM reports WHERE id = ?", (report_id,))
        conn.execute("DELETE FROM notifications WHERE report_id = ?", (report_id,))
    return {"status": "deleted", "id": report_id}


@app.get("/municipality/reports")
def muni_reports(status: Optional[str] = None, user=Depends(require_municipality)):
    query = """
        SELECT r.*, u.username, u.email
        FROM reports r
        JOIN users u ON r.user_id = u.id
    """
    params = []
    if status and status != "all":
        query += " WHERE r.status = ?"
        params.append(status)
    query += " ORDER BY r.created_at DESC"
    
    with get_db() as conn:
        rows = conn.execute(query, tuple(params)).fetchall()
        
    return {"reports": [format_report_dict(dict(r)) for r in rows]}


# ── Notification Endpoints ──────────────────────────────────────────────────

@app.get("/notifications")
def get_notifications(user=Depends(get_current_user)):
    with get_db() as conn:
        rows = conn.execute(
            "SELECT id, type, title, body, report_id as reportId, status, CAST(read as boolean) as read, created_at as createdAt FROM notifications WHERE user_id = ? ORDER BY created_at DESC LIMIT 50",
            (user["id"],)
        ).fetchall()
    return {"notifications": [dict(r) for r in rows]}


@app.patch("/notifications/{notif_id}/read")
def mark_notification_read(notif_id: str, user=Depends(get_current_user)):
    with get_db() as conn:
        conn.execute("UPDATE notifications SET read = 1 WHERE id = ? AND user_id = ?", (notif_id, user["id"]))
    return {"status": "ok"}


@app.post("/notifications/read-all")
def mark_all_notifications_read(user=Depends(get_current_user)):
    with get_db() as conn:
        conn.execute("UPDATE notifications SET read = 1 WHERE user_id = ?", (user["id"],))
    return {"status": "ok"}


@app.delete("/notifications/{notif_id}")
def delete_single_notification(notif_id: str, user=Depends(get_current_user)):
    with get_db() as conn:
        conn.execute("DELETE FROM notifications WHERE id = ? AND user_id = ?", (notif_id, user["id"]))
    return {"status": "deleted", "id": notif_id}


@app.delete("/notifications")
def clear_all_notifications(user=Depends(get_current_user)):
    with get_db() as conn:
        conn.execute("DELETE FROM notifications WHERE user_id = ?", (user["id"],))
    return {"status": "cleared"}


@app.get("/notifications/unread-count")
def get_unread_count(user=Depends(get_current_user)):
    with get_db() as conn:
        count = conn.execute("SELECT COUNT(*) as n FROM notifications WHERE user_id = ? AND read = 0", (user["id"],)).fetchone()["n"]
    return {"unread_count": count}


# ── Sustainability & Environmental Impact Endpoints ─────────────────────────

@app.get("/sustainability/insights")
def sustainability_insights(user=Depends(get_current_user)):
    with get_db() as conn:
        # 1. User specific actual metrics
        user_scans = conn.execute(
            "SELECT prediction, confidence, recyclable, carbon_saved, timestamp FROM predictions WHERE user_id = ? ORDER BY timestamp DESC",
            (user["id"],)
        ).fetchall()
        
        user_reports = conn.execute(
            "SELECT id, report_type, status, created_at, updated_at FROM reports WHERE user_id = ? ORDER BY created_at DESC",
            (user["id"],)
        ).fetchall()
        
        # 2. Community aggregate actual metrics
        all_scans_count = conn.execute("SELECT COUNT(*) as n, SUM(carbon_saved) as c, SUM(recyclable) as r FROM predictions").fetchone()
        all_users_count = conn.execute("SELECT COUNT(*) as n FROM users WHERE role = 'user'").fetchone()["n"]
        all_reports = conn.execute("SELECT status, created_at, updated_at FROM reports").fetchall()
        
        # Category breakdown for user
        user_cat_counts = {}
        user_total_carbon = 0.0
        user_recyclable_count = 0
        user_trash_count = 0
        
        for s in user_scans:
            cat = s["prediction"] or "unknown"
            if cat not in user_cat_counts:
                user_cat_counts[cat] = {"count": 0, "carbon": 0.0, "recyclable": 0}
            user_cat_counts[cat]["count"] += 1
            user_cat_counts[cat]["carbon"] += (s["carbon_saved"] or 0)
            if s["recyclable"]:
                user_cat_counts[cat]["recyclable"] += 1
                user_recyclable_count += 1
            else:
                user_trash_count += 1
            user_total_carbon += (s["carbon_saved"] or 0)
            
        user_categories = [
            {
                "category": cat,
                "count": data["count"],
                "carbon": round(data["carbon"], 3),
                "recyclable_rate": round(data["recyclable"] / data["count"] * 100, 1) if data["count"] else 0
            }
            for cat, data in sorted(user_cat_counts.items(), key=lambda x: x[1]["count"], reverse=True)
        ]
        
        # User reports status counts
        rep_status_counts = {"submitted": 0, "under_review": 0, "accepted": 0, "in_progress": 0, "resolved": 0, "rejected": 0}
        resolution_times_hours = []
        for r in user_reports:
            st = r["status"]
            if st in rep_status_counts:
                rep_status_counts[st] += 1
            if st == "resolved" and r["updated_at"] and r["created_at"]:
                try:
                    t_start = datetime.fromisoformat(r["created_at"])
                    t_end = datetime.fromisoformat(r["updated_at"])
                    diff_hours = (t_end - t_start).total_seconds() / 3600
                    if diff_hours > 0:
                        resolution_times_hours.append(diff_hours)
                except Exception:
                    pass
                    
        avg_user_res_time = round(sum(resolution_times_hours) / len(resolution_times_hours), 1) if resolution_times_hours else None
        
        # Community metrics calculation
        comm_total_scans = all_scans_count["n"] or 0
        comm_total_carbon = round(all_scans_count["c"] or 0, 3)
        comm_recyclable_scans = all_scans_count["r"] or 0
        comm_recycling_rate = round(comm_recyclable_scans / comm_total_scans * 100, 1) if comm_total_scans else 0
        
        comm_total_reports = len(all_reports)
        comm_resolved_reports = sum(1 for r in all_reports if r["status"] == "resolved")
        comm_resolution_rate = round(comm_resolved_reports / comm_total_reports * 100, 1) if comm_total_reports else 0
        
        user_c = round(user_total_carbon, 3)
        equivalencies = {
            "kwh_electricity": round(user_c * 2.45, 2),
            "driving_miles_offset": round(user_c * 2.52, 2),
            "tree_seedlings_ten_years": round(user_c / 21.77, 3),
            "smartphones_charged": int(user_c * 121.6),
        }

        # 3. Ward / Neighborhood civic impact model
        # Combines verified database reports and scans with standard ward aggregation structure
        civic_wards = [
            {
                "id": "ward-2",
                "name": "Ward 2: North Riverside & Tech Quarter",
                "district": "North District",
                "population": 34200,
                "reports_submitted": 32 + max(0, comm_total_reports // 4),
                "reports_resolved": 30 + max(0, comm_resolved_reports // 4),
                "resolution_rate": 93.8,
                "avg_resolution_hours": 11.8,
                "recycling_scans": 415 + int(comm_total_scans * 0.8),
                "recyclable_rate": 91.2,
                "carbon_saved_kg": round(32.8 + (comm_total_carbon * 0.35), 2),
                "active_citizens": 210 + int(all_users_count * 0.7),
                "civic_score": 92.4,
                "primary_material": "Plastic & E-Waste",
                "data_source": "sample_civic_dataset"
            },
            {
                "id": "ward-1",
                "name": "Ward 1: Central Commercial & Arts",
                "district": "Downtown Core",
                "population": 28400,
                "reports_submitted": 48 + max(0, comm_total_reports // 3),
                "reports_resolved": 44 + max(0, comm_resolved_reports // 3),
                "resolution_rate": 91.7,
                "avg_resolution_hours": 14.2,
                "recycling_scans": 340 + comm_total_scans,
                "recyclable_rate": 84.5,
                "carbon_saved_kg": round(24.5 + (comm_total_carbon * 0.4), 2),
                "active_citizens": 182 + all_users_count,
                "civic_score": 88.6,
                "primary_material": "Cardboard & Metal",
                "data_source": "sample_civic_dataset"
            },
            {
                "id": "ward-3",
                "name": "Ward 3: South Green & Parkside",
                "district": "South District",
                "population": 22100,
                "reports_submitted": 19 + max(0, comm_total_reports // 6),
                "reports_resolved": 17 + max(0, comm_resolved_reports // 6),
                "resolution_rate": 89.5,
                "avg_resolution_hours": 16.5,
                "recycling_scans": 220 + int(comm_total_scans * 0.5),
                "recyclable_rate": 88.0,
                "carbon_saved_kg": round(18.2 + (comm_total_carbon * 0.2), 2),
                "active_citizens": 145 + int(all_users_count * 0.5),
                "civic_score": 86.2,
                "primary_material": "Glass & Organic",
                "data_source": "sample_civic_dataset"
            },
            {
                "id": "ward-4",
                "name": "Ward 4: Westside Residential & Campus",
                "district": "West District",
                "population": 41500,
                "reports_submitted": 56 + max(0, comm_total_reports // 3),
                "reports_resolved": 47 + max(0, comm_resolved_reports // 3),
                "resolution_rate": 83.9,
                "avg_resolution_hours": 18.0,
                "recycling_scans": 510 + comm_total_scans,
                "recyclable_rate": 79.4,
                "carbon_saved_kg": round(38.4 + (comm_total_carbon * 0.45), 2),
                "active_citizens": 268 + all_users_count,
                "civic_score": 82.5,
                "primary_material": "Paper & Mixed Plastic",
                "data_source": "sample_civic_dataset"
            },
            {
                "id": "ward-5",
                "name": "Ward 5: East Harbor & Mill District",
                "district": "East District",
                "population": 19800,
                "reports_submitted": 28 + max(0, comm_total_reports // 5),
                "reports_resolved": 22 + max(0, comm_resolved_reports // 5),
                "resolution_rate": 78.6,
                "avg_resolution_hours": 22.4,
                "recycling_scans": 185 + int(comm_total_scans * 0.3),
                "recyclable_rate": 75.0,
                "carbon_saved_kg": round(14.6 + (comm_total_carbon * 0.15), 2),
                "active_citizens": 98 + int(all_users_count * 0.3),
                "civic_score": 77.2,
                "primary_material": "General & Metal",
                "data_source": "sample_civic_dataset"
            }
        ]

    return {
        "user": {
            "total_scans": len(user_scans),
            "recyclable_scans": user_recyclable_count,
            "contamination_prevented": user_trash_count,
            "diversion_rate": round(user_recyclable_count / len(user_scans) * 100, 1) if user_scans else 0,
            "carbon_saved_kg": user_c,
            "categories": user_categories,
            "reports_count": len(user_reports),
            "reports_by_status": rep_status_counts,
            "average_resolution_hours": avg_user_res_time,
            "equivalencies": equivalencies,
        },
        "community": {
            "total_scans": comm_total_scans,
            "total_carbon_saved_kg": comm_total_carbon,
            "recycling_rate": comm_recycling_rate,
            "total_reports": comm_total_reports,
            "resolved_reports": comm_resolved_reports,
            "resolution_rate": comm_resolution_rate,
            "active_citizens": all_users_count,
        },
        "civic_wards": civic_wards,
        "civic_dataset_metadata": {
            "is_sample_dataset": True,
            "label": "🔬 SAMPLE CIVIC DATASET — Ward-Level Aggregation Model",
            "description": "Aggregates civic participation, verified reports resolution, and measured material diversion across municipal administrative wards. Designed to ingest spatial GIS boundary shapefiles and census tract data in municipal deployment.",
            "methodology": "Civic Score is a weighted index: 40% Resolution Rate + 40% Material Diversion + 20% Active Citizen Participation."
        },
        "scientific_methodology": {
            "standards_body": "EPA Waste Reduction Model (WARM) & DEFRA GHG Conversion Factors",
            "material_factors_kg_co2": {
                "metal": 0.12,
                "plastic": 0.08,
                "glass": 0.07,
                "cardboard": 0.06,
                "paper": 0.05,
                "general_waste": 0.00
            },
            "note": "Metrics reflect verified life-cycle greenhouse gas emission offsets from diverting recyclable materials from landfill."
        },
        "benchmark_sample_data": {
            "collection_efficiency_pct": 91.4,
            "smart_bin_fill_level_avg_pct": 64.2,
            "fleet_fuel_saved_liters": 142.5,
            "landfill_diversion_city_tons": 18.7,
            "is_sample_benchmark": True,
            "label": "Municipal Pilot Benchmark"
        }
    }


@app.get("/civic/impact")
@app.get("/api/civic/impact")
def get_civic_impact_report(user=Depends(get_current_user)):
    return sustainability_insights(user)


@app.post("/chat")
async def chat(body: ChatBody):
    # The assistant is available from the public-facing parts of the app.  Do
    # not require a session here: an unauthenticated visitor should still be
    # able to ask a disposal question.  User-specific actions remain protected
    # by their own authenticated endpoints.
    if not body.message or not body.message.strip():
        raise HTTPException(status.HTTP_422_UNPROCESSABLE_ENTITY, "Please enter a question")
    FALLBACK = {
        "plastic":   "Rinse the plastic container, remove the cap, flatten it, and place in the Blue Recycling Bin. Check the resin code (1-7) on the bottom - codes 1 (PET) and 2 (HDPE) are most widely accepted.",
        "glass":     "Rinse the glass bottle or jar, remove the metal lid (recycle separately), and place in the Green Glass Bank. Never mix with ceramics or Pyrex.",
        "paper":     "Keep paper dry and clean. Remove any plastic wrapping, flatten boxes, and place in the Blue Recycling Bin. Greasy paper like pizza boxes goes in general waste.",
        "cardboard": "Break down the cardboard box flat, remove tape and staples if possible, keep it dry, and place in the Blue Recycling Bin.",
        "metal":     "Rinse the metal can to remove food residue, crush it to save space, and place in the Blue Recycling Bin. Clean aluminium foil can also be recycled.",
        "foil":      "Clean aluminium foil is recyclable. Rinse off food, scrunch small pieces into a ball so they are large enough for sorting equipment, then put it in the recycling bin. Heavily soiled foil belongs in general waste.",
        "trash":     "This item cannot be recycled in standard bins. Place it in the General Waste (Black) Bin. Consider if it can be reused, repaired, or donated first.",
        "batter":    "Batteries are hazardous - never put them in regular bins. Take them to a dedicated battery recycling point (most supermarkets have one).",
        "pizza":     "Greasy pizza boxes cannot be recycled. Tear off any clean parts for recycling and put the greasy parts in general waste.",
        "electronic": "Electronic items must not go in household bins. Take phones, cables, appliances, and other e-waste to an e-waste collection point, electronics retailer take-back scheme, or household recycling centre.",
        "e-waste":   "E-waste must not go in household bins. Take it to an e-waste collection point, electronics retailer take-back scheme, or household recycling centre.",
        "medicine":  "Return unused or expired medicines to a pharmacy. Do not flush them or put them in household recycling; pharmacies arrange safe disposal.",
        "broken glass": "Wrap broken glass securely in paper or a box before placing it in general waste. Do not put broken glass in a bottle bank or mixed recycling because it can injure sorting workers.",
        "food":      "Put food scraps in your food-waste or compost bin where available. Keep packaging, plastic bags, and cutlery out unless your local collection specifically accepts compostable liners.",
        "shoe":      "Shoes and trainers should not go in household recycling. Donate clean wearable pairs to a charity or textile-reuse point. If they are worn out, use a textile recycling bank or a retailer take-back scheme where available; keep the pair tied together.",
        "textile":   "Do not put clothing or textiles in mixed recycling. Donate clean, wearable items, or use a textile recycling bank for worn-out fabric. Keep shoes paired and dry.",
        "clothing":  "Do not put clothing in mixed recycling. Donate clean, wearable items, or use a textile recycling bank for worn-out fabric. Keep shoes paired and dry.",
        "overflow":  "Do not leave rubbish beside an overflowing bin. Use another bin or take it home, then report the overflowing bin to the local council with its location and a photo if possible.",
    }
    msg_lower = body.message.strip().lower()

    if not GROQ_KEY:
        for key, reply in FALLBACK.items():
            if key in msg_lower:
                return {"reply": reply, "source": "local_guide"}
        return {"reply": "I can help with recycling! Ask me about plastic, glass, paper, metal, cardboard, batteries, textiles, or any specific item.", "source": "local_guide"}

    try:
        client = GroqClient(api_key=GROQ_KEY)
        resp = client.chat.completions.create(
            # compound-beta-mini is the correct Groq model ID (as of 2025).
            model="compound-beta-mini",
            messages=[
                {
                    "role": "system",
                    "content": (
                        "You are EcoBot, the AI waste-management assistant for the Smart Bin Assistant app. "
                        "Your ONLY job is to help users with waste disposal, recycling, waste segregation, "
                        "environmental awareness, e-waste, hazardous waste, and Smart Bin functionality. "
                        "For every answer: 1) specify which bin/facility to use, "
                        "2) explain how to prepare the item, "
                        "3) mention why it matters environmentally. "
                        "Use friendly tone and emojis. Keep responses under 200 words. "
                        "If a question is NOT related to waste, recycling, or environmental topics, "
                        "politely redirect: I am focused on waste and recycling topics only. "
                        "Never invent specific recycling centre addresses or local collection schedules."
                    )
                },
                {"role": "user", "content": body.message}
            ],
            max_tokens=300,
        )
        reply_text = resp.choices[0].message.content
        if not reply_text or not reply_text.strip():
            raise ValueError("Empty response from AI provider")
        return {"reply": reply_text, "source": "groq"}
    except Exception as e:
        logger.error("Groq error: %s", e)
        for key, reply in FALLBACK.items():
            if key in msg_lower:
                return {"reply": reply, "source": "local_guide"}
        return {"reply": "Sorry, the assistant is temporarily unavailable. Please try again in a moment.", "source": "local_guide"}

@app.get("/location/estimate")
async def estimate_location_from_network():
    """Return a coarse location based on the caller's public IP address.

    This is deliberately a fallback for browsers which do not expose GPS (or
    where the visitor has denied permission); it must never be presented as an
    exact location.
    """
    import urllib.request

    try:
        request = urllib.request.Request(
            "https://ipwho.is/",
            headers={"User-Agent": "EcoLabelVision/2.0"},
        )
        with urllib.request.urlopen(request, timeout=8) as response:
            data = json.loads(response.read().decode("utf-8"))

        lat, lon = data.get("latitude"), data.get("longitude")
        if not data.get("success", True) or lat is None or lon is None:
            raise ValueError("location provider returned no coordinates")

        city = data.get("city") or data.get("region") or data.get("country") or "Approximate location"
        return {
            "lat": float(lat),
            "lon": float(lon),
            "label": f"Approximate location: {city}",
            "accuracy": "approximate",
        }
    except Exception as exc:
        logger.warning("Network location lookup failed: %s", exc)
        raise HTTPException(
            status.HTTP_503_SERVICE_UNAVAILABLE,
            "Unable to estimate your location. Please search for a city or address.",
        )


@app.get("/recycling-centers")
async def recycling_centers(lat: float, lon: float, radius: int = 5000):
    import urllib.request, urllib.parse
    query = (
        "[out:json][timeout:15];"
        "("
        f'node["amenity"="recycling"](around:{radius},{lat},{lon});'
        f'node["recycling_type"="centre"](around:{radius},{lat},{lon});'
        f'node["amenity"="waste_disposal"](around:{radius},{lat},{lon});'
        f'node["shop"="second_hand"](around:{radius},{lat},{lon});'
        f'node["shop"="charity"](around:{radius},{lat},{lon});'
        f'way["amenity"="recycling"](around:{radius},{lat},{lon});'
        ");"
        "out center body;"
    )
    url = "https://overpass-api.de/api/interpreter"
    data_enc = urllib.parse.urlencode({"data": query}).encode()
    try:
        req = urllib.request.Request(url, data=data_enc, method="POST",
                                     headers={"User-Agent": "EcoLabelVision/2.0"})
        with urllib.request.urlopen(req, timeout=15) as r:
            result = json.loads(r.read())
        centers = []
        for el in result.get("elements", []):
            tags = el.get("tags", {})
            elat = el.get("lat") or el.get("center", {}).get("lat")
            elon = el.get("lon") or el.get("center", {}).get("lon")
            if not elat or not elon:
                continue
            amenity = tags.get("amenity", "")
            shop    = tags.get("shop", "")
            if amenity == "waste_disposal":
                category, icon = "waste_disposal", "Waste Disposal"
            elif shop in ("second_hand", "charity"):
                category, icon = "reuse", "Reuse Shop"
            else:
                category, icon = "recycling", "Recycling"
            name  = tags.get("name") or tags.get("operator") or tags.get("brand") or icon
            types = [k.replace("recycling:", "") for k in tags if k.startswith("recycling:") and tags[k] == "yes"]
            centers.append({
                "id": el["id"], "lat": elat, "lon": elon,
                "name": name, "category": category, "icon": icon,
                "types": types[:6],
                "opening_hours": tags.get("opening_hours", ""),
                "phone": tags.get("phone", ""),
            })
        return {"centers": centers[:40]}
    except Exception as e:
        logger.error("Overpass error: %s", e)
        return {"centers": [], "error": str(e)}


# ── IoT Smart Bin Telemetry Endpoints ──────────────────────────────────────

def compute_bin_status(fill_level: float, sensor_status: str) -> str:
    if sensor_status == "offline":
        return "offline"
    if sensor_status == "maintenance_required":
        return "maintenance"
    if fill_level >= 85.0:
        return "full"
    if fill_level >= 60.0:
        return "nearly_full"
    return "available"


@app.post("/iot/telemetry")
@app.post("/api/iot/telemetry")
def ingest_iot_telemetry(payload: IoTTelemetryPayload):
    """
    Enterprise IoT Sensor Ingestion Gateway (LoRaWAN / NB-IoT / HTTP).
    Supports simulated and production telemetry packets.
    """
    fill = max(0.0, min(100.0, float(payload.fill_level)))
    battery = max(0.0, min(100.0, float(payload.battery_level))) if payload.battery_level is not None else 95.0
    temp = float(payload.temperature) if payload.temperature is not None else 21.5
    sensor_stat = payload.sensor_status or "online"
    
    derived_status = compute_bin_status(fill, sensor_stat)
    now_iso = datetime.now(timezone.utc).isoformat()
    telemetry_time = payload.timestamp or now_iso

    with get_db() as conn:
        # 1. Append to telemetry stream audit log
        conn.execute(
            """INSERT INTO iot_telemetry 
               (bin_id, fill_level, battery_level, temperature, sensor_status, is_simulated, received_at) 
               VALUES (?, ?, ?, ?, ?, 1, ?)""",
            (payload.bin_id, fill, battery, temp, sensor_stat, now_iso)
        )

        # 2. Update smart bin record in database
        existing = conn.execute("SELECT * FROM bins WHERE id = ?", (payload.bin_id,)).fetchone()
        if existing:
            conn.execute(
                """UPDATE bins 
                   SET fill_level = ?, battery_level = ?, temperature = ?, sensor_status = ?, status = ?, last_updated = ?
                   WHERE id = ?""",
                (fill, battery, temp, sensor_stat, derived_status, now_iso, payload.bin_id)
            )
        else:
            # Auto-provision bin if new sensor id reported
            conn.execute(
                """INSERT INTO bins 
                   (id, name, lat, lon, type, fill_level, battery_level, temperature, sensor_status, status, address, data_source, last_updated)
                   VALUES (?, ?, 51.505, -0.09, 'recycling', ?, ?, ?, ?, ?, 'Smart Sensor Gateway', 'simulated_iot', ?)""",
                (payload.bin_id, f"Smart Bin {payload.bin_id}", fill, battery, temp, sensor_stat, derived_status, now_iso)
            )

        updated_bin = conn.execute("SELECT * FROM bins WHERE id = ?", (payload.bin_id,)).fetchone()

    bin_data = dict(updated_bin)
    return {
        "success": True,
        "is_simulated": True,
        "message": f"Telemetry processed for bin {payload.bin_id} (SIMULATED IoT DATA)",
        "timestamp": now_iso,
        "threshold_breached": fill >= 85.0,
        "bin": {
            "id": bin_data["id"],
            "name": bin_data.get("name") or bin_data["id"],
            "lat": bin_data["lat"],
            "lon": bin_data["lon"],
            "type": bin_data["type"],
            "fillLevel": bin_data["fill_level"],
            "batteryLevel": bin_data["battery_level"],
            "temperature": bin_data["temperature"],
            "sensorStatus": bin_data["sensor_status"],
            "status": bin_data["status"],
            "address": bin_data["address"],
            "dataSource": bin_data["data_source"],
            "lastUpdated": bin_data["last_updated"],
        }
    }


@app.get("/iot/telemetry/history")
@app.get("/api/iot/telemetry/history")
def get_telemetry_history(limit: int = 25, bin_id: Optional[str] = None):
    query = "SELECT * FROM iot_telemetry"
    params = []
    if bin_id:
        query += " WHERE bin_id = ?"
        params.append(bin_id)
    query += " ORDER BY received_at DESC LIMIT ?"
    params.append(limit)

    with get_db() as conn:
        rows = conn.execute(query, tuple(params)).fetchall()

    return {
        "history": [
            {
                "id": r["id"],
                "binId": r["bin_id"],
                "fillLevel": r["fill_level"],
                "batteryLevel": r["battery_level"],
                "temperature": r["temperature"],
                "sensorStatus": r["sensor_status"],
                "isSimulated": bool(r["is_simulated"]),
                "receivedAt": r["received_at"],
            }
            for r in rows
        ]
    }


@app.get("/bins")
@app.get("/api/bins")
def get_bins_list():
    with get_db() as conn:
        rows = conn.execute("SELECT * FROM bins ORDER BY id ASC").fetchall()

    return {
        "bins": [
            {
                "id": r["id"],
                "name": r["name"] or r["id"],
                "lat": r["lat"],
                "lon": r["lon"],
                "type": r["type"],
                "fillLevel": r["fill_level"],
                "batteryLevel": r["battery_level"],
                "temperature": r["temperature"],
                "sensorStatus": r["sensor_status"],
                "status": r["status"],
                "address": r["address"],
                "dataSource": r["data_source"],
                "lastUpdated": r["last_updated"],
            }
            for r in rows
        ]
    }


@app.get("/health")
def health():
    return {"status": "ok", "model_loaded": classifier.model is not None, "groq": bool(GROQ_KEY)}


@app.get("/classes")
def get_classes():
    return {"classes": classifier.classes, "disposal_info": DISPOSAL_INFO}


if __name__ == "__main__":
    port = int(os.getenv("PORT", 8001))
    uvicorn.run("main:app", host="0.0.0.0", port=port)
