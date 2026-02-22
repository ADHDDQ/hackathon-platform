import importlib.util
import json
import time

import numpy as np


def _require(module_name):
	if importlib.util.find_spec(module_name) is None:
		raise RuntimeError(
			f"{module_name} is not installed. Install optional explainability dependencies."
		)


def _as_numpy(X):
	if hasattr(X, "values"):
		return X.values
	return np.asarray(X)


def _normalize_shap_values(values):
	if isinstance(values, list):
		stacked = np.stack(values, axis=0)
		return stacked.mean(axis=0)
	array = np.asarray(values)
	if array.ndim == 3:
		return array.mean(axis=2)
	return array


def get_feature_importance(model, feature_names, top_k=None):
	if hasattr(model, "feature_importances_"):
		importances = np.asarray(model.feature_importances_, dtype=float)
	elif hasattr(model, "coef_"):
		coef = np.asarray(model.coef_, dtype=float)
		importances = np.abs(coef).mean(axis=0) if coef.ndim > 1 else np.abs(coef)
	else:
		raise RuntimeError("Model does not expose feature importances.")

	if importances.shape[0] != len(feature_names):
		raise RuntimeError("Feature importance size does not match feature names.")

	order = np.argsort(importances)[::-1]
	if top_k is not None:
		order = order[:top_k]

	return [
		{"feature": feature_names[i], "importance": float(importances[i])}
		for i in order
	]


def get_permutation_importance(model, X, y, feature_names, n_repeats=5, random_state=42):
	_require("sklearn")
	from sklearn.inspection import permutation_importance

	X_np = _as_numpy(X)
	result = permutation_importance(
		model, X_np, y, n_repeats=n_repeats, random_state=random_state
	)
	importances = result.importances_mean
	if importances.shape[0] != len(feature_names):
		raise RuntimeError("Permutation importance size mismatch.")
	order = np.argsort(importances)[::-1]
	return [
		{"feature": feature_names[i], "importance": float(importances[i])}
		for i in order
	]


def get_shap_values(model, X, feature_names, max_samples=200):
	_require("shap")
	import shap

	X_np = _as_numpy(X)
	if X_np.shape[0] > max_samples:
		X_np = X_np[:max_samples]

	explainer = shap.Explainer(model, X_np, feature_names=feature_names)
	explanation = explainer(X_np)

	values = _normalize_shap_values(explanation.values)
	base_values = explanation.base_values
	return {
		"values": np.asarray(values),
		"base_values": np.asarray(base_values),
		"data": X_np,
		"feature_names": feature_names,
	}


def get_local_shap_values(model, X_row, feature_names):
	_require("shap")
	import shap

	X_np = _as_numpy(X_row)
	if X_np.ndim == 1:
		X_np = X_np.reshape(1, -1)
	explainer = shap.Explainer(model, X_np, feature_names=feature_names)
	explanation = explainer(X_np)
	return {
		"values": np.asarray(_normalize_shap_values(explanation.values)),
		"base_values": np.asarray(explanation.base_values),
		"data": X_np,
		"feature_names": feature_names,
	}


def plot_shap_summary(shap_payload, output_path):
	_require("shap")
	_require("matplotlib")
	import shap
	import matplotlib.pyplot as plt

	values = np.asarray(shap_payload["values"])

	shap.summary_plot(
		values,
		shap_payload["data"],
		feature_names=shap_payload["feature_names"],
		show=False,
	)
	plt.tight_layout()
	plt.savefig(output_path, dpi=150)
	plt.close()


def plot_feature_importance(fi_payload, output_path):
	_require("matplotlib")
	import matplotlib.pyplot as plt

	labels = [item["feature"] for item in fi_payload]
	values = [item["importance"] for item in fi_payload]
	fig, ax = plt.subplots(figsize=(8, 5))
	ax.barh(labels[::-1], values[::-1], color="#38bdf8")
	ax.set_xlabel("Importance")
	ax.set_ylabel("Feature")
	plt.tight_layout()
	plt.savefig(output_path, dpi=150)
	plt.close(fig)


def plot_dependence(shap_payload, feature, output_path):
	_require("shap")
	_require("matplotlib")
	import shap
	import matplotlib.pyplot as plt

	values = np.asarray(shap_payload["values"])

	shap.dependence_plot(
		feature,
		values,
		shap_payload["data"],
		feature_names=shap_payload["feature_names"],
		show=False,
	)
	plt.tight_layout()
	plt.savefig(output_path, dpi=150)
	plt.close()


def benchmark_explainability(model, X, feature_names):
	start = time.perf_counter()
	fi = get_feature_importance(model, feature_names)
	fi_time = time.perf_counter() - start

	results = {
		"feature_importance_seconds": fi_time,
		"feature_importance_top": fi[:5],
	}

	try:
		start = time.perf_counter()
		shap_payload = get_shap_values(model, X, feature_names)
		shap_time = time.perf_counter() - start
		results["shap_seconds"] = shap_time
		results["shap_values_shape"] = np.asarray(shap_payload["values"]).shape
	except Exception as exc:
		results["shap_error"] = str(exc)

	return results


def save_benchmark(results, output_path):
	with open(output_path, "w", encoding="utf-8") as handle:
		json.dump(results, handle, indent=2)
