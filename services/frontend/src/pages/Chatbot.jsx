import { useEffect, useRef, useState } from 'react';
import {
	Card,
	CardHeader,
	CardTitle,
	CardContent,
} from '../components/ui/Card';
import { Badge } from '../components/ui/Badge';
import { Button } from '../components/ui/Button';
import { Textarea } from '../components/ui/Textarea';
import { Spinner } from '../components/ui/Spinner';
import { EmptyState } from '../components/ui/EmptyState';
import { useClient } from '../context/ClientContext';
import { sendChat } from '../lib/api';
import { getBundleName } from '../lib/bundles';
import { Send, RotateCcw, MessageCircle, User, Bot } from 'lucide-react';

const quickPrompts = [
	'What does comprehensive coverage include?',
	'Explain deductible options for auto insurance.',
	'How do I file a claim after an accident?',
	'What factors affect premium pricing?',
	'Which bundle best fits a young family?',
];

export default function Chatbot() {
	const [messages, setMessages] = useState([]);
	const [input, setInput] = useState('');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);
	const endRef = useRef(null);

	const { client, prediction } = useClient();

	useEffect(() => {
		endRef.current?.scrollIntoView({ behavior: 'smooth' });
	}, [messages, loading]);

	function createId() {
		return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
	}

	function buildClientContext() {
		if (!client?.User_ID) return null;
		const ctx = { clientId: client.User_ID };
		const topPred = prediction?.prediction?.[0];
		if (topPred) {
			ctx.topBundle = getBundleName(topPred.bundle_id);
			ctx.topProbability = topPred.probability;
		}
		for (const k of [
			'Age',
			'Gender',
			'Estimated_Annual_Income',
			'Previous_Claims_Filed',
			'Years_Without_Claims',
			'Risk_Tolerance',
		]) {
			if (client[k] !== undefined) ctx[k] = client[k];
		}
		return ctx;
	}

	async function handleSend(text) {
		const trimmed = text.trim();
		if (!trimmed || loading) return;
		setError(null);
		setInput('');
		const userMessage = { id: createId(), role: 'user', content: trimmed };
		setMessages((prev) => [...prev, userMessage]);
		setLoading(true);
		try {
			const clientContext = buildClientContext();
			const data = await sendChat(trimmed, clientContext);

			const reply =
				typeof data.reply === 'string'
					? data.reply
					: typeof data.context === 'string'
						? data.context
						: JSON.stringify(data, null, 2);

			setMessages((prev) => [
				...prev,
				{
					id: createId(),
					role: 'assistant',
					content: reply,
					sources: Array.isArray(data.sources) ? data.sources : [],
				},
			]);
		} catch (err) {
			setError(err.message);
			setMessages((prev) => [
				...prev,
				{
					id: createId(),
					role: 'assistant',
					content:
						'Unable to reach the chat service. Please check the backend and try again.',
				},
			]);
		} finally {
			setLoading(false);
		}
	}

	/* ── Client Context panel ─────────────────────────────────── */
	function renderClientPanel() {
		const hasClient = !!client?.User_ID;
		const topPred = prediction?.prediction?.[0];

		const fields = [
			{ label: 'Client ID', value: client?.User_ID, show: hasClient },
			{ label: 'Age', value: client?.Age, show: hasClient && client?.Age },
			{
				label: 'Gender',
				value: client?.Gender,
				show: hasClient && client?.Gender,
			},
			{
				label: 'Income',
				value:
					client?.Estimated_Annual_Income != null
						? `$${Number(client.Estimated_Annual_Income).toLocaleString()}`
						: null,
				show: hasClient && client?.Estimated_Annual_Income != null,
			},
			{
				label: 'Risk Tolerance',
				value: client?.Risk_Tolerance,
				show: hasClient && client?.Risk_Tolerance,
			},
		];

		return (
			<Card>
				<CardHeader>
					<CardTitle>Client Context</CardTitle>
				</CardHeader>
				<CardContent>
					{!hasClient ? (
						<EmptyState
							icon={User}
							title="No client loaded"
							description="Load a client in the Client Workspace to see their context here."
						/>
					) : (
						<div className="space-y-3">
							{fields
								.filter((f) => f.show)
								.map(({ label, value }) => (
									<div
										key={label}
										className="flex items-center justify-between border-b border-border pb-2 last:border-0 last:pb-0"
									>
										<span className="text-xs text-muted-foreground">
											{label}
										</span>
										<span className="text-sm font-medium text-foreground">
											{value}
										</span>
									</div>
								))}

							{topPred && (
								<div className="flex items-center justify-between pt-1">
									<span className="text-xs text-muted-foreground">
										Top Prediction
									</span>
									<Badge variant="success">
										{getBundleName(topPred.bundle_id)} (
										{(topPred.probability * 100).toFixed(1)}%)
									</Badge>
								</div>
							)}
							{!topPred && (
								<p className="text-xs text-muted-foreground">
									Run a prediction in the Client Workspace to see results here.
								</p>
							)}
						</div>
					)}
				</CardContent>
			</Card>
		);
	}

	return (
		<div className="grid h-[calc(100vh-7rem)] grid-cols-1 gap-6 lg:grid-cols-[1fr_320px]">
			{/* LEFT: Chat Console */}
			<Card className="flex flex-col overflow-hidden">
				<CardHeader className="shrink-0">
					<CardTitle>Chat Console</CardTitle>
				</CardHeader>
				<CardContent className="flex flex-1 flex-col overflow-hidden p-0">
					{/* Messages area */}
					<div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
						{messages.length === 0 ? (
							<EmptyState
								icon={MessageCircle}
								title="Start a conversation"
								description="Ask a question about policies, coverage, or claims."
							/>
						) : (
							messages.map((msg) => (
								<div
									key={msg.id}
									className={`flex gap-3 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
								>
									{msg.role === 'assistant' && (
										<div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
											<Bot className="h-3.5 w-3.5 text-primary" />
										</div>
									)}
									<div
										className={`max-w-[75%] rounded-xl px-4 py-2.5 text-sm leading-relaxed ${
											msg.role === 'user'
												? 'bg-primary text-primary-foreground'
												: 'bg-muted text-foreground'
										}`}
									>
										{msg.content}
										{msg.sources?.length > 0 && (
											<div className="mt-2 flex flex-wrap gap-1 border-t border-border/50 pt-2">
												{msg.sources.map((src) => (
													<Badge
														key={`${msg.id}-${src}`}
														variant="secondary"
														className="text-[10px]"
													>
														{src}
													</Badge>
												))}
											</div>
										)}
									</div>
									{msg.role === 'user' && (
										<div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-muted">
											<User className="h-3.5 w-3.5 text-muted-foreground" />
										</div>
									)}
								</div>
							))
						)}

						{loading && (
							<div className="flex gap-3">
								<div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-primary/10">
									<Bot className="h-3.5 w-3.5 text-primary" />
								</div>
								<div className="flex items-center gap-2 rounded-xl bg-muted px-4 py-2.5 text-sm text-muted-foreground">
									<Spinner size="sm" />
									Searching the knowledge base…
								</div>
							</div>
						)}
						<div ref={endRef} />
					</div>

					{/* Warning banner */}

					{/* Input area */}
					<div className="border-t border-border px-5 py-4">
						<Textarea
							rows={2}
							placeholder="Ask about policies, coverage, or claims…"
							value={input}
							onChange={(e) => setInput(e.target.value)}
							onKeyDown={(e) => {
								if (e.key === 'Enter' && !e.shiftKey) {
									e.preventDefault();
									handleSend(input);
								}
							}}
						/>
						<div className="mt-3 flex gap-2">
							<Button
								disabled={loading}
								onClick={() => handleSend(input)}
								className="gap-2"
							>
								{loading ? <Spinner size="sm" /> : <Send className="h-4 w-4" />}
								{loading ? 'Sending…' : 'Send'}
							</Button>
							<Button
								variant="outline"
								onClick={() => {
									setInput('');
									setMessages([]);
									setError(null);
								}}
								className="gap-2"
							>
								<RotateCcw className="h-4 w-4" />
								Reset
							</Button>
						</div>
						{error && (
							<p className="mt-2 text-xs text-destructive">Error: {error}</p>
						)}

						{/* Quick prompts */}
						<div className="mt-3 flex flex-wrap gap-1.5">
							{quickPrompts.map((prompt) => (
								<Button
									key={prompt}
									variant="secondary"
									size="sm"
									onClick={() => handleSend(prompt)}
									className="h-auto py-1 text-[11px]"
								>
									{prompt}
								</Button>
							))}
						</div>
					</div>
				</CardContent>
			</Card>

			{/* RIGHT: Client Context */}
			<div className="space-y-6">{renderClientPanel()}</div>
		</div>
	);
}
