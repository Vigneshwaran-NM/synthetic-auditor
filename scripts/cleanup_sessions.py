# cleanup_sessions.py (run as cron job)
#!/usr/bin/env python3
import sqlite3
from datetime import datetime

conn = sqlite3.connect('sessions.db')
cursor = conn.cursor()

cursor.execute(
    "DELETE FROM sessions WHERE expiry < ?",
    (datetime.now().isoformat(),)
)

deleted_count = cursor.rowcount
conn.commit()
conn.close()

print(f"Cleaned up {deleted_count} expired sessions")