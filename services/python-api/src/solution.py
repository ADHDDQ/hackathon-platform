import pandas as pd
import numpy as np
import joblib
import os

_DIR = os.path.dirname(os.path.abspath(__file__))
_MODEL_PATH = os.path.join(_DIR, "model.joblib")
_artifact = None


def _get_artifact():
    global _artifact
    if _artifact is None:
        _artifact = joblib.load(_MODEL_PATH)
    return _artifact


def preprocess(df):
    artifact = _get_artifact()
    broker_counts = artifact["broker_counts"]
    broker_dominance = artifact["broker_dominance"]
    broker_entropy = artifact["broker_entropy"]
    cat_cols = artifact["cat_cols"]
    cat_mappings = artifact["cat_mappings"]
    feature_columns = artifact["feature_columns"]

    df = df.copy()

    # Broker aggregate features
    df["Broker_Count"] = df["Broker_ID"].map(broker_counts).fillna(0)
    df["Broker_Dominance"] = df["Broker_ID"].map(broker_dominance).fillna(0)
    df["Broker_Entropy"] = df["Broker_ID"].map(broker_entropy).fillna(0)

    # Pattern indicator features (must be computed BEFORE categorical encoding)
    df["pat_cls8"] = (
        df["Broker_ID"].isna()
        & (df["Broker_Agency_Type"] == "National_Corporate")
        & (df["Region_Code"] == "PRT")
        & (df["Deductible_Tier"] == "Tier_1_High_Ded")
        & (df["Acquisition_Channel"] == "Direct_Website")
    ).astype(int)

    df["pat_cls9"] = (
        df["Broker_ID"].isna()
        & df["Region_Code"].isna()
        & (df["Deductible_Tier"] == "Tier_4_Zero_Ded")
    ).astype(int)

    # Encode categoricals using training mappings
    for col in cat_cols:
        if col in df.columns:
            df[col] = df[col].fillna("MISSING")
            df[col] = df[col].map(cat_mappings[col]).fillna(-1).astype(int)

    # Ensure all feature columns exist
    for fc in feature_columns:
        if fc not in df.columns:
            df[fc] = 0

    return df


def load_model():
    return _get_artifact()["model"]


def predict(df, model):
    artifact = _get_artifact()
    feature_columns = artifact["feature_columns"]
    boosts = artifact.get("probability_boosts", {})

    user_ids = df["User_ID"].values
    X = df[feature_columns].values.astype(np.float32)

    # Get probabilities and apply class boosts
    proba = model.predict_proba(X)
    for cls, boost in boosts.items():
        proba[:, cls] *= boost
    preds = proba.argmax(axis=1)

    return pd.DataFrame({
        "User_ID": user_ids,
        "Purchased_Coverage_Bundle": preds.astype(np.int32),
    })
