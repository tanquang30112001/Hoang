import sqlite3
import json

conn = sqlite3.connect('findata.db')
cursor = conn.cursor()
cursor.execute("SELECT custom_data FROM user_uploaded_stocks WHERE ticker='TCB'")
row = cursor.fetchone()
data = json.loads(row[0])

for sheet, items in data.items():
    print(f"--- Sheet: {sheet} ---")
    for item in items:
        ind = item['indicator'].strip().lower()
        if 'ratio' in ind or 'nim' in ind or 'casa' in ind or 'car' in ind or 'ldr' in ind or 'npl' in ind or 'llr' in ind:
            print(item['indicator'], ":", item['value'])
