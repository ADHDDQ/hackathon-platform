
import pandas as pd
import numpy as np
import joblib
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
import os
import json
from datetime import datetime

# Configuration
# Path to save the new model artifact within the mlops directory
MODEL_OUTPUT_PATH = "model_v2.joblib"
# Registry file in mlops directory
REGISTRY_PATH = "model_registry.json"
NUM_SAMPLES = 200

def generate_synthetic_data():
    """Generates synthetic data mimicking the production schema."""
    np.random.seed(42)
    
    data = {
        "User_ID": np.arange(NUM_SAMPLES),
        "Broker_ID": np.random.choice(["B001", "B002", "B003", "B004", None], NUM_SAMPLES),
        "Broker_Agency_Type": np.random.choice(["National_Corporate", "Independent", "Direct"], NUM_SAMPLES),
        "Region_Code": np.random.choice(["PRT", "ESP", "FRA", "USA"], NUM_SAMPLES),
        "Deductible_Tier": np.random.choice(["Tier_1_High_Ded", "Tier_2_Mid_Ded", "Tier_3_Low_Ded", "Tier_4_Zero_Ded"], NUM_SAMPLES),
        "Acquisition_Channel": np.random.choice(["Direct_Website", "Broker_Referral", "Social_Media"], NUM_SAMPLES),
        "Purchased_Coverage_Bundle": np.random.randint(0, 10, NUM_SAMPLES)  # Target
    }
    return pd.DataFrame(data)

def train():
    print("Starting training pipeline...")
    
    # 1. Load Data
    df = generate_synthetic_data()
    
    # 2. Feature Engineering (Simplified for Demo)
    # Calculate broker stats
    broker_counts = df["Broker_ID"].value_counts().to_dict()
    broker_dominance = {k: np.random.random() for k in broker_counts} # Mock logic
    broker_entropy = {k: np.random.random() for k in broker_counts}   # Mock logic
    
    # Categorical Columns
    cat_cols = ["Broker_ID", "Broker_Agency_Type", "Region_Code", "Deductible_Tier", "Acquisition_Channel"]
    cat_mappings = {}
    
    # Encode Categoricals
    for col in cat_cols:
        le = LabelEncoder()
        # Fill NA for encoding
        series = df[col].fillna("MISSING").astype(str)
        le.fit(series)
        # Create mapping dictionary
        mapping = dict(zip(le.classes_, le.transform(le.classes_)))
        cat_mappings[col] = mapping
        
        # Apply transformation to dataframe for training
        df[col] = df[col].fillna("MISSING").astype(str).map(mapping)

    # Add calculated features to dataframe for training
    df["Broker_Count"] = df["Broker_ID"].map(broker_counts).fillna(0)
    df["Broker_Dominance"] = df["Broker_ID"].map(broker_dominance).fillna(0)
    df["Broker_Entropy"] = df["Broker_ID"].map(broker_entropy).fillna(0)
    
    # Pattern features (mock logic for training)
    df["pat_cls8"] = np.random.randint(0, 2, NUM_SAMPLES)
    df["pat_cls9"] = np.random.randint(0, 2, NUM_SAMPLES)
    
    # Feature Selection
    feature_columns = cat_cols + ["Broker_Count", "Broker_Dominance", "Broker_Entropy", "pat_cls8", "pat_cls9"]
    
    X = df[feature_columns]
    y = df["Purchased_Coverage_Bundle"]
    
    # 3. Train Model
    clf = RandomForestClassifier(n_estimators=50, random_state=42)
    clf.fit(X, y)
    
    # 4. Create Artifact
    artifact = {
        "model": clf,
        "feature_columns": feature_columns,
        "cat_cols": cat_cols,
        "cat_mappings": cat_mappings,
        "broker_counts": broker_counts,
        "broker_dominance": broker_dominance,
        "broker_entropy": broker_entropy,
        "probability_boosts": {0: 1.1, 5: 1.05} # Example boosts
    }
    
    # 5. Save Model
    joblib.dump(artifact, MODEL_OUTPUT_PATH)
    print(f"Model saved to {MODEL_OUTPUT_PATH}")
    
    # 6. Update Registry
    registry_entry = {
        "version": "v2.0",
        "timestamp": datetime.now().isoformat(),
        "metrics": {
            "accuracy": clf.score(X, y), # Training accuracy for simplicity
            "n_samples": NUM_SAMPLES
        },
        "path": MODEL_OUTPUT_PATH
    }
    
    if os.path.exists(REGISTRY_PATH):
        with open(REGISTRY_PATH, "r") as f:
            registry = json.load(f)
    else:
        registry = []
        
    registry.append(registry_entry)
    
    with open(REGISTRY_PATH, "w") as f:
        json.dump(registry, f, indent=2)
    print(f"Registry updated at {REGISTRY_PATH}")

if __name__ == "__main__":
    train()
