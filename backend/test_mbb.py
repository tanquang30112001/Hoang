import sqlite3, json

conn = sqlite3.connect('findata.db')
conn.row_factory = sqlite3.Row
cursor = conn.cursor()
cursor.execute("SELECT custom_data FROM user_uploaded_stocks WHERE ticker='MBB' AND report_type='Yearly'")
row = cursor.fetchone()
custom_data = json.loads(row["custom_data"])

ticker_data = {}
for sheet, items in custom_data.items():
    for item in items:
        ind = item["indicator"].lower()
        s_ind = ind.strip()
        normalized_ind = None
        
        if "average cost of financing (cof)" in ind: normalized_ind = "COF_Ratio"
        elif "interest and similar expenses" in ind: normalized_ind = "Interest Expense"
        elif s_ind == "customer deposits" or s_ind == "deposits from customers": normalized_ind = "Deposits"
        
        if normalized_ind:
            period = str(item["period"]).strip()
            if "Q" in period: continue
            
            y = period.replace('.0', '')
            if y not in ticker_data:
                ticker_data[y] = {}
            if normalized_ind not in ticker_data[y]:
                ticker_data[y][normalized_ind] = []
            ticker_data[y][normalized_ind].append(float(item["value"] or 0))

import pprint
pprint.pprint(ticker_data)
conn.close()
