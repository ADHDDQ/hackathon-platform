import json
from pathlib import Path

import numpy as np
import pandas as pd
import joblib

import sys

sys.path.append(str(Path(__file__).resolve().parents[1] / "src"))

import explainability
import solution


def build_sample_rows(count=200):
	artifact = joblib.load(Path(__file__).resolve().parents[1] / "src" / "model.joblib")
	cat_mappings = artifact["cat_mappings"]
	data = {
		"User_ID": np.arange(count),
		"Broker_ID": [next(iter(cat_mappings["Broker_ID"].keys()), "MISSING")] * count,
		"Broker_Agency_Type": [
			next(iter(cat_mappings["Broker_Agency_Type"].keys()), "MISSING")
		]
		* count,
		"Region_Code": [next(iter(cat_mappings["Region_Code"].keys()), "MISSING")]
		* count,
		"Deductible_Tier": [
			next(iter(cat_mappings["Deductible_Tier"].keys()), "MISSING")
		]
		* count,
		"Acquisition_Channel": [
			next(iter(cat_mappings["Acquisition_Channel"].keys()), "MISSING")
		]
		* count,
	}
	return pd.DataFrame(data)


def main():
	artifact = joblib.load(Path(__file__).resolve().parents[1] / "src" / "model.joblib")
	model = artifact["model"]
	feature_names = artifact["feature_columns"]
	raw = build_sample_rows()
	processed = solution.preprocess(raw)
	X = processed[feature_names]

	results = explainability.benchmark_explainability(model, X, feature_names)
	output_path = Path(__file__).resolve().parent / "explainability_benchmark.json"
	explainability.save_benchmark(results, output_path)
	print(json.dumps(results, indent=2))


if __name__ == "__main__":
	main()
