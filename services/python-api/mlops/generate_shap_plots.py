from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier

import sys

sys.path.append(str(Path(__file__).resolve().parents[1] / "src"))

import explainability


DEFAULT_FEATURES = [
	"Broker_ID",
	"Broker_Agency_Type",
	"Region_Code",
	"Deductible_Tier",
	"Acquisition_Channel",
	"Broker_Count",
	"Broker_Dominance",
	"Broker_Entropy",
	"pat_cls8",
	"pat_cls9",
]


def _load_artifact():
	try:
		return joblib.load(Path(__file__).resolve().parents[1] / "src" / "model.joblib")
	except ModuleNotFoundError as err:
		print(
			"Model dependencies missing while loading model.joblib. "
			"Falling back to a demo model for SHAP plots."
		)
		print(f"Missing module: {err}")
		return None


def _demo_preprocess(df):
	df = df.copy()
	for col in ["Broker_ID", "Broker_Agency_Type", "Region_Code", "Deductible_Tier", "Acquisition_Channel"]:
		df[col] = df[col].fillna("MISSING").astype(str)
		df[col] = pd.factorize(df[col])[0].astype(int)
	df["Broker_Count"] = 1
	df["Broker_Dominance"] = 0.1
	df["Broker_Entropy"] = 0.1
	df["pat_cls8"] = 0
	df["pat_cls9"] = 0
	return df


def build_sample_rows(count=200, artifact=None):
	cat_mappings = (
		artifact.get("cat_mappings", {}) if artifact is not None else {}
	)
	data = {
		"User_ID": np.arange(count),
		"Broker_ID": [
			next(iter(cat_mappings.get("Broker_ID", {}).keys()), "MISSING")
		]
		* count,
		"Broker_Agency_Type": [
			next(iter(cat_mappings.get("Broker_Agency_Type", {}).keys()), "MISSING")
		]
		* count,
		"Region_Code": [next(iter(cat_mappings.get("Region_Code", {}).keys()), "MISSING")]
		* count,
		"Deductible_Tier": [
			next(iter(cat_mappings.get("Deductible_Tier", {}).keys()), "MISSING")
		]
		* count,
		"Acquisition_Channel": [
			next(iter(cat_mappings.get("Acquisition_Channel", {}).keys()), "MISSING")
		]
		* count,
	}
	return pd.DataFrame(data)


def main():
	artifact = _load_artifact()
	if artifact is None:
		feature_names = DEFAULT_FEATURES
		raw = build_sample_rows(artifact=None)
		processed = _demo_preprocess(raw)
		X = processed[feature_names]
		y = np.random.randint(0, 2, size=X.shape[0])
		model = RandomForestClassifier(n_estimators=25, random_state=42)
		model.fit(X, y)
	else:
		import solution
		model = artifact["model"]
		feature_names = artifact["feature_columns"]
		raw = build_sample_rows(artifact=artifact)
		processed = solution.preprocess(raw)
		X = processed[feature_names]

	try:
		shap_payload = explainability.get_shap_values(model, X, feature_names)
	except RuntimeError as err:
		print(err)
		print("Install SHAP and matplotlib to generate plots: pip install shap matplotlib")
		return
	output_dir = Path(__file__).resolve().parent / "artifacts"
	output_dir.mkdir(parents=True, exist_ok=True)

	explainability.plot_shap_summary(shap_payload, output_dir / "shap_summary.png")
	explainability.plot_dependence(
		shap_payload,
		feature_names[0],
		output_dir / f"shap_dependence_{feature_names[0]}.png",
	)
	print(f"Saved plots to {output_dir}")


if __name__ == "__main__":
	main()
