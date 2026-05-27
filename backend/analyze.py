import pandas as pd
import sys
import json

def analyze(file_path):
    print(f"--- Analyzing {file_path} ---")
    xls = pd.ExcelFile(file_path)
    print("Sheets:", xls.sheet_names)
    for sheet in xls.sheet_names:
        print(f"\nSheet: {sheet}")
        df = pd.read_excel(xls, sheet_name=sheet, nrows=10)
        print("Columns:", df.columns.tolist())
        print(df.head(10).to_string())
        print("-" * 50)

if __name__ == "__main__":
    analyze("../FiinProX_FinancialData_FinancialStatement_Quarterly_Consolidated_VCB_20260522.xlsx")
    analyze("../FiinProX_FinancialData_FinancialStatement_Yearly_Consolidated_VCB_20260522.xlsx")
