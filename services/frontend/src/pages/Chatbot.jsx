import { useEffect, useRef, useState } from 'react';
import Card from '../components/Card';
import Badge from '../components/Badge';
import EmptyState from '../components/EmptyState';
import { ragQuery } from '../lib/api';

const quickPrompts = [
	'What does comprehensive coverage include?',
	'Explain deductible options for auto insurance.',
	'How do I file a claim after an accident?',
	'What factors affect premium pricing?',
];

export default function Chatbot() {
	const [messages, setMessages] = useState([]);
	const [input, setInput] = useState('');
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState(null);
	const endRef = useRef(null);
	const mode = import.meta.env.MODE;
	const isDev = mode === 'development';
	const n8nUrl = isDev ? 'http://localhost:5678' : '/n8n/';

	useEffect(() => {
		endRef.current?.scrollIntoView({ behavior: 'smooth' });
	}, [messages, loading]);

	function createMessageId() {
		return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
	}

	async function handleSend(text) {
		const trimmed = text.trim();
		if (!trimmed || loading) {
			return;
		}
		setError(null);
		setInput('');
		const userMessage = {
			id: createMessageId(),
			role: 'user',
			content: trimmed,
		};
		setMessages((prev) => [...prev, userMessage]);
		setLoading(true);
		try {
			const data = await ragQuery(trimmed);
			const assistantMessage = {
				id: createMessageId(),
				role: 'assistant',
				content:
					typeof data.context === 'string'
						? data.context
						: JSON.stringify(data.context, null, 2),
				sources: Array.isArray(data.sources) ? data.sources : [],
			};
			setMessages((prev) => [...prev, assistantMessage]);
		} catch (err) {
			setError(err.message);
			setMessages((prev) => [
				...prev,
				{
					id: createMessageId(),
					role: 'assistant',
					content: 'Unable to reach the workflow. Check n8n and try again.',
				},
			]);
		} finally {
			setLoading(false);
		}
	}

	return (
		<div className="page">
			<h2 className="page-title">Chatbot</h2>

			<Card
				title="RAG Workflow Playground"
				actions={<Badge variant="info">n8n</Badge>}
			>
				<p className="muted">
					Send questions to the RAG pipeline and review the sources returned by
					the workflow.
				</p>
			</Card>

			<div className="grid-2">
				<Card title="Chat Console">
					<div className="chat-shell">
						<div className="chat-messages">
							{messages.length === 0 ? (
								<EmptyState
									icon="💬"
									title="Start a conversation"
									description="Ask a question to test the RAG workflow."
								/>
							) : (
								messages.map((msg) => (
									<div key={msg.id} className={`chat-message ${msg.role}`}>
										<div className="chat-bubble">{msg.content}</div>
										{msg.sources?.length > 0 && (
											<div className="chat-sources">
												<span className="muted">Sources</span>
												<div className="chat-source-list">
													{msg.sources.map((src) => (
														<Badge key={`${msg.id}-${src}`} variant="primary">
															{src}
														</Badge>
													))}
												</div>
											</div>
										)}
									</div>
								))
							)}
							{loading && (
								<div className="chat-message assistant">
									<div className="chat-bubble">Searching the knowledge base…</div>
								</div>
							)}
							<div ref={endRef} />
						</div>

						<div className="chat-input">
							<textarea
								rows="3"
								placeholder="Ask a question about policies, coverage, or claims..."
								value={input}
								onChange={(e) => setInput(e.target.value)}
								onKeyDown={(e) => {
									if (e.key === 'Enter' && !e.shiftKey) {
										e.preventDefault();
										handleSend(input);
									}
								}}
							/>
							<div className="btn-group mt-2">
								<button
									className="btn btn-primary"
									disabled={loading}
									onClick={() => handleSend(input)}
								>
									{loading ? 'Sending…' : 'Send'}
								</button>
								<button
									className="btn btn-outline"
									onClick={() => {
										setInput('');
										setMessages([]);
										setError(null);
									}}
								>
									Reset
								</button>
							</div>
							{error && <p className="error mt-2">Error: {error}</p>}
						</div>
					</div>
				</Card>

				<Card title="Quick Prompts">
					<div className="chat-prompts">
						{quickPrompts.map((prompt) => (
							<button
								key={prompt}
								className="btn btn-secondary"
								onClick={() => handleSend(prompt)}
							>
								{prompt}
							</button>
						))}
					</div>
					<div className="chat-links mt-2">
						<a
							className="btn btn-outline"
							href="/automations"
							onClick={(e) => {
								if (loading) {
									e.preventDefault();
								}
							}}
						>
							View Automations
						</a>
						<a
							className="btn btn-outline"
							href={n8nUrl}
							target="_blank"
							rel="noopener noreferrer"
						>
							Open n8n
						</a>
					</div>
				</Card>
			</div>
		</div>
	);
}
