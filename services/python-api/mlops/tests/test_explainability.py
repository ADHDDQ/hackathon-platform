import importlib
import unittest

import numpy as np

import sys
from pathlib import Path

root = Path(__file__).resolve().parents[2] / "src"
sys.path.append(str(root))

import explainability


class DummyModel:
	def __init__(self):
		self.feature_importances_ = np.array([0.2, 0.5, 0.3])

	def predict_proba(self, X):
		probs = np.ones((X.shape[0], 2), dtype=float)
		return probs / probs.sum(axis=1, keepdims=True)


class ExplainabilityTests(unittest.TestCase):
	def test_feature_importance_order(self):
		model = DummyModel()
		features = ["f1", "f2", "f3"]
		result = explainability.get_feature_importance(model, features)
		self.assertEqual(result[0]["feature"], "f2")
		self.assertEqual(len(result), 3)

	def test_benchmark_handles_missing_shap(self):
		model = DummyModel()
		X = np.ones((4, 3), dtype=float)
		results = explainability.benchmark_explainability(model, X, ["f1", "f2", "f3"])
		self.assertIn("feature_importance_seconds", results)
		if importlib.util.find_spec("shap") is None:
			self.assertIn("shap_error", results)


if __name__ == "__main__":
	unittest.main()
