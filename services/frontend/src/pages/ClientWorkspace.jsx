import { useState, useCallback } from 'react';
import {
	Card,
	CardHeader,
	CardTitle,
	CardContent,
} from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Input } from '../components/ui/Input';
import { Select } from '../components/ui/Select';
import { Label } from '../components/ui/Label';
import { Spinner } from '../components/ui/Spinner';
import { ErrorState } from '../components/ui/EmptyState';
import PredictionResults from '../components/PredictionResults';
import ScenarioSimulator from '../components/ScenarioSimulator';
import { useClient, DEFAULT_CLIENT } from '../context/ClientContext';
import { fetchClient, postPredict, savePredictionToLog } from '../lib/api';
import {
	Search,
	User,
	FileText,
	CheckCircle,
	CalendarDays,
	Shield,
	Sparkles,
} from 'lucide-react';

/* ── Field metadata ──────────────────────────────────────────── */
const FIELD_SECTIONS = {
	Demographics: [
		'Age',
		'Gender',
		'Marital_Status',
		'Education_Level',
		'Occupation',
		'Region',
	],
	Financial: [
		'Estimated_Annual_Income',
		'Credit_Score',
		'Has_Mortgage',
		'Has_Investments',
	],
	'Risk & History': [
		'Existing_Policies',
		'Previous_Claims_Filed',
		'Years_Without_Claims',
		'Previous_Policy_Duration_Months',
		'Adult_Dependents',
		'Child_Dependents',
		'Infant_Dependents',
		'Smoker',
		'Chronic_Conditions',
		'Risk_Tolerance',
	],
};

const FIELD_LABELS = {
	Age: 'Age',
	Gender: 'Gender',
	Marital_Status: 'Marital Status',
	Education_Level: 'Education Level',
	Occupation: 'Occupation',
	Region: 'Region',
	Estimated_Annual_Income: 'Annual Income ($)',
	Credit_Score: 'Credit Score',
	Has_Mortgage: 'Has Mortgage',
	Has_Investments: 'Has Investments',
	Existing_Policies: 'Existing Policies',
	Previous_Claims_Filed: 'Previous Claims Filed',
	Years_Without_Claims: 'Years Without Claims',
	Previous_Policy_Duration_Months: 'Policy Duration (months)',
	Adult_Dependents: 'Adult Dependents',
	Child_Dependents: 'Child Dependents',
	Infant_Dependents: 'Infant Dependents',
	Smoker: 'Smoker',
	Chronic_Conditions: 'Chronic Conditions',
	Risk_Tolerance: 'Risk Tolerance',
};

const SELECT_OPTIONS = {
	Gender: ['Male', 'Female', 'Other'],
	Marital_Status: ['Single', 'Married', 'Divorced', 'Widowed'],
	Education_Level: ['High School', 'Bachelor', 'Master', 'PhD', 'Other'],
	Occupation: ['Employed', 'Self-employed', 'Unemployed', 'Retired', 'Student'],
	Region: ['Urban', 'Suburban', 'Rural'],
	Risk_Tolerance: ['Low', 'Medium', 'High'],
};

const BOOLEAN_FIELDS = new Set([
	'Has_Mortgage',
	'Has_Investments',
	'Smoker',
	'Chronic_Conditions',
]);

const NUMBER_FIELDS = new Set([
	'Age',
	'Estimated_Annual_Income',
	'Credit_Score',
	'Existing_Policies',
	'Previous_Claims_Filed',
	'Years_Without_Claims',
	'Previous_Policy_Duration_Months',
	'Adult_Dependents',
	'Child_Dependents',
	'Infant_Dependents',
]);

/* ── Component ───────────────────────────────────────────────── */
export default function ClientWorkspace() {
	const ctx = useClient();
	const {
		client,
		prediction,
		setClient,
		updateClientField,
		setPrediction,
		setLoading,
		setError,
		loading,
		error,
	} = ctx;

	const [clientIdInput, setClientIdInput] = useState('');
	const [loadMsg, setLoadMsg] = useState('');
	const [predicting, setPredicting] = useState(false);
	const [predictError, setPredictError] = useState(null);

	/* ── Load client ─────────────────────────────────────────── */
	const handleLoadClient = useCallback(async () => {
		const id = clientIdInput.trim();
		if (!id) return;
		setLoadMsg('');
		setLoading(true);
		setPredictError(null);
		try {
			const data = await fetchClient(id);
			if (data) {
				setClient({ ...data, User_ID: id });
				setLoadMsg('');
			} else {
				setClient({ ...DEFAULT_CLIENT, User_ID: id });
				setLoadMsg(
					'Client not found in backend. You can enter details manually.',
				);
			}
		} catch {
			setClient({ ...DEFAULT_CLIENT, User_ID: id });
			setLoadMsg('Backend endpoint not available yet. Using manual mode.');
			setError(null);
		} finally {
			setLoading(false);
		}
	}, [clientIdInput, setClient, setLoading, setError]);

	/* ── Predict ─────────────────────────────────────────────── */
	const handlePredict = useCallback(async () => {
		setPredicting(true);
		setPredictError(null);
		try {
			const payload = buildPayload(client);
			const res = await postPredict(payload);
			setPrediction(res);
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
			setPredictError(err.message);
		} finally {
			setPredicting(false);
		}
	}, [client, setPrediction]);

	/* ── Field renderer ──────────────────────────────────────── */
	function renderField(field) {
		const label = FIELD_LABELS[field] || field;
		const val = client[field] ?? DEFAULT_CLIENT[field] ?? '';

		if (BOOLEAN_FIELDS.has(field)) {
			return (
				<label
					key={field}
					className="flex cursor-pointer items-center justify-between rounded-lg border border-border bg-background px-3 py-2"
				>
					<span className="text-xs text-muted-foreground">{label}</span>
					<input
						type="checkbox"
						checked={!!val}
						onChange={(e) => updateClientField(field, e.target.checked ? 1 : 0)}
						className="h-4 w-4 rounded border-input accent-primary"
					/>
				</label>
			);
		}
		if (SELECT_OPTIONS[field]) {
			return (
				<div key={field} className="space-y-1">
					<Label>{label}</Label>
					<Select
						value={val}
						onChange={(e) => updateClientField(field, e.target.value)}
					>
						{SELECT_OPTIONS[field].map((o) => (
							<option key={o} value={o}>
								{o}
							</option>
						))}
					</Select>
				</div>
			);
		}
		const isNum = NUMBER_FIELDS.has(field);
		return (
			<div key={field} className="space-y-1">
				<Label>{label}</Label>
				<Input
					type={isNum ? 'number' : 'text'}
					value={val}
					onChange={(e) =>
						updateClientField(
							field,
							isNum ? Number(e.target.value) || 0 : e.target.value,
						)
					}
					placeholder={label}
				/>
			</div>
		);
	}

	/* ── Client history ──────────────────────────────────────── */
	function renderClientHistory() {
		const items = [
			{
				icon: FileText,
				label: 'Previous Claims Filed',
				value: `${client.Previous_Claims_Filed ?? 0} claim(s)`,
			},
			{
				icon: CheckCircle,
				label: 'Years Without Claims',
				value: `${client.Years_Without_Claims ?? 0} year(s)`,
			},
			{
				icon: CalendarDays,
				label: 'Previous Policy Duration',
				value: `${client.Previous_Policy_Duration_Months ?? 0} months`,
			},
			{
				icon: Shield,
				label: 'Existing Policies',
				value: `${client.Existing_Policies ?? 0} active`,
			},
		];

		return (
			<Card>
				<CardHeader>
					<CardTitle>Client History</CardTitle>
				</CardHeader>
				<CardContent className="space-y-3">
					{items.map(({ icon: Icon, label, value }) => (
						<div
							key={label}
							className="flex items-center gap-3 rounded-lg border border-border bg-background px-3 py-2.5"
						>
							<div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-muted">
								<Icon className="h-4 w-4 text-muted-foreground" />
							</div>
							<div className="flex flex-col">
								<span className="text-xs font-medium text-foreground">
									{label}
								</span>
								<span className="text-xs text-muted-foreground">{value}</span>
							</div>
						</div>
					))}
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="space-y-6">
			{/* ── Load Client Bar ───────────────────────────────── */}
			<Card>
				<CardHeader>
					<CardTitle>Load Client</CardTitle>
				</CardHeader>
				<CardContent>
					<div className="flex gap-3">
						<div className="relative flex-1">
							<Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
							<Input
								className="pl-9"
								type="text"
								placeholder="Enter Client ID / User_ID"
								value={clientIdInput}
								onChange={(e) => setClientIdInput(e.target.value)}
								onKeyDown={(e) => e.key === 'Enter' && handleLoadClient()}
							/>
						</div>
						<Button
							onClick={handleLoadClient}
							disabled={loading || !clientIdInput.trim()}
						>
							{loading ? <Spinner size="sm" /> : <User className="h-4 w-4" />}
							{loading ? 'Loading…' : 'Load'}
						</Button>
					</div>
					{loadMsg && (
						<p className="mt-2 text-xs text-muted-foreground">{loadMsg}</p>
					)}
					{client.User_ID && (
						<p className="mt-2 text-sm text-foreground">
							Active client: <Badge variant="default">{client.User_ID}</Badge>
						</p>
					)}
				</CardContent>
			</Card>

			{/* ── Two-column layout ─────────────────────────────── */}
			<div className="grid grid-cols-1 gap-6 xl:grid-cols-[1fr_420px]">
				{/* LEFT: Profile + History */}
				<div className="space-y-6">
					{Object.entries(FIELD_SECTIONS).map(([section, fields]) => (
						<Card key={section}>
							<CardHeader>
								<CardTitle>{section}</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
									{fields.map(renderField)}
								</div>
							</CardContent>
						</Card>
					))}
					{renderClientHistory()}
				</div>

				{/* RIGHT: Prediction + Scenario */}
				<div className="space-y-6">
					<Card>
						<CardHeader>
							<CardTitle>Model Recommendation</CardTitle>
						</CardHeader>
						<CardContent>
							<Button
								className="w-full gap-2"
								onClick={handlePredict}
								disabled={predicting}
							>
								{predicting ? (
									<Spinner size="sm" />
								) : (
									<Sparkles className="h-4 w-4" />
								)}
								{predicting ? 'Predicting…' : 'Predict Coverage Bundle'}
							</Button>
							{predictError && (
								<p className="mt-3 rounded-lg border border-destructive/20 bg-destructive/5 px-3 py-2 text-xs text-destructive">
									Backend endpoint not available: {predictError}
								</p>
							)}
						</CardContent>
					</Card>

					{predicting && (
						<div className="flex items-center justify-center gap-2 py-8 text-muted-foreground">
							<Spinner />
							<span className="text-sm">Running prediction model…</span>
						</div>
					)}

					{prediction && !predicting && (
						<PredictionResults prediction={prediction} />
					)}

					<ScenarioSimulator />
				</div>
			</div>

			{error && <ErrorState message={error} />}
		</div>
	);
}

/* ── Helpers ──────────────────────────────────────────────────── */
function buildPayload(client) {
	const payload = { ...client };
	for (const f of NUMBER_FIELDS) {
		if (f in payload) payload[f] = Number(payload[f]) || 0;
	}
	for (const f of BOOLEAN_FIELDS) {
		if (f in payload) payload[f] = payload[f] ? 1 : 0;
	}
	return payload;
}
