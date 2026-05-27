import sqlite3
import uuid
import json

DB_FILE = "findata.db"

def create_connection():
    conn = sqlite3.connect(DB_FILE, check_same_thread=False)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = create_connection()
    cursor = conn.cursor()
    
    # 1. Bảng Users
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS users (
            user_id TEXT PRIMARY KEY,
            username TEXT UNIQUE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    ''')
    
    # 2. Bảng User Uploaded Stocks (Private Data)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS user_uploaded_stocks (
            upload_id TEXT PRIMARY KEY,
            user_id TEXT,
            ticker TEXT,
            icb_level_2 TEXT,
            custom_data TEXT,
            uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(user_id)
        )
    ''')
    
    # 3. Bảng User Dashboards (Lưu trạng thái)
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS user_dashboards (
            dashboard_id TEXT PRIMARY KEY,
            user_id TEXT UNIQUE,
            active_icb_sector TEXT,
            selected_tickers TEXT,
            chart_settings TEXT,
            last_updated TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (user_id) REFERENCES users(user_id)
        )
    ''')
    
    # Bảng companies từ trước để tra cứu
    cursor.execute('''
        CREATE TABLE IF NOT EXISTS companies (
            ticker TEXT PRIMARY KEY,
            name TEXT,
            icb_level_2 TEXT
        )
    ''')
    
    conn.commit()
    conn.close()

if __name__ == '__main__':
    init_db()
    print("Database schemas updated.")
