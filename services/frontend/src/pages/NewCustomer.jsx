import { useState } from 'react';
import Card from '../components/Card';
import Badge from '../components/Badge';
import Loader from '../components/Loader';
import { getBundleName, getBundleColor } from '../lib/bundles';
import { postPredict, saveLead, savePredictionToLog } from '../lib/api';

const defaultForm = {
	// Demographics
	age: '',
	gender: 'Male',
	marital_status: 'Single',
	num_dependents: '0',
	education: 'Bachelor',
	occupation: 'Employed',
	region: 'Urban',
	// Financial
	annual_income: '',
	credit_score: '',
	has_mortgage: false,
	has_investments: false,
	// History / Risk
	existing_policies: '0',
	claims_last_5y: '0',
	smoker: false,
	chronic_conditions: false,
	risk_tolerance: 'Medium',
};

const sectionFields = {
	Demographics: [
		'age',
		'gender',
		'marital_status',
		'num_dependents',
		'education',
		'occupation',
		'region',
	],
	Financial: [
		'annual_income',
		'credit_score',
		'has_mortgage',
		'has_investments',
	],
	'History & Risk': [
		'existing_policies',
		'claims_last_5y',
		'smoker',
		'chronic_conditions',
		'risk_tolerance',
	],
};

const fieldLabels = {
	age: 'Age',
	gender: 'Gender',
	marital_status: 'Marital Status',
	num_dependents: 'Number of Dependents',
	education: 'Education Level',
	occupation: 'Occupation',
	region: 'Region',
	annual_income: 'Annual Income ($)',
	credit_score: 'Credit Score',
	has_mortgage: 'Has Mortgage',
	has_investments: 'Has Investments',
	existing_policies: 'Existing Policies',
	claims_last_5y: 'Claims (Last 5 Years)',
	smoker: 'Smoker',
	chronic_conditions: 'Chronic Conditions',
	risk_tolerance: 'Risk Tolerance',
};

const selectOptions = {
	gender: ['Male', 'Female', 'Other'],
	marital_status: ['Single', 'Married', 'Divorced', 'Widowed'],
	education: ['High School', 'Bachelor', 'Master', 'PhD', 'Other'],
	occupation: ['Employed', 'Self-employed', 'Unemployed', 'Retired', 'Student'],
	region: ['Urban', 'Suburban', 'Rural'],
	risk_tolerance: ['Low', 'Medium', 'High'],
};

export default function NewCustomer() {
	const [form, setForm] = useState({ ...defaultForm });
	const [loading, setLoading] = useState(false);
	const [result, setResult] = useState(null);
	const [saved, setSaved] = useState(false);
	const [saveMsg, setSaveMsg] = useState('');

	function handleChange(field, value) {
		setForm((prev) => ({ ...prev, [field]: value }));
	}

	async function handleSubmit(e) {
		e.preventDefault();
		setLoading(true);
		setResult(null);
		setSaved(false);
		setSaveMsg('');
		try {
			const payload = {
				...form,
				age: Number(form.age) || 30,
				num_dependents: Number(form.num_dependents) || 0,
				annual_income: Number(form.annual_income) || 50000,
				credit_score: Number(form.credit_score) || 700,
				existing_policies: Number(form.existing_policies) || 0,
				claims_last_5y: Number(form.claims_last_5y) || 0,
				has_mortgage: form.has_mortgage ? 1 : 0,
				has_investments: form.has_investments ? 1 : 0,
				smoker: form.smoker ? 1 : 0,
				chronic_conditions: form.chronic_conditions ? 1 : 0,
			};
			const res = await postPredict(payload);
			setResult(res);
			// save to predictions log
			if (res.prediction) {
				const top = res.prediction[0];
				savePredictionToLog({
					id: `pred-${Date.now()}`,
					timestamp: res.timestamp || new Date().toISOString(),
					topBundle: top.bundle_id,
					confidence: top.probability,
					modelVersion: res.model_version || 'v0',
					input: payload,
					prediction: res.prediction.slice(0, 3),
				});
			}
		} catch (err) {
			setResult({ error: err.message });
		} finally {
			setLoading(false);
		}
	}

	async function handleSaveLead() {
		try {
			const top3 = result.prediction?.slice(0, 3) || [];
			const topBundle = top3[0]?.bundle_id ?? 0;
			const confidence = top3[0]?.probability ?? 0;
			await saveLead({
				customerName: `Customer ${form.age}y/${form.gender}/${form.region}`,
				input: form,
				prediction: top3,
				recommendedBundle: topBundle,
				confidence,
				modelVersion: result.model_version || 'v0',
			});
			setSaved(true);
			setSaveMsg('Lead saved successfully!');
		} catch (err) {
			setSaveMsg(`Error: ${err.message}`);
		}
	}

	const top3 = result?.prediction?.slice(0, 3) || [];
	const topConf = top3[0]?.probability ?? 0;
	const lowConfidence = topConf > 0 && topConf < 0.4;

	function renderField(field) {
		const label = fieldLabels[field] || field;
		const val = form[field];
		// boolean toggle
		if (typeof defaultForm[field] === 'boolean') {
			return (
				<label key={field} className="form-field form-toggle">
					<span>{label}</span>
					<input
						type="checkbox"
						checked={val}
						onChange={(e) => handleChange(field, e.target.checked)}
					/>
				</label>
			);
		}
		// select
		if (selectOptions[field]) {
			return (
				<label key={field} className="form-field">
					<span>{label}</span>
					<select
						value={val}
						onChange={(e) => handleChange(field, e.target.value)}
					>
						{selectOptions[field].map((o) => (
							<option key={o} value={o}>
								{o}
							</option>
						))}
					</select>
				</label>
			);
		}
		// number
		const isNum = [
			'age',
			'num_dependents',
			'annual_income',
			'credit_score',
			'existing_policies',
			'claims_last_5y',
		].includes(field);
		return (
			<label key={field} className="form-field">
				<span>{label}</span>
				<input
					type={isNum ? 'number' : 'text'}
					value={val}
					onChange={(e) => handleChange(field, e.target.value)}
					placeholder={label}
				/>
			</label>
		);
	}

	return (
		<div className="page">
			<h2 className="page-title">New Customer Prediction</h2>

			<div className="grid-2">
				{/* Form */}
				<div>
					<form onSubmit={handleSubmit}>
						{Object.entries(sectionFields).map(([section, fields]) => (
							<Card key={section} title={section} className="mb-4">
								<div className="form-grid">{fields.map(renderField)}</div>
							</Card>
						))}
						<button
							type="submit"
							className="btn btn-primary btn-block"
							disabled={loading}
						>
							{loading ? 'Predicting…' : '🔮 Get Recommendation'}
						</button>
					</form>
				</div>

				{/* Results */}
				<div>
					{loading && <Loader text="Running prediction model…" />}
					{result?.error && (
						<Card title="Error">
							<p className="error">{result.error}</p>
						</Card>
					)}
					{top3.length > 0 && (
						<>
							<Card title="Recommendation Results">
								{lowConfidence && (
									<div className="warning-banner">
										⚠️ Low confidence prediction — top probability is below 40%.
										Consider reviewing manually.
									</div>
								)}
								<div className="results-list">
									{top3.map((p, i) => {
										const pct = (p.probability * 100).toFixed(1);
										const isTop = i === 0;
										return (
											<div
												key={p.bundle_id}
												className={`result-item${isTop ? ' result-top' : ''}`}
											>
												<div className="result-rank">
													{i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉'}
												</div>
												<div className="result-info">
													<div className="result-name">
														{getBundleName(p.bundle_id)}
														{isTop && <Badge variant="success">TOP PICK</Badge>}
													</div>
													<div className="result-bar-wrap">
														<div
															className="result-bar"
															style={{
																width: `${pct}%`,
																background: getBundleColor(p.bundle_id),
															}}
														/>
													</div>
												</div>
												<div className="result-pct">{pct}%</div>
											</div>
										);
									})}
								</div>
							</Card>

							{/* Confidence Meter */}
							<Card title="Confidence Meter">
								<div className="confidence-meter">
									<div className="confidence-bar-track">
										<div
											className="confidence-bar-fill"
											style={{
												width: `${(topConf * 100).toFixed(0)}%`,
												background:
													topConf >= 0.6
														? '#34d399'
														: topConf >= 0.4
															? '#facc15'
															: '#f87171',
											}}
										/>
									</div>
									<span className="confidence-value">
										{(topConf * 100).toFixed(1)}%
									</span>
								</div>
								<p className="muted mt-2" style={{ fontSize: '0.85rem' }}>
									Model version: {result.model_version || 'v0'}
								</p>
							</Card>

							{/* Save as Lead */}
							<Card>
								<button
									className="btn btn-secondary btn-block"
									disabled={saved}
									onClick={handleSaveLead}
								>
									{saved ? '✓ Saved' : '💾 Save as Lead'}
								</button>
								{saveMsg && (
									<p
										className={`mt-2 ${saveMsg.startsWith('Error') ? 'error' : 'success-text'}`}
									>
										{saveMsg}
									</p>
								)}
							</Card>
						</>
					)}
					{!loading && !result && (
						<Card>
							<div className="empty-state">
								<span className="empty-icon">🎯</span>
								<h3>Fill in customer details</h3>
								<p>Submit the form to get bundle recommendations</p>
							</div>
						</Card>
					)}
				</div>
			</div>
		</div>
	);
}
