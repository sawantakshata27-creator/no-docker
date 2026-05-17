from fastapi import FastAPI, APIRouter, HTTPException, Depends, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel, Field, ConfigDict
from typing import List, Optional
import uuid
from datetime import datetime, timezone
import jwt
from jwt import PyJWTError


ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB connection
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

# Supabase Configuration
SUPABASE_JWT_SECRET = os.environ.get('SUPABASE_JWT_SECRET', 'your-supabase-jwt-secret-here')

# Create the main app without a prefix
app = FastAPI()

# Create a router with the /api prefix
api_router = APIRouter(prefix="/api")

# Security
security = HTTPBearer(auto_error=False)

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


# Define Models
class StatusCheck(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    client_name: str
    timestamp: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class StatusCheckCreate(BaseModel):
    client_name: str

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    
    user_id: str
    email: str
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


# Auth Functions
async def verify_token(credentials: Optional[HTTPAuthorizationCredentials] = Depends(security)) -> dict:
    """
    Verify Supabase JWT token from Authorization header
    """
    if not credentials:
        raise HTTPException(status_code=401, detail="Authorization header missing")
    
    token = credentials.credentials
    
    try:
        # Decode and verify the JWT token
        payload = jwt.decode(
            token,
            SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            options={"verify_aud": False}  # Supabase doesn't always include aud
        )
        
        return payload
    except PyJWTError as e:
        logger.error(f"JWT verification failed: {str(e)}")
        raise HTTPException(status_code=401, detail="Invalid or expired token")


async def get_current_user(token_payload: dict = Depends(verify_token)) -> dict:
    """
    Get current user from token payload
    """
    user_id = token_payload.get("sub")
    if not user_id:
        raise HTTPException(status_code=401, detail="Invalid token payload")
    
    return {
        "user_id": user_id,
        "email": token_payload.get("email"),
        "metadata": token_payload.get("user_metadata", {})
    }


# Public Routes
@api_router.get("/")
async def root():
    return {"message": "Hello World - Supabase Auth Enabled"}

@api_router.get("/health")
async def health_check():
    return {"status": "healthy", "timestamp": datetime.now(timezone.utc).isoformat()}


# Auth Routes
@api_router.get("/auth/me")
async def get_me(current_user: dict = Depends(get_current_user)):
    """
    Get current user information
    """
    # Check if user exists in database, if not create
    user_doc = await db.users.find_one({"user_id": current_user["user_id"]}, {"_id": 0})
    
    if not user_doc:
        # Create new user in database
        new_user = {
            "user_id": current_user["user_id"],
            "email": current_user["email"],
            "full_name": current_user["metadata"].get("full_name"),
            "avatar_url": current_user["metadata"].get("avatar_url"),
            "created_at": datetime.now(timezone.utc)
        }
        await db.users.insert_one(new_user)
        user_doc = new_user
    
    return user_doc


# Protected Routes
@api_router.post("/status", response_model=StatusCheck)
async def create_status_check(
    input: StatusCheckCreate,
    current_user: dict = Depends(get_current_user)
):
    """
    Create a status check (protected route)
    """
    status_dict = input.model_dump()
    status_obj = StatusCheck(**status_dict)
    
    # Add user_id to the status check
    doc = status_obj.model_dump()
    doc['timestamp'] = doc['timestamp'].isoformat()
    doc['user_id'] = current_user["user_id"]
    
    _ = await db.status_checks.insert_one(doc)
    return status_obj

@api_router.get("/status", response_model=List[StatusCheck])
async def get_status_checks(current_user: dict = Depends(get_current_user)):
    """
    Get status checks for the current user (protected route)
    """
    # Exclude MongoDB's _id field and filter by user_id
    status_checks = await db.status_checks.find(
        {"user_id": current_user["user_id"]},
        {"_id": 0}
    ).to_list(1000)
    
    # Convert ISO string timestamps back to datetime objects
    for check in status_checks:
        if isinstance(check['timestamp'], str):
            check['timestamp'] = datetime.fromisoformat(check['timestamp'])
    
    return status_checks


# Include the router in the main app
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
