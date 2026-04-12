import os, re, uuid, math
from datetime import datetime, timezone, timedelta
from typing import Optional, List
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Depends, Request, Response, UploadFile, File, Query
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response as StarletteResponse
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel
from dotenv import load_dotenv
import bcrypt
import jwt
import shutil
import pathlib

load_dotenv()

MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "turfdb")
JWT_SECRET = os.environ.get("SESSION_SECRET", "turftime-dev-secret")
ADMIN_KEY = os.environ.get("ADMIN_KEY", "turftime-admin")
UPLOADS_DIR = pathlib.Path("/app/uploads")
UPLOADS_DIR.mkdir(parents=True, exist_ok=True)

# ── MongoDB ────────────────────────────────────────────────────────────────────
client = AsyncIOMotorClient(MONGO_URL)
db = client[DB_NAME]
users_col = db["users"]
turfs_col = db["turfs"]
slots_col = db["time_slots"]
bookings_col = db["bookings"]
reviews_col = db["reviews"]
locations_col = db["locations"]

# ── Seed Data ──────────────────────────────────────────────────────────────────
TURF_IMAGES = [
    "https://images.unsplash.com/photo-1529900748604-07564a03e7a6?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1574629810360-7efbbe195018?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1431324155629-1a6deb1dec8d?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1459865264687-595d652de67e?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1551958219-acbc608c6377?w=800&h=600&fit=crop",
    "https://images.unsplash.com/photo-1624880357913-a8539238245b?w=800&h=600&fit=crop",
]
INITIAL_TURFS = [
    {"_id": "turf-1", "ownerId": None, "name": "Green Valley Cricket Ground", "location": "Indiranagar, Bangalore", "address": "123 Sports Complex, Indiranagar, Bangalore 560038", "imageUrl": TURF_IMAGES[0], "rating": 5, "amenities": ["Parking", "WiFi", "Showers", "Changing Room", "Cafe", "Water"], "sportTypes": ["Cricket"], "pricePerHour": 1200, "isAvailable": True, "featured": True, "openHour": 6, "closeHour": 23},
    {"_id": "turf-2", "ownerId": None, "name": "Champions Cricket Ground", "location": "Koramangala, Bangalore", "address": "456 Stadium Road, Koramangala, Bangalore 560034", "imageUrl": TURF_IMAGES[1], "rating": 5, "amenities": ["Parking", "WiFi", "Showers", "Water"], "sportTypes": ["Cricket"], "pricePerHour": 1500, "isAvailable": True, "featured": True, "openHour": 6, "closeHour": 23},
    {"_id": "turf-3", "ownerId": None, "name": "Cricket Paradise", "location": "HSR Layout, Bangalore", "address": "789 Sports Avenue, HSR Layout, Bangalore 560102", "imageUrl": TURF_IMAGES[2], "rating": 4, "amenities": ["Parking", "Changing Room", "Water"], "sportTypes": ["Cricket"], "pricePerHour": 800, "isAvailable": True, "featured": False, "openHour": 6, "closeHour": 23},
    {"_id": "turf-4", "ownerId": None, "name": "Elite Cricket Hub", "location": "Whitefield, Bangalore", "address": "101 Tech Park, Whitefield, Bangalore 560066", "imageUrl": TURF_IMAGES[3], "rating": 4, "amenities": ["Parking", "WiFi", "Showers", "Changing Room", "Cafe"], "sportTypes": ["Cricket"], "pricePerHour": 1000, "isAvailable": True, "featured": True, "openHour": 6, "closeHour": 23},
    {"_id": "turf-5", "ownerId": None, "name": "Premier Cricket Arena", "location": "Electronic City, Bangalore", "address": "202 Sports Complex, Electronic City, Bangalore 560100", "imageUrl": TURF_IMAGES[4], "rating": 5, "amenities": ["Parking", "Showers", "Water"], "sportTypes": ["Cricket"], "pricePerHour": 2000, "isAvailable": True, "featured": True, "openHour": 6, "closeHour": 23},
    {"_id": "turf-6", "ownerId": None, "name": "Professional Cricket Grounds", "location": "MG Road, Bangalore", "address": "303 Central Complex, MG Road, Bangalore 560001", "imageUrl": TURF_IMAGES[5], "rating": 5, "amenities": ["Parking", "WiFi", "Showers", "Changing Room", "Cafe", "Water"], "sportTypes": ["Cricket"], "pricePerHour": 1800, "isAvailable": True, "featured": False, "openHour": 6, "closeHour": 23},
]
INITIAL_LOCATIONS = ["Bangalore", "Chennai", "Mumbai", "Delhi", "Hyderabad", "Pune", "Kolkata", "Ahmedabad", "Nandyal"]

# ── JWT ────────────────────────────────────────────────────────────────────────
def create_token(user_id: str) -> str:
    payload = {"sub": user_id, "exp": datetime.now(timezone.utc) + timedelta(days=7)}
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")

def verify_token(token: str) -> Optional[str]:
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return payload.get("sub")
    except Exception:
        return None

async def get_current_user(request: Request):
    token = request.cookies.get("auth_token")
    if not token:
        raise HTTPException(401, "Not authenticated")
    uid = verify_token(token)
    if not uid:
        raise HTTPException(401, "Invalid token")
    user = await users_col.find_one({"_id": uid})
    if not user:
        raise HTTPException(401, "User not found")
    return user

async def get_optional_user(request: Request):
    token = request.cookies.get("auth_token")
    if not token:
        return None
    uid = verify_token(token)
    if not uid:
        return None
    return await users_col.find_one({"_id": uid})

def set_auth_cookie(response: Response, user_id: str):
    token = create_token(user_id)
    response.set_cookie("auth_token", token, httponly=True, samesite="lax", max_age=7*24*3600, path="/")

def safe_user(u: dict) -> dict:
    return {
        "id": u["_id"], "username": u.get("username"), "fullName": u.get("fullName"),
        "email": u.get("email"), "phoneNumber": u.get("phoneNumber"), "dateOfBirth": u.get("dateOfBirth"),
        "role": u.get("role"), "ownerStatus": u.get("ownerStatus"), "turfStatus": u.get("turfStatus"),
        "turfName": u.get("turfName"), "turfLocation": u.get("turfLocation"),
        "turfAddress": u.get("turfAddress"), "turfPincode": u.get("turfPincode"),
        "turfImageUrls": u.get("turfImageUrls"), "turfLength": u.get("turfLength"),
        "turfWidth": u.get("turfWidth"), "profileImageUrl": u.get("profileImageUrl"),
    }

def safe_turf(t: dict) -> dict:
    return {
        "id": t["_id"], "ownerId": t.get("ownerId"), "name": t.get("name"),
        "location": t.get("location"), "address": t.get("address"), "imageUrl": t.get("imageUrl"),
        "rating": t.get("rating", 5), "amenities": t.get("amenities", []),
        "sportTypes": t.get("sportTypes", []), "pricePerHour": t.get("pricePerHour", 1000),
        "isAvailable": t.get("isAvailable", True), "featured": t.get("featured", False),
        "openHour": t.get("openHour", 6), "closeHour": t.get("closeHour", 23),
    }

def safe_slot(s: dict) -> dict:
    return {
        "id": s["_id"], "turfId": s.get("turfId"), "date": s.get("date"),
        "startTime": s.get("startTime"), "endTime": s.get("endTime"),
        "price": s.get("price"), "period": s.get("period"),
        "isBooked": s.get("isBooked", False), "isBlocked": s.get("isBlocked", False),
    }

def safe_booking(b: dict) -> dict:
    return {
        "id": b["_id"], "turfId": b.get("turfId"), "turfName": b.get("turfName"),
        "turfAddress": b.get("turfAddress"), "date": b.get("date"),
        "startTime": b.get("startTime"), "endTime": b.get("endTime"),
        "duration": b.get("duration"), "totalAmount": b.get("totalAmount"),
        "paidAmount": b.get("paidAmount"), "balanceAmount": b.get("balanceAmount"),
        "paymentMethod": b.get("paymentMethod"), "status": b.get("status", "confirmed"),
        "bookingCode": b.get("bookingCode"), "userId": b.get("userId"),
        "userName": b.get("userName"), "userPhone": b.get("userPhone"),
        "createdAt": b.get("createdAt").isoformat() if b.get("createdAt") else None,
    }

# ── Time Slot Logic ────────────────────────────────────────────────────────────
async def ensure_slots(turf_id: str, date: str, base_price: int, open_hour: int = 6, close_hour: int = 23) -> list:
    existing = await slots_col.find({"turfId": turf_id, "date": date}).to_list(None)
    if existing:
        return [safe_slot(s) for s in existing]
    slots = []
    for hour in range(open_hour, close_hour):
        period = "morning" if hour < 12 else ("afternoon" if hour < 18 else "evening")
        multiplier = 1.0 if hour < 12 else (1.2 if hour < 18 else 1.5)
        price = round(base_price * multiplier)
        slot = {
            "_id": f"{turf_id}-{date}-{hour:02d}",
            "turfId": turf_id, "date": date,
            "startTime": f"{hour:02d}:00", "endTime": f"{hour+1:02d}:00",
            "price": price, "period": period, "isBooked": False, "isBlocked": False,
        }
        slots.append(slot)
    if slots:
        try:
            await slots_col.insert_many(slots, ordered=False)
        except Exception:
            pass
    return [safe_slot(s) for s in slots]

# ── Validation ─────────────────────────────────────────────────────────────────
USERNAME_RE = re.compile(r'^(?!.*\.\.)(?!.*\.$)[a-zA-Z0-9_][a-zA-Z0-9_.]{0,28}[a-zA-Z0-9_]$|^[a-zA-Z0-9_]$')

def validate_password(pw: str) -> str:
    if len(pw) < 6:
        raise HTTPException(400, "Password must be at least 6 characters")
    if pw.isdigit():
        raise HTTPException(400, "Password can't be all numbers — add a letter or symbol")
    return pw

# ── Pydantic Models ────────────────────────────────────────────────────────────
class PlayerRegister(BaseModel):
    username: str
    email: str
    phoneNumber: str
    dateOfBirth: str
    password: str

class OwnerRegister(BaseModel):
    fullName: str
    username: str
    email: str
    phoneNumber: str
    dateOfBirth: str
    password: str

class LoginBody(BaseModel):
    identifier: str
    password: str

class ForgotPasswordBody(BaseModel):
    identifier: str
    dateOfBirth: str
    newPassword: str

class ProfileUpdate(BaseModel):
    username: Optional[str] = None
    fullName: Optional[str] = None
    email: Optional[str] = None
    phoneNumber: Optional[str] = None

class ChangePassword(BaseModel):
    currentPassword: str
    newPassword: str

class TurfSubmit(BaseModel):
    turfName: str
    turfLocation: str
    turfAddress: str
    turfPincode: str
    turfImageUrls: List[str]
    turfLength: int
    turfWidth: int

class TurfProfileUpdate(BaseModel):
    name: Optional[str] = None
    address: Optional[str] = None
    pincode: Optional[str] = None
    pricePerHour: Optional[int] = None
    openHour: Optional[int] = None
    closeHour: Optional[int] = None
    imageUrls: Optional[List[str]] = None
    amenities: Optional[List[str]] = None
    sportTypes: Optional[List[str]] = None

class BookingCreate(BaseModel):
    turfId: str
    turfName: str
    turfAddress: str
    date: str
    startTime: str
    endTime: str
    duration: int
    totalAmount: int
    paidAmount: int
    balanceAmount: int
    paymentMethod: str
    bookingCode: str
    userId: Optional[str] = None
    userName: Optional[str] = None
    userPhone: Optional[str] = None

class ReviewCreate(BaseModel):
    rating: int
    comment: Optional[str] = None

class AppFeedbackBody(BaseModel):
    rating: int
    feedback: Optional[str] = None

# ── App Lifespan ───────────────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI):
    # Seed turfs
    for turf in INITIAL_TURFS:
        await turfs_col.update_one({"_id": turf["_id"]}, {"$setOnInsert": turf}, upsert=True)
    # Seed locations
    await locations_col.update_one({"_id": "config"}, {"$setOnInsert": {"_id": "config", "values": INITIAL_LOCATIONS}}, upsert=True)
    # Seed test owner (account_approved + turf_approved)
    existing = await users_col.find_one({"username": "testowner"})
    if not existing:
        hashed = bcrypt.hashpw(b"owner123", bcrypt.gensalt()).decode()
        owner_id = "seed-owner-1"
        await users_col.insert_one({
            "_id": owner_id, "username": "testowner", "fullName": "Test Owner",
            "email": "testowner@gmail.com", "phoneNumber": "9876543210",
            "password": hashed, "dateOfBirth": "1990-01-01",
            "role": "turf_owner", "ownerStatus": "account_approved",
            "turfStatus": "turf_approved", "turfName": "Owner Test Ground",
            "turfLocation": "Bangalore", "turfAddress": "123 Test Street, Bangalore",
            "turfPincode": "560001", "turfImageUrls": [TURF_IMAGES[0]], "turfLength": 120, "turfWidth": 75,
        })
        # Create turf document for the test owner
        await turfs_col.update_one({"ownerId": owner_id}, {"$setOnInsert": {
            "_id": f"owner-turf-{owner_id}", "ownerId": owner_id,
            "name": "Owner Test Ground", "location": "Bangalore",
            "address": "123 Test Street, Bangalore", "imageUrl": TURF_IMAGES[0],
            "rating": 5, "amenities": ["Parking", "Water"], "sportTypes": ["Cricket"],
            "pricePerHour": 1000, "isAvailable": True, "featured": False,
            "openHour": 6, "closeHour": 23,
        }}, upsert=True)
    # Seed test player
    existing_p = await users_col.find_one({"username": "shahid"})
    if not existing_p:
        hashed_p = bcrypt.hashpw(b"shahid123", bcrypt.gensalt()).decode()
        await users_col.insert_one({
            "_id": "seed-player-shahid", "username": "shahid", "fullName": "Shahid Afrid",
            "email": "shahid@gmail.com", "phoneNumber": "1234567890",
            "password": hashed_p, "dateOfBirth": "2006-06-25", "role": "player",
        })
    yield
    client.close()

app = FastAPI(lifespan=lifespan)

from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import Response as StarletteResponse

class ReflectOriginCORSMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        origin = request.headers.get("origin", "")
        if request.method == "OPTIONS":
            response = StarletteResponse(status_code=204)
        else:
            response = await call_next(request)
        if origin:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
            response.headers["Access-Control-Allow-Methods"] = "GET,POST,PUT,PATCH,DELETE,OPTIONS"
            response.headers["Access-Control-Allow-Headers"] = "Content-Type,Authorization,Cookie"
        return response

app.add_middleware(ReflectOriginCORSMiddleware)
app.mount("/uploads", StaticFiles(directory=str(UPLOADS_DIR)), name="uploads")

# ── Auth Routes ────────────────────────────────────────────────────────────────
@app.post("/api/auth/register")
async def register_player(body: PlayerRegister, response: Response):
    if not USERNAME_RE.match(body.username):
        raise HTTPException(400, "Username: letters, numbers, underscores, periods only")
    if not body.email.lower().endswith("@gmail.com"):
        raise HTTPException(400, "Only Gmail addresses (@gmail.com) are accepted")
    if not re.match(r'^\d{10}$', body.phoneNumber):
        raise HTTPException(400, "Phone number must be exactly 10 digits")
    if not re.match(r'^\d{4}-\d{2}-\d{2}$', body.dateOfBirth):
        raise HTTPException(400, "Date must be YYYY-MM-DD")
    validate_password(body.password)
    if await users_col.find_one({"username": body.username}):
        raise HTTPException(409, "Username already taken")
    if await users_col.find_one({"email": body.email.lower()}):
        raise HTTPException(409, "Gmail address already registered")
    if await users_col.find_one({"phoneNumber": body.phoneNumber}):
        raise HTTPException(409, "Phone number already registered")
    uid = str(uuid.uuid4())
    hashed = bcrypt.hashpw(body.password.encode(), bcrypt.gensalt()).decode()
    user = {"_id": uid, "username": body.username, "email": body.email.lower(),
            "phoneNumber": body.phoneNumber, "dateOfBirth": body.dateOfBirth,
            "password": hashed, "role": "player"}
    await users_col.insert_one(user)
    set_auth_cookie(response, uid)
    return safe_user(user)

@app.post("/api/auth/register/owner")
async def register_owner(body: OwnerRegister, response: Response):
    if not body.fullName or len(body.fullName) < 2:
        raise HTTPException(400, "Full name must be at least 2 characters")
    if not USERNAME_RE.match(body.username):
        raise HTTPException(400, "Username: letters, numbers, underscores, periods only")
    if not body.email.lower().endswith("@gmail.com"):
        raise HTTPException(400, "Only Gmail addresses (@gmail.com) are accepted")
    if not re.match(r'^\d{10}$', body.phoneNumber):
        raise HTTPException(400, "Phone number must be exactly 10 digits")
    validate_password(body.password)
    if await users_col.find_one({"username": body.username}):
        raise HTTPException(409, "Username already taken")
    if await users_col.find_one({"email": body.email.lower()}):
        raise HTTPException(409, "Gmail address already registered")
    if await users_col.find_one({"phoneNumber": body.phoneNumber}):
        raise HTTPException(409, "Phone number already registered")
    uid = str(uuid.uuid4())
    hashed = bcrypt.hashpw(body.password.encode(), bcrypt.gensalt()).decode()
    user = {"_id": uid, "username": body.username, "fullName": body.fullName,
            "email": body.email.lower(), "phoneNumber": body.phoneNumber,
            "dateOfBirth": body.dateOfBirth, "password": hashed,
            "role": "turf_owner", "ownerStatus": "pending_account"}
    await users_col.insert_one(user)
    set_auth_cookie(response, uid)
    return safe_user(user)

@app.post("/api/auth/login")
async def login(body: LoginBody, response: Response):
    identifier = body.identifier
    user = await users_col.find_one({"username": identifier})
    if not user:
        user = await users_col.find_one({"phoneNumber": identifier})
    if not user:
        user = await users_col.find_one({"email": identifier})
    if not user or not bcrypt.checkpw(body.password.encode(), user["password"].encode()):
        raise HTTPException(401, "Invalid credentials")
    set_auth_cookie(response, user["_id"])
    return safe_user(user)

@app.post("/api/auth/logout")
async def logout(response: Response):
    response.delete_cookie("auth_token", path="/")
    return {"success": True}

@app.get("/api/auth/me")
async def me(user=Depends(get_current_user)):
    return safe_user(user)

@app.post("/api/auth/forgot-password")
async def forgot_password(body: ForgotPasswordBody):
    identifier = body.identifier
    user = await users_col.find_one({"username": identifier})
    if not user:
        user = await users_col.find_one({"phoneNumber": identifier})
    if not user:
        user = await users_col.find_one({"email": identifier})
    if not user:
        raise HTTPException(404, "Account not found")
    if user.get("dateOfBirth") != body.dateOfBirth:
        raise HTTPException(400, "Date of birth does not match")
    validate_password(body.newPassword)
    hashed = bcrypt.hashpw(body.newPassword.encode(), bcrypt.gensalt()).decode()
    await users_col.update_one({"_id": user["_id"]}, {"$set": {"password": hashed}})
    return {"success": True}

@app.patch("/api/auth/profile")
async def update_profile(body: ProfileUpdate, user=Depends(get_current_user)):
    update = {}
    if body.username and body.username != user.get("username"):
        if await users_col.find_one({"username": body.username}):
            raise HTTPException(409, "Username already taken")
        update["username"] = body.username
    if body.email and body.email.lower() != user.get("email"):
        if await users_col.find_one({"email": body.email.lower()}):
            raise HTTPException(409, "Email already registered")
        update["email"] = body.email.lower()
    if body.phoneNumber and body.phoneNumber != user.get("phoneNumber"):
        if await users_col.find_one({"phoneNumber": body.phoneNumber}):
            raise HTTPException(409, "Phone number already registered")
        update["phoneNumber"] = body.phoneNumber
    if body.fullName:
        update["fullName"] = body.fullName
    if update:
        await users_col.update_one({"_id": user["_id"]}, {"$set": update})
    updated = await users_col.find_one({"_id": user["_id"]})
    return safe_user(updated)

@app.delete("/api/auth/profile")
async def delete_profile(response: Response, user=Depends(get_current_user)):
    await users_col.delete_one({"_id": user["_id"]})
    response.delete_cookie("auth_token", path="/")
    return {"success": True}

@app.post("/api/auth/change-password")
async def change_password(body: ChangePassword, user=Depends(get_current_user)):
    if not bcrypt.checkpw(body.currentPassword.encode(), user["password"].encode()):
        raise HTTPException(400, "Current password is incorrect")
    validate_password(body.newPassword)
    hashed = bcrypt.hashpw(body.newPassword.encode(), bcrypt.gensalt()).decode()
    await users_col.update_one({"_id": user["_id"]}, {"$set": {"password": hashed}})
    return {"success": True}

@app.get("/api/auth/my-bookings")
async def my_bookings(user=Depends(get_current_user)):
    bks = await bookings_col.find({"userId": user["_id"]}).to_list(None)
    return [safe_booking(b) for b in bks]

@app.post("/api/upload")
async def upload_image(image: UploadFile = File(...)):
    allowed = {"image/jpeg", "image/jpg", "image/png"}
    if image.content_type not in allowed:
        raise HTTPException(400, "Only PNG and JPEG images are allowed")
    ext = pathlib.Path(image.filename).suffix.lower()
    filename = f"{uuid.uuid4().hex}{ext}"
    dest = UPLOADS_DIR / filename
    with open(dest, "wb") as f:
        shutil.copyfileobj(image.file, f)
    return {"url": f"/uploads/{filename}"}

@app.post("/api/auth/profile-image")
async def profile_image(image: UploadFile = File(...), user=Depends(get_current_user)):
    allowed = {"image/jpeg", "image/jpg", "image/png"}
    if image.content_type not in allowed:
        raise HTTPException(400, "Only PNG and JPEG images are allowed")
    ext = pathlib.Path(image.filename).suffix.lower()
    filename = f"{uuid.uuid4().hex}{ext}"
    dest = UPLOADS_DIR / filename
    with open(dest, "wb") as f:
        shutil.copyfileobj(image.file, f)
    url = f"/uploads/{filename}"
    await users_col.update_one({"_id": user["_id"]}, {"$set": {"profileImageUrl": url}})
    updated = await users_col.find_one({"_id": user["_id"]})
    return safe_user(updated)

# ── Locations ──────────────────────────────────────────────────────────────────
@app.get("/api/locations")
async def get_locations():
    doc = await locations_col.find_one({"_id": "config"})
    return doc.get("values", INITIAL_LOCATIONS) if doc else INITIAL_LOCATIONS

# ── Owner: Submit Turf ─────────────────────────────────────────────────────────
@app.post("/api/owner/turf/submit")
async def submit_turf(body: TurfSubmit, user=Depends(get_current_user)):
    if user.get("role") != "turf_owner":
        raise HTTPException(403, "Not a turf owner")
    if user.get("ownerStatus") != "account_approved":
        raise HTTPException(403, "Account must be approved before submitting a turf")
    if len(body.turfName) < 3:
        raise HTTPException(400, "Turf name must be at least 3 characters")
    if not re.match(r'^\d{6}$', body.turfPincode):
        raise HTTPException(400, "Pincode must be exactly 6 digits")
    update = {
        "turfName": body.turfName, "turfLocation": body.turfLocation,
        "turfAddress": body.turfAddress, "turfPincode": body.turfPincode,
        "turfImageUrls": body.turfImageUrls, "turfLength": body.turfLength,
        "turfWidth": body.turfWidth, "turfStatus": "pending_turf",
    }
    await users_col.update_one({"_id": user["_id"]}, {"$set": update})
    updated = await users_col.find_one({"_id": user["_id"]})
    return safe_user(updated)

# ── Owner: Get turfs ────────────────────────────────────────────────────────────
@app.get("/api/owner/turfs")
async def owner_turfs(user=Depends(get_current_user)):
    turfs = await turfs_col.find({"ownerId": user["_id"]}).to_list(None)
    return [safe_turf(t) for t in turfs]

# ── Owner: Get slots ───────────────────────────────────────────────────────────
@app.get("/api/owner/turfs/{turf_id}/slots/{date}")
async def owner_slots(turf_id: str, date: str, user=Depends(get_current_user)):
    turf = await turfs_col.find_one({"_id": turf_id, "ownerId": user["_id"]})
    if not turf:
        raise HTTPException(403, "Not your turf")
    return await ensure_slots(turf_id, date, turf.get("pricePerHour", 1000),
                               turf.get("openHour", 6), turf.get("closeHour", 23))

# ── Owner: Block/Unblock slots ─────────────────────────────────────────────────
@app.post("/api/owner/slots/{slot_id}/block")
async def block_slot(slot_id: str, user=Depends(get_current_user)):
    slot = await slots_col.find_one({"_id": slot_id})
    if not slot:
        raise HTTPException(404, "Slot not found")
    turf = await turfs_col.find_one({"_id": slot["turfId"], "ownerId": user["_id"]})
    if not turf:
        raise HTTPException(403, "Not your turf")
    if slot.get("isBooked"):
        raise HTTPException(400, "Slot is already booked by a player")
    await slots_col.update_one({"_id": slot_id}, {"$set": {"isBlocked": True}})
    updated = await slots_col.find_one({"_id": slot_id})
    return safe_slot(updated)

@app.post("/api/owner/slots/{slot_id}/unblock")
async def unblock_slot(slot_id: str, user=Depends(get_current_user)):
    slot = await slots_col.find_one({"_id": slot_id})
    if not slot:
        raise HTTPException(404, "Slot not found")
    turf = await turfs_col.find_one({"_id": slot["turfId"], "ownerId": user["_id"]})
    if not turf:
        raise HTTPException(403, "Not your turf")
    await slots_col.update_one({"_id": slot_id}, {"$set": {"isBlocked": False}})
    updated = await slots_col.find_one({"_id": slot_id})
    return safe_slot(updated)

# ── Owner: Bookings ─────────────────────────────────────────────────────────────
@app.get("/api/owner/turfs/{turf_id}/bookings")
async def owner_bookings(turf_id: str, user=Depends(get_current_user)):
    turf = await turfs_col.find_one({"_id": turf_id, "ownerId": user["_id"]})
    if not turf:
        raise HTTPException(403, "Not your turf")
    bks = await bookings_col.find({"turfId": turf_id}).sort("createdAt", -1).to_list(None)
    return [safe_booking(b) for b in bks]

# ── Owner: Cancel Booking ──────────────────────────────────────────────────────
@app.post("/api/owner/bookings/{booking_id}/cancel")
async def cancel_booking(booking_id: str, user=Depends(get_current_user)):
    booking = await bookings_col.find_one({"_id": booking_id})
    if not booking:
        raise HTTPException(404, "Booking not found")
    turf = await turfs_col.find_one({"_id": booking["turfId"], "ownerId": user["_id"]})
    if not turf:
        raise HTTPException(403, "Not your turf")
    if booking.get("status") == "cancelled":
        raise HTTPException(400, "Booking is already cancelled")
    await bookings_col.update_one({"_id": booking_id}, {"$set": {"status": "cancelled"}})
    # Unbook the time slots
    start_hour = int(booking["startTime"].split(":")[0])
    duration_hours = math.ceil(booking.get("duration", 60) / 60)
    for i in range(duration_hours):
        slot_id = f"{booking['turfId']}-{booking['date']}-{(start_hour + i):02d}"
        await slots_col.update_one({"_id": slot_id}, {"$set": {"isBooked": False}})
    updated = await bookings_col.find_one({"_id": booking_id})
    return safe_booking(updated)

# ── Owner: Update Turf Profile ─────────────────────────────────────────────────
@app.patch("/api/owner/turf/profile")
async def update_turf_profile(body: TurfProfileUpdate, user=Depends(get_current_user)):
    if user.get("role") != "turf_owner":
        raise HTTPException(403, "Not a turf owner")
    turf = await turfs_col.find_one({"ownerId": user["_id"]})
    if not turf:
        raise HTTPException(404, "Turf not found")
    update = {}
    if body.name is not None:
        update["name"] = body.name
    if body.address is not None:
        update["address"] = body.address
    if body.pricePerHour is not None:
        if body.pricePerHour < 100:
            raise HTTPException(400, "Price must be at least ₹100")
        update["pricePerHour"] = body.pricePerHour
    if body.openHour is not None:
        update["openHour"] = max(0, min(22, body.openHour))
    if body.closeHour is not None:
        update["closeHour"] = max(1, min(24, body.closeHour))
    if body.imageUrls is not None:
        update["imageUrl"] = body.imageUrls[0] if body.imageUrls else turf.get("imageUrl")
        update["imageUrls"] = body.imageUrls
    if body.amenities is not None:
        update["amenities"] = body.amenities
    if body.sportTypes is not None:
        update["sportTypes"] = body.sportTypes
    if update:
        await turfs_col.update_one({"_id": turf["_id"]}, {"$set": update})
        # Sync user fields if name/address changed
        user_update = {}
        if body.name:
            user_update["turfName"] = body.name
        if body.address:
            user_update["turfAddress"] = body.address
        if user_update:
            await users_col.update_one({"_id": user["_id"]}, {"$set": user_update})
        # If price or hours changed, delete future slots so they regenerate with new pricing
        if body.pricePerHour is not None or body.openHour is not None or body.closeHour is not None:
            today_str = datetime.now(timezone.utc).strftime("%Y-%m-%d")
            await slots_col.delete_many({
                "turfId": turf["_id"],
                "date": {"$gte": today_str},
                "isBooked": False,
            })
    updated_turf = await turfs_col.find_one({"_id": turf["_id"]})
    return safe_turf(updated_turf)

# ── Owner: Analytics ───────────────────────────────────────────────────────────
@app.get("/api/owner/analytics")
async def owner_analytics(turf_id: str = Query(None), user=Depends(get_current_user)):
    if user.get("role") != "turf_owner":
        raise HTTPException(403, "Not a turf owner")
    # Get all turfs for this owner
    if turf_id:
        turf = await turfs_col.find_one({"_id": turf_id, "ownerId": user["_id"]})
        if not turf:
            raise HTTPException(403, "Not your turf")
        turf_ids = [turf_id]
    else:
        turfs = await turfs_col.find({"ownerId": user["_id"]}).to_list(None)
        turf_ids = [t["_id"] for t in turfs]

    all_bookings = await bookings_col.find({"turfId": {"$in": turf_ids}}).to_list(None)
    active_bookings = [b for b in all_bookings if b.get("status") != "cancelled"]

    total_revenue = sum(b.get("totalAmount", 0) for b in active_bookings)
    total_bookings = len(active_bookings)
    cancelled_bookings = len([b for b in all_bookings if b.get("status") == "cancelled"])

    # Monthly revenue - last 6 months
    now = datetime.now(timezone.utc)
    monthly = {}
    for i in range(5, -1, -1):
        month_dt = now - timedelta(days=30 * i)
        key = month_dt.strftime("%b %Y")
        monthly[key] = {"month": month_dt.strftime("%b"), "revenue": 0, "bookings": 0}

    for b in active_bookings:
        created = b.get("createdAt")
        if created:
            if isinstance(created, str):
                try:
                    created = datetime.fromisoformat(created)
                except Exception:
                    continue
            key = created.strftime("%b %Y")
            if key in monthly:
                monthly[key]["revenue"] += b.get("totalAmount", 0)
                monthly[key]["bookings"] += 1

    monthly_revenue = list(monthly.values())

    # Peak hours
    hour_counts: dict = {}
    for b in active_bookings:
        start = b.get("startTime", "")
        if start:
            hour_counts[start] = hour_counts.get(start, 0) + 1
    peak_hours = [{"hour": h, "count": c} for h, c in sorted(hour_counts.items())]

    # Recent bookings (last 5)
    recent = sorted(active_bookings, key=lambda b: b.get("createdAt") or datetime.min, reverse=True)[:5]

    # Occupancy rate (last 30 days active bookings / total possible slots)
    total_slots_30 = len(turf_ids) * 17 * 30  # 17 slots/day approximation
    occ_rate = round((len(active_bookings) / max(total_slots_30, 1)) * 100, 1)

    return {
        "totalRevenue": total_revenue,
        "totalBookings": total_bookings,
        "cancelledBookings": cancelled_bookings,
        "occupancyRate": min(occ_rate, 100),
        "monthlyRevenue": monthly_revenue,
        "peakHours": peak_hours,
        "recentBookings": [safe_booking(b) for b in recent],
    }

# ── Reviews ────────────────────────────────────────────────────────────────────
@app.get("/api/turfs/{turf_id}/reviews")
async def get_reviews(turf_id: str):
    reviews = await reviews_col.find({"turfId": turf_id}).sort("createdAt", -1).to_list(None)
    return [{"id": r["_id"], "turfId": r["turfId"], "userId": r.get("userId"),
             "userName": r.get("userName", "Anonymous"), "rating": r.get("rating"),
             "comment": r.get("comment"), "createdAt": r.get("createdAt").isoformat() if r.get("createdAt") else None}
            for r in reviews]

@app.post("/api/turfs/{turf_id}/reviews")
async def submit_review(turf_id: str, body: ReviewCreate, user=Depends(get_current_user)):
    if body.rating < 1 or body.rating > 5:
        raise HTTPException(400, "Rating must be between 1 and 5")
    # Check if user has booked this turf
    existing_booking = await bookings_col.find_one({"turfId": turf_id, "userId": user["_id"]})
    if not existing_booking:
        raise HTTPException(403, "You must have booked this turf to leave a review")
    # Check if already reviewed
    existing_review = await reviews_col.find_one({"turfId": turf_id, "userId": user["_id"]})
    if existing_review:
        raise HTTPException(409, "You have already reviewed this turf")
    review_id = str(uuid.uuid4())
    review = {
        "_id": review_id, "turfId": turf_id, "userId": user["_id"],
        "userName": user.get("fullName") or user.get("username"),
        "rating": body.rating, "comment": body.comment,
        "createdAt": datetime.now(timezone.utc),
    }
    await reviews_col.insert_one(review)
    # Update turf average rating
    all_reviews = await reviews_col.find({"turfId": turf_id}).to_list(None)
    avg = round(sum(r["rating"] for r in all_reviews) / len(all_reviews))
    await turfs_col.update_one({"_id": turf_id}, {"$set": {"rating": avg}})
    return {"id": review_id, "turfId": turf_id, "rating": body.rating, "comment": body.comment}

@app.get("/api/owner/turfs/{turf_id}/reviews")
async def owner_reviews(turf_id: str, user=Depends(get_current_user)):
    turf = await turfs_col.find_one({"_id": turf_id, "ownerId": user["_id"]})
    if not turf:
        raise HTTPException(403, "Not your turf")
    reviews = await reviews_col.find({"turfId": turf_id}).sort("createdAt", -1).to_list(None)
    return [{"id": r["_id"], "turfId": r["turfId"], "userId": r.get("userId"),
             "userName": r.get("userName", "Anonymous"), "rating": r.get("rating"),
             "comment": r.get("comment"), "createdAt": r.get("createdAt").isoformat() if r.get("createdAt") else None}
            for r in reviews]

# ── Turfs (Public) ─────────────────────────────────────────────────────────────
@app.get("/api/turfs")
async def get_turfs():
    turfs = await turfs_col.find({}).to_list(None)
    return [safe_turf(t) for t in turfs]

@app.get("/api/turfs/{turf_id}")
async def get_turf(turf_id: str):
    turf = await turfs_col.find_one({"_id": turf_id})
    if not turf:
        raise HTTPException(404, "Turf not found")
    return safe_turf(turf)

@app.get("/api/turfs/{turf_id}/slots/{date}")
async def get_turf_slots(turf_id: str, date: str):
    turf = await turfs_col.find_one({"_id": turf_id})
    if not turf:
        raise HTTPException(404, "Turf not found")
    return await ensure_slots(turf_id, date, turf.get("pricePerHour", 1000),
                               turf.get("openHour", 6), turf.get("closeHour", 23))

# ── Bookings ───────────────────────────────────────────────────────────────────
@app.get("/api/bookings")
async def get_all_bookings():
    bks = await bookings_col.find({}).to_list(None)
    return [safe_booking(b) for b in bks]

@app.get("/api/bookings/{booking_id}")
async def get_booking(booking_id: str):
    b = await bookings_col.find_one({"_id": booking_id})
    if not b:
        raise HTTPException(404, "Booking not found")
    return safe_booking(b)

@app.post("/api/bookings")
async def create_booking(body: BookingCreate, request: Request):
    user = await get_optional_user(request)
    turf = await turfs_col.find_one({"_id": body.turfId})
    if not turf:
        raise HTTPException(404, "Turf not found")
    slots = await ensure_slots(body.turfId, body.date, turf.get("pricePerHour", 1000),
                                turf.get("openHour", 6), turf.get("closeHour", 23))
    duration_hours = math.ceil(body.duration / 60)
    start_hour = int(body.startTime.split(":")[0])
    required_slots = []
    for i in range(duration_hours):
        needed = f"{(start_hour + i):02d}:00"
        match = next((s for s in slots if s["startTime"] == needed), None)
        if not match:
            raise HTTPException(409, "Time slot is outside of operational hours or missing")
        if match["isBooked"]:
            raise HTTPException(409, "One or more of the selected time slots are already booked")
        if match["isBlocked"]:
            raise HTTPException(409, "One or more of the selected time slots are blocked by the owner")
        required_slots.append(match)
    for rs in required_slots:
        await slots_col.update_one({"_id": rs["id"]}, {"$set": {"isBooked": True}})
    bid = str(uuid.uuid4())
    booking = {
        "_id": bid, "turfId": body.turfId, "turfName": body.turfName,
        "turfAddress": body.turfAddress, "date": body.date, "startTime": body.startTime,
        "endTime": body.endTime, "duration": body.duration, "totalAmount": body.totalAmount,
        "paidAmount": body.paidAmount, "balanceAmount": body.balanceAmount,
        "paymentMethod": body.paymentMethod, "status": "confirmed", "bookingCode": body.bookingCode,
        "userId": user["_id"] if user else body.userId,
        "userName": (user.get("fullName") or user.get("username")) if user else body.userName,
        "userPhone": user.get("phoneNumber") if user else body.userPhone,
        "createdAt": datetime.now(timezone.utc),
    }
    await bookings_col.insert_one(booking)
    return safe_booking(booking)

# ── Admin Routes ───────────────────────────────────────────────────────────────
def require_admin(admin_key: str = Query(None, alias="adminKey")):
    if admin_key != ADMIN_KEY:
        raise HTTPException(403, "Forbidden")
    return admin_key

@app.get("/api/admin/stats")
async def admin_stats(key=Depends(require_admin)):
    total_players = await users_col.count_documents({"role": "player"})
    total_owners = await users_col.count_documents({"role": "turf_owner"})
    pending_accounts = await users_col.count_documents({"ownerStatus": "pending_account"})
    pending_turfs = await users_col.count_documents({"turfStatus": "pending_turf"})
    approved_owners = await users_col.count_documents({"ownerStatus": "account_approved"})
    rejected_owners = await users_col.count_documents({"ownerStatus": "account_rejected"})
    total_turfs = await turfs_col.count_documents({})
    total_bookings = await bookings_col.count_documents({})
    return {"totalPlayers": total_players, "totalOwners": total_owners,
            "pendingAccounts": pending_accounts, "pendingTurfs": pending_turfs,
            "approvedOwners": approved_owners, "rejectedOwners": rejected_owners,
            "totalTurfs": total_turfs, "totalBookings": total_bookings}

@app.get("/api/admin/owners")
async def admin_pending_owners(key=Depends(require_admin)):
    owners = await users_col.find({"ownerStatus": "pending_account"}).to_list(None)
    return [safe_user(o) for o in owners]

@app.get("/api/admin/pending-turfs")
async def admin_pending_turfs(key=Depends(require_admin)):
    owners = await users_col.find({"turfStatus": "pending_turf"}).to_list(None)
    return [safe_user(o) for o in owners]

@app.get("/api/admin/all-owners")
async def admin_all_owners(key=Depends(require_admin)):
    owners = await users_col.find({"role": "turf_owner"}).to_list(None)
    return [safe_user(o) for o in owners]

@app.get("/api/admin/players")
async def admin_players(key=Depends(require_admin)):
    players = await users_col.find({"role": "player"}).to_list(None)
    return [safe_user(p) for p in players]

@app.get("/api/admin/bookings")
async def admin_bookings(key=Depends(require_admin)):
    bks = await bookings_col.find({}).to_list(None)
    return [safe_booking(b) for b in bks]

@app.post("/api/admin/owners/{owner_id}/approve")
async def admin_approve_account(owner_id: str, key=Depends(require_admin)):
    user = await users_col.find_one({"_id": owner_id})
    if not user:
        raise HTTPException(404, "Owner not found")
    await users_col.update_one({"_id": owner_id}, {"$set": {"ownerStatus": "account_approved"}})
    updated = await users_col.find_one({"_id": owner_id})
    return safe_user(updated)

@app.post("/api/admin/owners/{owner_id}/reject")
async def admin_reject_account(owner_id: str, key=Depends(require_admin)):
    user = await users_col.find_one({"_id": owner_id})
    if not user:
        raise HTTPException(404, "Owner not found")
    await users_col.update_one({"_id": owner_id}, {"$set": {"ownerStatus": "account_rejected"}})
    updated = await users_col.find_one({"_id": owner_id})
    return safe_user(updated)

@app.post("/api/admin/owners/{owner_id}/approve-turf")
async def admin_approve_turf(owner_id: str, key=Depends(require_admin)):
    user = await users_col.find_one({"_id": owner_id})
    if not user:
        raise HTTPException(404, "Owner not found")
    await users_col.update_one({"_id": owner_id}, {"$set": {"turfStatus": "turf_approved"}})
    # Create turf if not existing
    existing_turf = await turfs_col.find_one({"ownerId": owner_id})
    if not existing_turf and user.get("turfName"):
        turf_id = f"owner-turf-{owner_id}"
        image_url = (user.get("turfImageUrls") or [TURF_IMAGES[0]])[0]
        await turfs_col.insert_one({
            "_id": turf_id, "ownerId": owner_id,
            "name": user.get("turfName"), "location": user.get("turfLocation"),
            "address": user.get("turfAddress"), "imageUrl": image_url,
            "imageUrls": user.get("turfImageUrls", []),
            "rating": 5, "amenities": [], "sportTypes": ["Cricket"],
            "pricePerHour": 1000, "isAvailable": True, "featured": False,
            "openHour": 6, "closeHour": 23,
        })
    updated = await users_col.find_one({"_id": owner_id})
    return safe_user(updated)

@app.post("/api/admin/owners/{owner_id}/reject-turf")
async def admin_reject_turf(owner_id: str, key=Depends(require_admin)):
    user = await users_col.find_one({"_id": owner_id})
    if not user:
        raise HTTPException(404, "Owner not found")
    await users_col.update_one({"_id": owner_id}, {"$set": {"turfStatus": "turf_rejected"}})
    updated = await users_col.find_one({"_id": owner_id})
    return safe_user(updated)

@app.post("/api/admin/locations")
async def admin_add_location(request: Request, key=Depends(require_admin)):
    body = await request.json()
    name = body.get("name", "").strip()
    if not name:
        raise HTTPException(400, "Location name is required")
    await locations_col.update_one({"_id": "config"}, {"$addToSet": {"values": name}}, upsert=True)
    doc = await locations_col.find_one({"_id": "config"})
    return doc.get("values", [])

@app.delete("/api/admin/locations/{name}")
async def admin_remove_location(name: str, key=Depends(require_admin)):
    await locations_col.update_one({"_id": "config"}, {"$pull": {"values": name}})
    doc = await locations_col.find_one({"_id": "config"})
    return doc.get("values", [])

# ── App Feedback ───────────────────────────────────────────────────────────────
@app.get("/api/feedback")
async def get_feedback(user=Depends(get_current_user)):
    fb = await db["app_feedback"].find_one({"userId": user["_id"]})
    if not fb:
        return None
    return {"id": fb["_id"], "userId": fb["userId"], "rating": fb["rating"],
            "feedback": fb.get("feedback"), "createdAt": fb.get("createdAt").isoformat() if fb.get("createdAt") else None}

@app.post("/api/feedback")
async def upsert_feedback(body: AppFeedbackBody, user=Depends(get_current_user)):
    if body.rating < 1 or body.rating > 5:
        raise HTTPException(400, "Rating must be between 1 and 5")
    await db["app_feedback"].update_one(
        {"userId": user["_id"]},
        {"$set": {"rating": body.rating, "feedback": body.feedback, "updatedAt": datetime.now(timezone.utc)},
         "$setOnInsert": {"_id": str(uuid.uuid4()), "createdAt": datetime.now(timezone.utc)}},
        upsert=True
    )
    fb = await db["app_feedback"].find_one({"userId": user["_id"]})
    return {"id": fb["_id"], "userId": fb["userId"], "rating": fb["rating"], "feedback": fb.get("feedback")}
