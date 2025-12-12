from database import engine, Base
# Import all models so SQLAlchemy knows about them
import models


def init_db():
    # Creates all tables defined in models that inherit from Base
    Base.metadata.create_all(bind=engine)


if __name__ == "__main__":
    init_db()
    print("✅ SQLite database initialized successfully!")
