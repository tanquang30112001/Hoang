import sqlite3
import json

conn = sqlite3.connect('findata_copy.db')
tickers = conn.execute('SELECT DISTINCT ticker FROM user_uploaded_stocks').fetchall()
print('Tickers in DB:', [t[0] for t in tickers])

row = conn.execute('SELECT custom_data FROM user_uploaded_stocks WHERE ticker="TCB" LIMIT 1').fetchone()
if not row:
    print('No data for TCB.')
else:
    print('Found TCB data. Extracting keys...')
    custom_data = json.loads(row[0])
    items = list(set(item['indicator'].strip() for sheet in custom_data.values() for item in sheet))
    
    print("\n--- CAR ---")
    print([i for i in items if 'car' in i.lower() or 'tier' in i.lower() or 'adequacy' in i.lower()])
    
    print("\n--- ROE ---")
    print([i for i in items if 'parent' in i.lower() or 'attributable' in i.lower() or 'equity' in i.lower()])
    
    print("\n--- CASA ---")
    print([i for i in items if 'demand' in i.lower() or 'margin' in i.lower() or 'current' in i.lower() or 'sight' in i.lower()])
    
    print("\n--- NPL ---")
    print([i for i in items if 'substandard' in i.lower() or 'doubtful' in i.lower() or 'loss' in i.lower() or 'non-performing' in i.lower()])
    
    print("\n--- COF ---")
    print([i for i in items if 'interest' in i.lower() and 'expense' in i.lower()])
    
    print("\n--- NIM ---")
    print([i for i in items if 'interest' in i.lower() and 'income' in i.lower()])
