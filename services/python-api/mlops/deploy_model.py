
import os
import shutil
import sys
import joblib

# Configuration
NEW_MODEL_PATH = "model_v2.joblib" # Created in mlops/
# Target is the src/ directory which is one level up from mlops/
PROD_MODEL_PATH = "../src/model.joblib"
BACKUP_MODEL_PATH = "../src/model.joblib.bak"

def deploy():
    print("Starting deployment pipeline...")
    
    if not os.path.exists(NEW_MODEL_PATH):
        print(f"Error: New model {NEW_MODEL_PATH} not found.")
        sys.exit(1)
        
    # Backup existing model
    if os.path.exists(PROD_MODEL_PATH):
        print(f"Backing up {PROD_MODEL_PATH} to {BACKUP_MODEL_PATH}...")
        shutil.copy(PROD_MODEL_PATH, BACKUP_MODEL_PATH)
        
    # Deploy new model
    try:
        print(f"Deploying {NEW_MODEL_PATH} to {PROD_MODEL_PATH}...")
        # Use copy instead of move if we want to keep the artifact in mlops/ for debugging
        # But move is fine for deployment.
        shutil.move(NEW_MODEL_PATH, PROD_MODEL_PATH)
        print("Deployment successful!")
    except Exception as e:
        print(f"Deployment failed: {e}")
        # Rollback
        if os.path.exists(BACKUP_MODEL_PATH):
            print("Rolling back to previous model...")
            shutil.copy(BACKUP_MODEL_PATH, PROD_MODEL_PATH)
        sys.exit(1)

if __name__ == "__main__":
    deploy()
