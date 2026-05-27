import sqlite3
import json

conn = sqlite3.connect('findata.db')
conn.row_factory = sqlite3.Row
cursor = conn.cursor()

cursor.execute("SELECT custom_data FROM user_uploaded_stocks WHERE ticker='MBB' AND report_type='Yearly'")
row = cursor.fetchone()

if row:
    custom_data = json.loads(row['custom_data'])
    ticker_data = {}
    for sheet, items in custom_data.items():
        for item in items:
            ind = item['indicator'].lower()
            s_ind = ind.strip()
            normalized_ind = None
            if "net interest and similar income" in ind or "net interest income" in ind: normalized_ind = "NII"
            elif "interest and similar income" in ind and "net" not in ind: normalized_ind = "Interest Income"
            elif "total assets" == s_ind: normalized_ind = "Assets"
            elif "total earning assets" in ind: normalized_ind = "Total Earning Assets"
            elif "cash and precious metals" in ind: normalized_ind = "Cash"
            elif "fixed assets" == s_ind: normalized_ind = "Fixed Assets"
            elif "other assets" == s_ind: normalized_ind = "Other Assets"
            
            if normalized_ind:
                period = str(item['period']).strip().replace('.0', '')
                if period not in ticker_data: ticker_data[period] = {}
                val = float(item['value'] or 0)
                if abs(val) > abs(ticker_data[period].get(normalized_ind, 0)):
                    ticker_data[period][normalized_ind] = val
                    
    print(json.dumps(ticker_data, indent=2))
