from sqlalchemy import Column, Integer, String, Text, Boolean, DateTime
from datetime import datetime
from .database import Base

class EmailConfig(Base):
    __tablename__ = "email_config"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    password = Column(String, nullable=False)  # Stored password (can be encrypted)
    smtp_host = Column(String, nullable=True)
    smtp_port = Column(Integer, default=465)
    imap_host = Column(String, nullable=True)
    imap_port = Column(Integer, default=993)
    gemini_api_key = Column(String, nullable=True)
    is_active = Column(Boolean, default=True)

class EmailRecord(Base):
    __tablename__ = "emails"

    id = Column(String, primary_key=True, index=True) # IMAP UID or UUID
    from_str = Column(String, nullable=False) # e.g. "John Doe <john@example.com>"
    from_name = Column(String, nullable=True)
    from_address = Column(String, nullable=True)
    to_str = Column(String, nullable=False)
    subject = Column(String, nullable=True)
    body = Column(Text, nullable=True)
    html_body = Column(Text, nullable=True)
    date = Column(DateTime, default=datetime.utcnow)
    is_unread = Column(Boolean, default=True)
    is_sent = Column(Boolean, default=False)
    thread_id = Column(String, index=True, nullable=True)

class ApiLog(Base):
    __tablename__ = "api_logs"

    id = Column(Integer, primary_key=True, index=True)
    ip_address = Column(String, index=True, nullable=True)
    endpoint = Column(String, index=True, nullable=False)
    method = Column(String, nullable=False)
    user_agent = Column(String, nullable=True)
    metadata_json = Column(Text, nullable=True) # Stores full headers or request details JSON
    timestamp = Column(DateTime, default=datetime.utcnow)

