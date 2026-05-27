import urllib.request, json
data = json.loads(urllib.request.urlopen('http://localhost:8000/api/sectors/Banks/overview?user_id=059a4524-555c-491a-8c8a-dc9618f8d788&report_type=Yearly&last_periods=6').read())

for k in ['Deposits', 'Loans', 'Net Loans', 'Substandard', 'Doubtful', 'Bad', 'NPL_Amount', 'LLR_Amount', 'Provision', 'LDR', 'NPL', 'LLR', 'CAR']:
    try:
        tcb_data = next(x for x in data['metrics'].get(k, []) if x['ticker'] == 'TCB')
        print(k, ":", tcb_data['data'])
    except Exception as e:
        print(k, "not found")
