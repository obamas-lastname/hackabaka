## Usage
To install all dependencies run:
```bash
python3 -m venv venv
source vevn/bin/activate
pip install -r requirements.txt
``` 

To train the AI model on a given CSV dataset:
```bash
python3 train_model.py --input hackathon_train.csv --db history.db --output-model model.pkl --features features.json
```

To run the AI model as backend:
```bash
python3 -m uvicorn fraud_api:app --host 127.0.0.1 --port 8000
python3 sse_to_predict.py
```
