"""
migrate.py
Run once to add the dose_logs table to your existing database.
Usage: python migrate.py
"""

from sqlalchemy import create_engine, text, inspect
import os

# ── Match whatever you use in your app ────────────────────────────────────────
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./app.db")
# ─────────────────────────────────────────────────────────────────────────────

engine = create_engine(DATABASE_URL)


def run():
    inspector = inspect(engine)
    existing_tables = inspector.get_table_names()

    if "dose_logs" in existing_tables:
        print("✅  dose_logs table already exists — nothing to do.")
        return

    print("⏳  Creating dose_logs table...")

    with engine.begin() as conn:
        conn.execute(text("""
            CREATE TABLE dose_logs (
                id                  VARCHAR PRIMARY KEY,
                medication_time_id  VARCHAR NOT NULL REFERENCES medication_times(id) ON DELETE CASCADE,
                user_id             VARCHAR NOT NULL REFERENCES users(id) ON DELETE CASCADE,
                date                VARCHAR NOT NULL,
                taken               BOOLEAN NOT NULL DEFAULT 0
            )
        """))

        # Index for fast per-day lookups
        conn.execute(text("""
            CREATE INDEX ix_dose_logs_time_date
            ON dose_logs (medication_time_id, date)
        """))

        conn.execute(text("""
            CREATE INDEX ix_dose_logs_user_date
            ON dose_logs (user_id, date)
        """))

    print("✅  dose_logs table created successfully.")
    print()
    print("Next steps:")
    print("  1. Add the DoseLog model to your models.py (see previous instructions).")
    print("  2. Deploy your updated backend.")
    print("  3. Replace DoseTrackerScreen.jsx with the new version.")


if __name__ == "__main__":
    run()
