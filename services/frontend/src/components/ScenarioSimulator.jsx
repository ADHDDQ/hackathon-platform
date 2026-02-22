import { useState, useCallback } from 'react';
import {
	Card,
	CardHeader,
	CardTitle,
	CardContent,
	CardFooter,
} from './ui/Card';
import { Badge } from './ui/Badge';
import { Button } from './ui/Button';
import { Input } from './ui/Input';
import { Select } from './ui/Select';
import { Label } from './ui/Label';
import { Spinner } from './ui/Spinner';
import { useClient, DEFAULT_CLIENT } from '../context/ClientContext';
import { postPredict } from '../lib/api';
import { getBundleName } from '../lib/bundles';
import { FlaskConical, Check, RotateCcw, ArrowRight } from 'lucide-react';

const SCENARIO_FIELDS = [
	{ key: 'Age', label: 'Age', type: 'number', min: 18, max: 100 },
	{
		key: 'Estimated_Annual_Income',
		label: 'Annual Income',
		type: 'number',
		min: 0,
		step: 5000,
	},
	{
		key: 'Credit_Score',
		label: 'Credit Score',
		type: 'number',
		min: 300,
		max: 850,
	},
	{
		key: 'Existing_Policies',
		label: 'Existing Policies',
		type: 'number',
		min: 0,
		max: 20,
	},
	{
		key: 'Risk_Tolerance',
		label: 'Risk Tolerance',
		type: 'select',
		options: ['Low', 'Medium', 'High'],
	},
	{ key: 'Has_Mortgage', label: 'Has Mortgage', type: 'boolean' },
	{ key: 'Has_Investments', label: 'Has Investments', type: 'boolean' },
	{ key: 'Smoker', label: 'Smoker', type: 'boolean' },
	{
		key: 'Child_Dependents',
		label: 'Child Dependents',
		type: 'number',
		min: 0,
		max: 10,
	},
	{
		key: 'Adult_Dependents',
		label: 'Adult Dependents',
		type: 'number',
		min: 0,
		max: 10,
	},
];

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

const BOOLEAN_FIELDS = new Set([
	'Has_Mortgage',
	'Has_Investments',
	'Smoker',
	'Chronic_Conditions',
]);

export default function ScenarioSimulator() {
	const {
		client,
		scenario,
		scenarioPrediction,
		prediction,
		initScenario,
		updateScenarioField,
		setScenarioPrediction,
		applyScenario,
		resetScenario,
	} = useClient();

	const [running, setRunning] = useState(false);
	const [error, setError] = useState(null);

	const handleInit = useCallback(() => {
		initScenario();
		setError(null);
		setScenarioPrediction(null);
	}, [initScenario, setScenarioPrediction]);

	const handleRun = useCallback(async () => {
		if (!scenario) return;
		setRunning(true);
		setError(null);
		try {
			const payload = { ...client, ...scenario };
			for (const f of NUMBER_FIELDS) {
				if (f in payload) payload[f] = Number(payload[f]) || 0;
			}
			for (const f of BOOLEAN_FIELDS) {
				if (f in payload) payload[f] = payload[f] ? 1 : 0;
			}
			const result = await postPredict(payload);
			setScenarioPrediction(result);
		} catch (err) {
			setError(err.message);
		} finally {
			setRunning(false);
		}
	}, [client, scenario, setScenarioPrediction]);

	if (!scenario) {
		return (
			<Card>
				<CardHeader>
					<CardTitle>Scenario Simulator</CardTitle>
				</CardHeader>
				<CardContent>
					<p className="mb-3 text-sm text-muted-foreground">
						Test "what-if" scenarios by adjusting client parameters and
						comparing predictions.
					</p>
					<Button onClick={handleInit} variant="outline" className="gap-2">
						<FlaskConical className="h-4 w-4" />
						Start Scenario
					</Button>
				</CardContent>
			</Card>
		);
	}

	const origTop = prediction?.prediction?.[0];
	const scenTop = scenarioPrediction?.prediction?.[0];

	return (
		<Card>
			<CardHeader>
				<div className="flex items-center justify-between">
					<CardTitle>Scenario Simulator</CardTitle>
					<Badge variant="info">Active</Badge>
				</div>
			</CardHeader>

			<CardContent className="space-y-4">
				{/* Editable fields */}
				<div className="grid grid-cols-2 gap-3">
					{SCENARIO_FIELDS.map(
						({ key, label, type, options, min, max, step }) => {
							const val = scenario[key] ?? client[key] ?? DEFAULT_CLIENT[key];

							if (type === 'boolean') {
								return (
									<label
										key={key}
										className="flex cursor-pointer items-center justify-between rounded-lg border border-border bg-background px-3 py-2"
									>
										<span className="text-xs text-muted-foreground">
											{label}
										</span>
										<input
											type="checkbox"
											checked={!!val}
											onChange={(e) =>
												updateScenarioField(key, e.target.checked ? 1 : 0)
											}
											className="h-4 w-4 rounded border-input accent-primary"
										/>
									</label>
								);
							}
							if (type === 'select') {
								return (
									<div key={key} className="space-y-1">
										<Label>{label}</Label>
										<Select
											value={val}
											onChange={(e) => updateScenarioField(key, e.target.value)}
										>
											{options.map((o) => (
												<option key={o} value={o}>
													{o}
												</option>
											))}
										</Select>
									</div>
								);
							}
							return (
								<div key={key} className="space-y-1">
									<Label>{label}</Label>
									<Input
										type="number"
										min={min}
										max={max}
										step={step}
										value={val}
										onChange={(e) =>
											updateScenarioField(key, Number(e.target.value) || 0)
										}
									/>
								</div>
							);
						},
					)}
				</div>

				{/* Run / Compare */}
				<div className="flex gap-2">
					<Button onClick={handleRun} disabled={running} className="gap-2">
						{running ? (
							<Spinner size="sm" />
						) : (
							<FlaskConical className="h-4 w-4" />
						)}
						{running ? 'Running…' : 'Run Scenario'}
					</Button>
					<Button variant="ghost" onClick={resetScenario} className="gap-2">
						<RotateCcw className="h-4 w-4" />
						Reset
					</Button>
				</div>

				{error && <p className="text-sm text-destructive">{error}</p>}

				{/* Comparison */}
				{scenTop && origTop && (
					<div className="rounded-lg border border-border bg-muted/30 p-4">
						<div className="mb-2 text-xs font-medium text-muted-foreground">
							Comparison
						</div>
						<div className="flex items-center gap-4">
							<div className="text-center">
								<div className="text-[11px] text-muted-foreground">
									Original
								</div>
								<div className="text-sm font-semibold text-foreground">
									{getBundleName(origTop.bundle_id)}
								</div>
								<div className="text-xs text-muted-foreground">
									{(origTop.probability * 100).toFixed(1)}%
								</div>
							</div>
							<ArrowRight className="h-4 w-4 text-muted-foreground" />
							<div className="text-center">
								<div className="text-[11px] text-muted-foreground">
									Scenario
								</div>
								<div className="text-sm font-semibold text-primary">
									{getBundleName(scenTop.bundle_id)}
								</div>
								<div className="text-xs text-muted-foreground">
									{(scenTop.probability * 100).toFixed(1)}%
								</div>
							</div>
						</div>
					</div>
				)}

				{scenTop && !origTop && (
					<div className="rounded-lg border border-border bg-muted/30 p-4">
						<div className="mb-1 text-xs font-medium text-muted-foreground">
							Scenario Result
						</div>
						<div className="text-sm font-semibold text-primary">
							{getBundleName(scenTop.bundle_id)}
						</div>
						<div className="text-xs text-muted-foreground">
							{(scenTop.probability * 100).toFixed(1)}% confidence
						</div>
					</div>
				)}
			</CardContent>

			{scenTop && (
				<CardFooter>
					<Button
						variant="outline"
						size="sm"
						onClick={applyScenario}
						className="gap-2"
					>
						<Check className="h-3.5 w-3.5" />
						Apply to Client
					</Button>
				</CardFooter>
			)}
		</Card>
	);
}
