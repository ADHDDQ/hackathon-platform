"""
FastAPI prediction service – Insurance Coverage Bundle Recommendation.

Uses the trained model artefact (model.joblib) via solution.py to predict
which insurance bundle best fits a given client profile.
"""

from datetime import datetime, timezone
from typing import Dict, List

import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException

from solution import load_model, predict, preprocess

app = FastAPI(title="Insurance Bundle Prediction API", version="1.0.0")

# ── Load model once at startup ───────────────────────────────
MODEL = load_model()


# ── Health ────────────────────────────────────────────────────
@app.get("/health")
async def health():
    return {
        "status": "ok",
        "service": "python-api",
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


# ── Single-client prediction (used by frontend) ──────────────
@app.post("/predict")
async def predict_single(record: Dict):
    """
    Accept a single client record and return per-bundle probabilities.

    Returns
    -------
    {
      "prediction": [ { "bundle_id": 1, "probability": 0.42 }, … ],
      "model_version": "v1",
      "timestamp": "…"
    }
    """
    try:
        df = pd.DataFrame([record])

        # Ensure User_ID column exists
        if "User_ID" not in df.columns:
            df["User_ID"] = "unknown"

        df_processed = preprocess(df)
        from solution import _get_artifact

        artifact = _get_artifact()
        feature_columns = artifact["feature_columns"]
        boosts = artifact.get("probability_boosts", {})

        X = df_processed[feature_columns].values.astype(np.float32)
        proba = MODEL.predict_proba(X)[0]  # first (only) row

        # Apply class boosts
        for cls, boost in boosts.items():
            proba[cls] *= boost

        # Normalise so they sum to 1 after boosts
        total = proba.sum()
        if total > 0:
            proba = proba / total

        # Build sorted prediction list
        prediction = sorted(
            [
                {"bundle_id": int(MODEL.classes_[i]), "probability": round(float(p), 6)}
                for i, p in enumerate(proba)
            ],
            key=lambda r: r["probability"],
            reverse=True,
        )

        return {
            "prediction": prediction,
            "model_version": "v1",
            "timestamp": datetime.now(timezone.utc).isoformat(),
        }

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Prediction failed: {str(e)}")


# ── Batch prediction (original endpoint) ─────────────────────
@app.post("/predict/batch")
async def predict_batch(records: List[Dict]):
    """Accept a list of client records and return bundle predictions."""
    if not records:
        return []

    try:
        df = pd.DataFrame(records)
        if "User_ID" not in df.columns:
            df["User_ID"] = list(range(len(df)))

        df_processed = preprocess(df)
        result = predict(df_processed, MODEL)
        return result.to_dict(orient="records")

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Prediction failed: {str(e)}")


if __name__ == "__main__":
    import uvicorn

    uvicorn.run("app:app", host="0.0.0.0", port=8000, reload=False)
