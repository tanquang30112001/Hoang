import sqlite3

conn = sqlite3.connect('findata.db')
conn.row_factory = sqlite3.Row
cursor = conn.cursor()
cursor.execute("SELECT ticker, icb_level_2 FROM companies ORDER BY ticker")
rows = cursor.fetchall()
print(f"Total companies in lookup table: {len(rows)}")
for r in rows:
    print(f"  {r['ticker']} -> {r['icb_level_2']}")

print("\n--- Uploaded stocks ---")
cursor.execute("SELECT ticker, icb_level_2, report_type FROM user_uploaded_stocks")
rows2 = cursor.fetchall()
for r in rows2:
    print(f"  {r['ticker']} -> {r['icb_level_2']} ({r['report_type']})")
conn.close()
