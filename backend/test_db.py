import sqlite3

conn = sqlite3.connect('findata.db')
cursor = conn.cursor()
cursor.execute("SELECT upload_id, user_id, report_type FROM user_uploaded_stocks WHERE ticker='TCB'")
print(cursor.fetchall())
