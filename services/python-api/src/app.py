"""
FastAPI prediction service – Insurance Coverage Bundle Recommendation.

Uses the trained model artefact (model.joblib) via solution.py to predict
which insurance bundle best fits a given client profile.
Also exposes a /chat endpoint powered by HuggingFace Inference API.
"""

import os
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

import numpy as np
import pandas as pd
from fastapi import FastAPI, HTTPException
from huggingface_hub import InferenceClient

from solution import load_model, predict, preprocess

app = FastAPI(title="Insurance Bundle Prediction API", version="1.0.0")

# ── Load model once at startup ───────────────────────────────
MODEL = load_model()

# ── HuggingFace chat client ──────────────────────────────────
HF_TOKEN = os.getenv("HF_TOKEN", "")
HF_MODEL = os.getenv("HF_MODEL", "HuggingFaceH4/zephyr-7b-beta")
hf_client: Optional[InferenceClient] = None
if HF_TOKEN:
    hf_client = InferenceClient(model=HF_MODEL, token=HF_TOKEN)

SYSTEM_PROMPT = (
    "You are an expert insurance advisor AI assistant. "
    "You help clients understand insurance coverage bundles, deductibles, "
    "premiums, claims processes, and risk management. "
    "Answer clearly and concisely. If client context is provided, tailor "
    "your response to their profile (age, income, risk tolerance, etc.). "
    "Always be professional and helpful."
)


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


# ── Chat endpoint (HuggingFace) ──────────────────────────────
@app.post("/chat")
async def chat(body: Dict[str, Any]):
    """
    Accept a chat message and optional clientContext, return an AI reply
    powered by a HuggingFace model.

    Request body
    ------------
    { "message": "...", "clientContext": { ... } }

    Response
    --------
    { "reply": "...", "sources": [] }
    """
    if not hf_client:
        raise HTTPException(
            status_code=503,
            detail="HuggingFace token not configured. Set HF_TOKEN env var.",
        )

    message = body.get("message", "").strip()
    if not message:
        raise HTTPException(status_code=400, detail="message is required")

    client_context = body.get("clientContext") or {}

    # Build contextual system prompt
    system_msg = SYSTEM_PROMPT
    if client_context:
        ctx_parts = []
        if client_context.get("clientId"):
            ctx_parts.append(f"Client ID: {client_context['clientId']}")
        if client_context.get("Age"):
            ctx_parts.append(f"Age: {client_context['Age']}")
        if client_context.get("Gender"):
            ctx_parts.append(f"Gender: {client_context['Gender']}")
        if client_context.get("Estimated_Annual_Income"):
            ctx_parts.append(f"Annual Income: ${client_context['Estimated_Annual_Income']:,}")
        if client_context.get("Risk_Tolerance"):
            ctx_parts.append(f"Risk Tolerance: {client_context['Risk_Tolerance']}")
        if client_context.get("topBundle"):
            ctx_parts.append(
                f"Recommended Bundle: {client_context['topBundle']} "
                f"(confidence: {client_context.get('topProbability', 'N/A')})"
            )
        if ctx_parts:
            system_msg += "\n\nCurrent client profile:\n" + "\n".join(ctx_parts)

    try:
        response = hf_client.chat_completion(
            messages=[
                {"role": "system", "content": system_msg},
                {"role": "user", "content": message},
            ],
            max_tokens=512,
            temperature=0.7,
        )
        reply = response.choices[0].message.content.strip()
        return {"reply": reply, "sources": []}
    except Exception as e:
        raise HTTPException(status_code=502, detail=f"HuggingFace API error: {str(e)}")


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
