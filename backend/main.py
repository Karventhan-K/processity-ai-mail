import os
import json
import asyncio
from typing import List, Dict, Any, Optional
from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from dotenv import load_dotenv

# Load environment variables before importing local modules that read environment variables on import
load_dotenv(os.path.join(os.path.dirname(__file__), ".env"))

from .database import engine, Base, SessionLocal  # noqa: E402
from .models import EmailConfig  # noqa: E402
from .mail_service import mail_service  # noqa: E402
from .ai_service import ai_service  # noqa: E402

app = FastAPI(title="Processity AI Mail Backend")

# Enable CORS for frontend clients
origins_env = os.getenv("ALLOWED_ORIGINS", "")
if origins_env:
    origins = [origin.strip() for origin in origins_env.split(",") if origin.strip()]
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )
else:
    # In development, dynamically allow and reflect any HTTP/HTTPS origin
    # to support localhost, local IPs (e.g., 192.168.x.x), and docker containers.
    app.add_middleware(
        CORSMiddleware,
        allow_origins=[],
        allow_origin_regex="https?://.*",
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

# Keep track of active WebSocket connections
class ConnectionManager:
    def __init__(self):
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)

    async def broadcast(self, message: dict):
        for connection in self.active_connections:
            try:
                await connection.send_text(json.dumps(message))
            except Exception as e:
                print(f"WS Broadcast error: {e}")

manager = ConnectionManager()

# Setup new email WebSocket broadcast callback
def on_new_incoming_email(email_record: dict):
    print("FastAPI: Broadcasting new email via WebSocket...")
    loop = asyncio.get_event_loop()
    if loop.is_running():
        asyncio.run_coroutine_threadsafe(
            manager.broadcast({
                "type": "NEW_EMAIL",
                "email": email_record
            }), 
            loop
        )

mail_service.set_on_new_email(on_new_incoming_email)


@app.on_event("startup")
async def startup_event():
    # 1. Create DB tables automatically if they do not exist
    print("FastAPI: Initializing database tables...")
    Base.metadata.create_all(bind=engine)

    # 2. Check for active credentials in the database
    db = SessionLocal()
    try:
        active_config = db.query(EmailConfig).filter_by(is_active=True).first()
        if active_config:
            print(f"FastAPI: Found active saved credentials for {active_config.email}. Initializing services...")
            mail_conf = {
                "email": active_config.email,
                "password": active_config.password,
                "smtpHost": active_config.smtp_host,
                "smtpPort": active_config.smtp_port,
                "imapHost": active_config.imap_host,
                "imapPort": active_config.imap_port,
            }
            # Configure Mail Service on boot
            await mail_service.configure(mail_conf)
            # Configure AI service with API key
            ai_service.configure(active_config.gemini_api_key or os.getenv("OPENAI_API_KEY") or os.getenv("GEMINI_API_KEY") or "")
        else:
            # Configure with environment variables if no DB record exists
            env_email = os.getenv("EMAIL_USER")
            env_password = os.getenv("EMAIL_PASSWORD")
            env_api_key = os.getenv("OPENAI_API_KEY") or os.getenv("GEMINI_API_KEY") or ""
            
            ai_service.configure(env_api_key)



            if env_email and env_password:
                mail_conf = {
                    "email": env_email,
                    "password": env_password,
                    "smtpHost": os.getenv("SMTP_HOST", ""),
                    "smtpPort": os.getenv("SMTP_PORT", ""),
                    "imapHost": os.getenv("IMAP_HOST", ""),
                    "imapPort": os.getenv("IMAP_PORT", ""),
                }
                await mail_service.configure(mail_conf)
            else:
                print("FastAPI: No startup configuration found. Running in fallback MOCK mode.")
    except Exception as e:
        print(f"FastAPI startup initialization error: {e}")
    finally:
        db.close()


# --- WebSocket Endpoint ---
@app.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    print("WS client connected")
    try:
        # Send initial status connection mode
        await websocket.send_text(json.dumps({
            "type": "STATUS", 
            "mode": mail_service.mode
        }))
        while True:
            # Keep connection alive
            await websocket.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(websocket)
        print("WS client disconnected")
    except Exception as e:
        manager.disconnect(websocket)
        print(f"WS Connection closed with error: {e}")


# --- REST API Endpoints ---

class ConfigInput(BaseModel):
    email: Optional[str] = None
    password: Optional[str] = None
    smtpHost: Optional[str] = None
    smtpPort: Optional[int] = None
    imapHost: Optional[str] = None
    imapPort: Optional[int] = None
    geminiApiKey: Optional[str] = None


@app.get("/api/config")
def get_config():
    return {
        "mode": mail_service.mode,
        "email": mail_service.config.get("email") if mail_service.config else None,
        "hasApiKey": bool(ai_service.api_key)
    }


@app.post("/api/config")
async def post_config(data: ConfigInput):
    try:
        # 1. Configure AI
        if data.geminiApiKey is not None:
            ai_service.configure(data.geminiApiKey)

        # 2. Configure Mail
        mail_conf = {
            "email": data.email,
            "password": data.password,
            "smtpHost": data.smtpHost,
            "smtpPort": data.smtpPort,
            "imapHost": data.imapHost,
            "imapPort": data.imapPort,
        }

        # Attempt reconfiguration
        mail_result = await mail_service.configure(mail_conf if data.email else None)
        
        # Save API key to the active config in database
        if data.email:
            db = SessionLocal()
            try:
                db_config = db.query(EmailConfig).filter_by(email=data.email, is_active=True).first()
                if db_config:
                    db_config.gemini_api_key = data.geminiApiKey or ai_service.api_key or ""
                    db.commit()
            except Exception as e:
                print(f"Failed to save Gemini Key to DB: {e}")
            finally:
                db.close()

        # Broadcast status updates to connected WebSocket frontends
        await manager.broadcast({
            "type": "STATUS", 
            "mode": mail_service.mode
        })

        return {
            "success": mail_result["success"],
            "mode": mail_result["mode"],
            "error": mail_result.get("error"),
            "hasApiKey": bool(ai_service.api_key)
        }
    except Exception as e:
        print(f"Failed to post configuration updates: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@app.get("/api/emails")
async def get_emails():
    try:
        emails = await mail_service.fetch_emails()
        return {"success": True, "emails": emails}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class SendEmailInput(BaseModel):
    to: str
    subject: str
    body: str


@app.post("/api/emails/send")
async def send_email(data: SendEmailInput):
    try:
        result = await mail_service.send_email(to=data.to, subject=data.subject, body=data.body)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class ReplyEmailInput(BaseModel):
    emailId: str
    body: str


@app.post("/api/emails/reply")
async def reply_email(data: ReplyEmailInput):
    try:
        result = await mail_service.reply_email(email_id=data.emailId, body=data.body)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class ReadEmailInput(BaseModel):
    emailId: str
    unread: bool


@app.post("/api/emails/read")
async def mark_read_email(data: ReadEmailInput):
    try:
        result = await mail_service.mark_as_read(email_id=data.emailId, unread=data.unread)
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class SimulateInput(BaseModel):
    from_addr: str = Body(..., alias="from")
    subject: str
    body: str


@app.post("/api/emails/simulate-receive")
def simulate_receive(data: SimulateInput):
    try:
        simulated = mail_service.simulate_incoming_email(
            from_addr=data.from_addr, 
            subject=data.subject, 
            body=data.body
        )
        return {"success": True, "email": simulated}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


class ChatInput(BaseModel):
    message: str
    history: List[Dict[str, Any]] = []
    context: Dict[str, Any] = {}


@app.post("/api/assistant/chat")
async def chat_assistant(data: ChatInput):
    try:
        result = await ai_service.process_message(
            user_message=data.message, 
            chat_history=data.history, 
            context=data.context
        )
        return result
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
