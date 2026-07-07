import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker

DATABASE_URL = os.getenv("DATABASE_URL", "")

engine = None

if DATABASE_URL and DATABASE_URL.startswith("postgresql"):
    try:
        # Show connection target (masking password)
        connection_target = DATABASE_URL.split("@")[-1]
        print(f"Database: Attempting to connect to PostgreSQL at {connection_target}...")
        
        # Set connect_timeout to prevent long hangs on startup
        engine = create_engine(DATABASE_URL, connect_args={"connect_timeout": 5})
        
        # Test connection immediately
        conn = engine.connect()
        conn.close()
        print("Database: Successfully connected to PostgreSQL!")
    except Exception as e:
        print(f"Database: PostgreSQL connection failed: {str(e)}")
        print("Database: Falling back to SQLite...")
        engine = None

if engine is None:
    print("Database: Using SQLite (processity.db) as local database fallback...")
    DATABASE_URL = "sqlite:///./processity.db"
    # SQLite requires check_same_thread=False for FastAPI multithreaded requests
    engine = create_engine(DATABASE_URL, connect_args={"check_same_thread": False})

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

# Dependency to get db session in FastAPI routes
def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
