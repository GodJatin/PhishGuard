import psycopg2
import os
from dotenv import load_dotenv

load_dotenv()
db_url = os.getenv("DATABASE_URL")
if db_url and "@" not in db_url.split("://")[1]:
    # Replace the missing @ before db.hvgd... if it was a typo in .env
    db_url = "postgresql://postgres:PhishGuardJ%40tin224@db.hvgdmeeojwvfquqsubvn.supabase.co:5432/postgres"

print("Trying with url:", db_url)
if db_url:
    try:
        conn = psycopg2.connect(db_url)
        conn.autocommit = True
        cursor = conn.cursor()
        cursor.execute("ALTER TABLE scans ADD COLUMN IF NOT EXISTS scan_source TEXT DEFAULT 'manual';")
        cursor.execute("ALTER TABLE scans ADD COLUMN IF NOT EXISTS scan_metadata JSONB DEFAULT '{}'::jsonb;")
        print("Migration successful")
        conn.close()
    except Exception as e:
        print(f"Error: {e}")
else:
    print("No DB URL")
