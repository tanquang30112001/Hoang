import pandas as pd
import sqlite3

DB_FILE = "findata.db"

def import_icb():
    conn = sqlite3.connect(DB_FILE)
    cursor = conn.cursor()
    
    file_path = "../Ngành ICB level 2.xlsx"
    print(f"Reading {file_path}")
    
    # Read Sheet1, skip 7 rows so header is row 7
    df = pd.read_excel(file_path, sheet_name="Sheet1", skiprows=7)
    
    count = 0
    for _, row in df.iterrows():
        ticker = str(row.get('Ticker', '')).strip()
        name = str(row.get('Company Name', '')).strip()
        icb_l2 = str(row.get('Industrial sector (ICB) L2', '')).strip()
        
        if ticker != 'nan' and ticker != '' and ticker != 'None':
            cursor.execute('''
                INSERT OR REPLACE INTO companies (ticker, name, icb_level_2)
                VALUES (?, ?, ?)
            ''', (ticker, name, icb_l2))
            count += 1
            
    conn.commit()
    conn.close()
    print(f"Successfully imported {count} companies.")

if __name__ == '__main__':
    import_icb()
