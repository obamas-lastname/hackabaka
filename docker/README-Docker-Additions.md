
# Docker / Compose Setup

This adds a 3-service stack:

- **api** — FastAPI model inference (`:8000`)
- **web** — Next.js dashboard (`:3000`)
- **ingestor** — SSE client that reads the hackathon stream, calls the local API, flags results back, and forwards enriched transactions to the dashboard

## Quick start

```bash
# From the project root (where hackabaka-main/ lives)
docker compose -f docker-compose.yml build
docker compose -f docker-compose.yml up
```

Then open: http://localhost:3000

Health-check the API: http://localhost:8000/health

> The API image ships with a **dummy model** so it boots without training.
> For real scoring, mount your trained model to `/models/model2.pkl` (see below).

## Environment variables

Create a `.env` next to `docker-compose.yml` to override defaults:

```dotenv
API_KEY=put_your_hackathon_key_here
STREAM_URL=https://95.217.75.14:8443/stream
FLAG_URL=https://95.217.75.14:8443/api/flag
LOCAL_PREDICT_URL=http://api:8000/predict?store=1
FRONTEND_POST_URL=http://web:3000/api/stream
VERIFY_TLS=0              # set to 1 if the stream has valid TLS
THRESHOLD=0.35            # classifier probability threshold
```

## Persisted data

- **SQLite DB** at `/data/history.db` (named volume `db_data`)
- **Model files** at `/models/*` (named volume `model_data`)

## Training a real model

1. Prepare a CSV with `is_fraud` and the transaction columns used by `train_model.py`.
2. Launch a one-off container to train and write the model into the `model_data` volume:

```bash
docker compose run --rm api bash -lc 'cd /app/backend && python train_model.py --input /app/data/transactions.csv --db /data/history.db --output-model /models/model2.pkl'
```

3. Restart the API to load the new model:

```bash
docker compose restart api
```

## Useful endpoints

- `GET /health` — model + DB status
- `GET /feature-names` — ordered feature list
- `POST /predict?store=1` — pass a single transaction JSON, returns `is_fraud` + `proba`

## Dev tips

- Hot reloading: for API dev, you can override the `CMD` to use `uvicorn --reload` and bind-mount the backend directory.
- Frontend dev: run `npm run dev` locally if preferred; the compose service uses the production build by default.
- Networking: services can reach each other via DNS names `api` and `web` inside the compose network.
- TLS: if the hackathon stream uses self-signed TLS, keep `VERIFY_TLS=0` (default).

## Minimal test

With the stack running, try a local call:

```bash
curl -s http://localhost:8000/feature-names | jq
```

and send a synthetic transaction:

```bash
curl -s -X POST "http://localhost:8000/predict?store=1" \  -H "Content-Type: application/json" \  -d '{"cc_num":"4111111111111111","unix_time":1730000000,"lat":40.7,"long":-74.0,"merch_lat":40.75,"merch_long":-73.98,"amt":42.35,"merchant":"Test Mart"}' | jq
```

You should see `is_fraud: false` with a dummy probability. The ingestor will start pushing real-time transactions to the dashboard once your `API_KEY` is set.
