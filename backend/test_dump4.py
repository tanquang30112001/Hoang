import sqlite3, json

conn = sqlite3.connect('findata.db')
cursor = conn.cursor()
cursor.execute("SELECT custom_data FROM user_uploaded_stocks WHERE ticker='TCB' AND report_type='Yearly'")
row = cursor.fetchone()
custom_data = json.loads(row[0])

ticker_data = {}
for sheet, items in custom_data.items():
    for item in items:
        ind = item["indicator"].lower()
        s_ind = ind.strip()
        normalized_ind = None
        
        if s_ind == "loans and advances to customers": normalized_ind = "Loans"
        
        if normalized_ind:
            period = str(item["period"]).strip()
            if "Q" in period: continue
            
            y = period.replace('.0', '')
            if y not in ticker_data:
                ticker_data[y] = []
            ticker_data[y].append((sheet, float(item["value"] or 0)))

import pprint
pprint.pprint(ticker_data)
