import sqlite3
import json

conn = sqlite3.connect('findata.db')
row = conn.execute('SELECT custom_data FROM user_uploaded_stocks WHERE ticker="TCB" LIMIT 1').fetchone()
if not row:
    with open('tcb_indicators.txt', 'w', encoding='utf-8') as f:
        f.write('No TCB data.')
else:
    custom_data = json.loads(row[0])
    items = list(set(item['indicator'].strip() for sheet in custom_data.values() for item in sheet))
    with open('tcb_indicators.txt', 'w', encoding='utf-8') as f:
        f.write('\n'.join(items))
