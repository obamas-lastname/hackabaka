## Environment Setup & Build

**1. Environment Configuration**

Create a `.env` file in the project root (copy from `.env.example`):

```bash
cp .env.example .env
```

The `.env` file contains API key, URLs, and processing configuration:

```env
# API Authentication
API_KEY=your_api_key_here

# URLs Configuration
STREAM_URL=https://95.217.75.14:8443/stream
FLAG_URL=https://95.217.75.14:8443/api/flag
LOCAL_PREDICT_URL=http://127.0.0.1:8000/predict?store=1
FRONTEND_POST_URL=https://hackabaka.vercel.app/api/stream

# Processing Configuration
MAX_WORKERS=4
THRESHOLD=0.35
```

For local development, you can override URLs as needed (e.g., `FRONTEND_POST_URL=http://localhost:3000/api/stream`).

**Note:** The `.env` file is git-ignored for security. Never commit API keys or sensitive data.

**2. Python Dependencies**

Install all dependencies:

```bash
python3 -m venv venv
source venv/bin/activate
pip install -r requirements.txt
```

**3. Train the AI Model**

To train the fraud detection model on a CSV dataset:

```bash
python3 backend/train_model.py --input hackathon_train.csv --db history.db --output-model model.pkl --features backend/features.json
```

**4. Frontend Dependencies**

Build the Next.js frontend:

```bash
cd frontend
npm install
npm run build
```

## Launch Backend & Frontend

**Terminal 1 - Frontend Dashboard:**
```bash
cd frontend
npm run start
```

**Terminal 2 - Backend API:**
```bash
cd backend
python3 -m uvicorn fraud_api:app --host 127.0.0.1 --port 8000
```

**Terminal 3 - Stream Processor:**
```bash
python3 sse_to_predict.py
```

The dashboard will be available at `http://localhost:3000`

