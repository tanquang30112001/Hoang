import sqlite3
import json

conn = sqlite3.connect("findata.db")
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

# Find all indicators with "charter" or "capital" or "issued" or "paid"
cursor.execute("SELECT ticker, report_type, custom_data FROM user_uploaded_stocks WHERE ticker='TCB' AND report_type='Yearly'")
row = cursor.fetchone()
data = json.loads(row['custom_data'])

print("=== Looking for Charter Capital / Share Capital ===")
for sheet_name, items in data.items():
    for item in items:
        ind = item['indicator'].lower()
        if any(k in ind for k in ['charter', 'share capital', 'paid-in', 'issued capital', 'von dieu le']):
            if item['period'] in ['2024', '2025']:
                print(f"[{sheet_name}] {item['period']}: {item['indicator']} = {item['value']}")

print("\n=== All Owner's Equity related ===")
for sheet_name, items in data.items():
    for item in items:
        ind = item['indicator'].lower()
        if "owner" in ind and item['period'] == '2025':
            print(f"[{sheet_name}] {item['period']}: {item['indicator']} = {item['value']}")

print("\n=== Balance Sheet equity section 2025 ===")
for item in data.get('Balance sheet', []):
    if item['period'] == '2025':
        ind = item['indicator'].lower()
        if any(k in ind for k in ['equity', 'capital', 'surplus', 'fund', 'retained', 'undistributed']):
            print(f"  {item['indicator']} = {item['value']}")

conn.close()
