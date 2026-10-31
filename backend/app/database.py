from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from .core.config import obter_obrigatoria, SQL_ECHO

DATABASE_URL = obter_obrigatoria("DATABASE_URL")

engine = create_engine(DATABASE_URL, echo=SQL_ECHO)

SessionLocal = sessionmaker(
    bind=engine,
    autoflush=False,
    autocommit=False
)

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
