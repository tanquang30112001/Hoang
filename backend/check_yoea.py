import sqlite3
import json

conn = sqlite3.connect('findata.db')
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

cursor.execute("SELECT custom_data FROM user_uploaded_stocks WHERE ticker='MBB' AND report_type='Yearly'")
row = cursor.fetchone()

if row:
    custom_data = json.loads(row['custom_data'])
    for sheet, items in custom_data.items():
        for item in items:
            ind = item['indicator'].lower()
            if 'interest' in ind and 'income' in ind:
                print(f"Sheet: {sheet}, Indicator: {item['indicator']}")
            if 'earning assets' in ind:
                print(f"Sheet: {sheet}, Indicator: {item['indicator']}")
