import sqlite3, json

conn = sqlite3.connect('findata.db')
cursor = conn.cursor()
cursor.execute("SELECT custom_data FROM user_uploaded_stocks WHERE ticker='TCB'")
row = cursor.fetchone()
custom_data = json.loads(row[0])

ticker_data = {}
for sheet, items in custom_data.items():
    for item in items:
        ind = item["indicator"].lower()
        s_ind = ind.strip()
        normalized_ind = None
        
        if "net interest and similar income" in ind or "net interest income" in ind: normalized_ind = "NII"
        elif "attributable to parent company" in ind: normalized_ind = "Net Profit Parent"
        elif "owner's equity" in ind or s_ind == "total equity" or s_ind == "equity": normalized_ind = "Equity"
        elif s_ind == "loans and advances to customers, net": normalized_ind = "Net Loans"
        elif s_ind == "loans and advances to customers" or s_ind == "loans to customers": normalized_ind = "Loans"
        elif s_ind == "customer deposits" or s_ind == "deposits from customers": normalized_ind = "Deposits"
        elif "term deposits" == s_ind: normalized_ind = "Term Deposits"
        elif "demand deposits" in ind or "current deposits" in ind: normalized_ind = "Demand Deposits"
        elif "margin deposits" in ind: normalized_ind = "Margin Deposits"
        elif "savings deposits" in ind: normalized_ind = "Savings Deposits"
        elif "balances with the sbv" in ind or "balances with the state bank" in ind: normalized_ind = "SBV Balances"
        elif "placements with and loans to other credit institutions" in ind or ("deposits with" in ind and "loans to other" in ind): normalized_ind = "Interbank Assets"
        elif s_ind == "investment securities": normalized_ind = "Investment Securities"
        elif "interest and similar expenses" in ind: normalized_ind = "Interest Expense"
        elif "deposits and borrowings from other credit institutions" in ind: normalized_ind = "Interbank Borrowings"
        elif "valuable papers issued" in ind or "convertible bonds/cds and other valuable papers issued" in ind: normalized_ind = "Valuable Papers"
        
        # Grading
        elif "substandard" == s_ind: normalized_ind = "Substandard"
        elif "doubtful" == s_ind: normalized_ind = "Doubtful"
        elif "bad" == s_ind: normalized_ind = "Bad"
        
        # Provisions & NPL Amount (legacy fallback)
        elif "ix. non-performing loans" in ind: normalized_ind = "NPL_Amount"
        elif "provision for customer loans" in ind or "allowance for loans to customers" in ind or "provision for losses on loans and advances to customers" in ind: normalized_ind = "LLR_Amount"
        
        # Ratios from Ratio Sheet
        elif s_ind == "car": normalized_ind = "CAR_Ratio"
        elif s_ind == "casa ratio": normalized_ind = "CASA_Ratio"
        elif s_ind == "nim": normalized_ind = "NIM_Ratio"
        elif "average cost of financing (cof)" in ind: normalized_ind = "COF_Ratio"
        elif "percentage of average total assets" in ind: normalized_ind = "ROA_Ratio"
        elif "percentage of average shareholders' equity" in ind: normalized_ind = "ROE_Ratio"
        elif "gross loan/ deposit (ldr)" in ind: normalized_ind = "LDR_Ratio"
        elif "problem loans" in ind and "percentage of gross loans" in ind: normalized_ind = "NPL_Ratio"
        elif "loan-loss reserves/npls" in ind: normalized_ind = "LLR_Ratio"
        
        elif "total assets" == s_ind: normalized_ind = "Assets"
        elif "net profit/(loss) after tax" in ind or s_ind == "net profit": normalized_ind = "Net Profit"
        elif "net fee and commission income" in ind: normalized_ind = "Net Fee"
        elif "foreign currency" in ind and "gain" in ind: normalized_ind = "Net FX"
        elif "other operating income" in ind: normalized_ind = "Other Income"
        elif "operating expenses" == s_ind: normalized_ind = "OPEX"
        elif "provision for credit losses" in ind: normalized_ind = "Provision"
        elif "profit before tax" in ind: normalized_ind = "PBT"
        
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
pprint.pprint({k: v for k, v in ticker_data.items() if k == '2023'})
