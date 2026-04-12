import sqlite3
import os

db_path = "prescription_app.db"
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)
    cursor = conn.cursor()
    
    tables_to_add = [
        "CREATE TABLE IF NOT EXISTS family_members (id TEXT PRIMARY KEY, user_id TEXT, name TEXT, relation TEXT, age TEXT, blood_group TEXT, created_at DATETIME, FOREIGN KEY(user_id) REFERENCES users(id))",
        "CREATE TABLE IF NOT EXISTS symptom_lookups (id TEXT PRIMARY KEY, user_id TEXT, query TEXT, result_json TEXT, created_at DATETIME, FOREIGN KEY(user_id) REFERENCES users(id))"
    ]
    
    columns_to_add = [
        ("prescriptions", "member_id", "TEXT"),
        ("medications", "total_quantity", "FLOAT DEFAULT 30.0"),
        ("medications", "remaining_quantity", "FLOAT DEFAULT 30.0"),
        ("medications", "refill_threshold", "FLOAT DEFAULT 5.0"),
        ("medications", "is_refill_reminder_on", "BOOLEAN DEFAULT 1"),
        ("medications", "member_id", "TEXT")
    ]
    
    for table_cmd in tables_to_add:
        try:
            cursor.execute(table_cmd)
            print(f"Executed: {table_cmd[:50]}...")
        except Exception as e:
            print(f"Error creating table: {e}")
            
    for table, col, type_ in columns_to_add:
        try:
            cursor.execute(f"ALTER TABLE {table} ADD COLUMN {col} {type_}")
            print(f"Added {col} to {table}")
        except sqlite3.OperationalError as e:
            if "duplicate column name" in str(e).lower():
                print(f"Column {col} already exists in {table}")
            else:
                print(f"Error adding {col} to {table}: {e}")
                
    conn.commit()
    conn.close()
else:
    print("Database file not found.")
