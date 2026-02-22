/**
 * Mock / demo data used when backend services are unavailable.
 * Ensures the platform always shows meaningful content during demos.
 */

// ── Mock prediction result ──────────────────────────────────
export const MOCK_PREDICTION = {
	prediction: [
		{ bundle_id: 1, probability: 0.421 },
		{ bundle_id: 4, probability: 0.234 },
		{ bundle_id: 2, probability: 0.147 },
		{ bundle_id: 0, probability: 0.082 },
		{ bundle_id: 7, probability: 0.043 },
		{ bundle_id: 3, probability: 0.029 },
		{ bundle_id: 5, probability: 0.018 },
		{ bundle_id: 9, probability: 0.012 },
		{ bundle_id: 6, probability: 0.009 },
		{ bundle_id: 8, probability: 0.005 },
	],
	model_version: 'v1-demo',
	timestamp: new Date().toISOString(),
	prediction_id: 'demo-pred-001',
};

// ── Mock chat responses (keyword-matched) ───────────────────
const CHAT_RESPONSES = [
	{
		keywords: ['comprehensive', 'coverage', 'include'],
		reply:
			'Comprehensive coverage typically includes liability protection, collision damage, medical payments, uninsured motorist coverage, and personal property protection. Our **Family Shield** bundle offers the most complete coverage for households, while **Premium Life** adds critical illness and disability riders. The exact coverage depends on which bundle is selected — I can help compare specific bundles if you have a preference.',
	},
	{
		keywords: ['deductible', 'options'],
		reply:
			'We offer four deductible tiers:\n\n• **Tier 1 (High Deductible)** — $2,500: Lowest monthly premium, best for low-risk clients with emergency savings.\n• **Tier 2 (Standard)** — $1,000: Balanced premium-to-coverage ratio, our most popular option.\n• **Tier 3 (Low Deductible)** — $500: Higher premium but minimal out-of-pocket at claim time.\n• **Tier 4 (Zero Deductible)** — $0: Maximum protection, ideal for risk-averse clients.\n\nBased on client risk tolerance and income, our model factors deductible preference into bundle recommendations.',
	},
	{
		keywords: ['claim', 'file', 'accident'],
		reply:
			"Here's the claims process after an accident:\n\n1. **Report immediately** — Call our 24/7 claims hotline or submit via the mobile app within 48 hours.\n2. **Document everything** — Photos, police report number, witness contacts, and medical records.\n3. **Adjuster assignment** — A claims adjuster reviews within 2 business days.\n4. **Assessment & payout** — Average turnaround is 7–14 business days for straightforward claims.\n\nClients with zero-deductible bundles (Premium Life, Ultra Bundle) receive expedited processing. Previous claims history is factored into future premium adjustments.",
	},
	{
		keywords: ['premium', 'pricing', 'factor', 'affect'],
		reply:
			'Premium pricing is determined by several key factors:\n\n• **Age & demographics** — Younger and older clients generally face higher premiums.\n• **Credit score** — Higher scores (700+) qualify for preferential rates.\n• **Claims history** — Years without claims earn significant discounts (up to 25%).\n• **Risk tolerance** — Clients who opt for higher deductibles pay lower premiums.\n• **Location** — Urban areas typically cost 15-20% more than rural zones.\n• **Lifestyle factors** — Smoking, chronic conditions, and dependent count all affect rates.\n\nOur ML model analyzes all these factors to recommend the most cost-effective bundle for each client profile.',
	},
	{
		keywords: ['young family', 'family', 'children', 'kids'],
		reply:
			"For a young family, I'd recommend the **Family Shield** bundle. Here's why:\n\n• **Life insurance** with dependent coverage for all family members.\n• **Health coverage** that includes pediatric care and maternity benefits.\n• **Home protection** against property damage and liability.\n• **Education savings** rider to protect children's future.\n\nFamilies with 1-2 children and moderate income ($50K-$80K) see the best value with Family Shield. If the family has higher income or wants premium benefits, **Premium Life** is the upgrade path. The model typically predicts Family Shield with 40-45% confidence for this demographic.",
	},
	{
		keywords: ['bundle', 'recommend', 'best', 'suggest'],
		reply:
			"Bundle recommendations are personalized based on the client's full profile. Our top bundles by segment:\n\n• **Young professionals (25-35):** Basic Health or Auto Essential\n• **Families (30-50):** Family Shield (most popular, ~35% of all recommendations)\n• **High income ($100K+):** Premium Life or Ultra Bundle\n• **Seniors (60+):** Senior Care with comprehensive health riders\n• **Small business owners:** Business Pro with liability coverage\n\nLoad a specific client profile and run the prediction model to get a tailored recommendation with confidence scores.",
	},
	{
		keywords: ['hello', 'hi', 'hey', 'help'],
		reply:
			"Hello! I'm your insurance advisory AI assistant. I can help you with:\n\n• Understanding coverage bundles and what they include\n• Explaining deductible options and premium factors\n• Guiding you through the claims process\n• Recommending the best bundle for a client profile\n\nFeel free to ask anything about our insurance products or load a client profile for personalized recommendations!",
	},
];

const DEFAULT_REPLY =
	"That's a great question! Based on our insurance product portfolio, I'd recommend reviewing the client's full profile to give you the most accurate answer. You can load a client in the Client Workspace and run the prediction model to get personalized recommendations. Is there a specific bundle or coverage area you'd like me to explain in more detail?";

/**
 * Generate a mock chat reply based on keyword matching.
 */
export function getMockChatReply(message) {
	const lower = message.toLowerCase();
	for (const entry of CHAT_RESPONSES) {
		if (entry.keywords.some((kw) => lower.includes(kw))) {
			return { reply: entry.reply, sources: ['Demo Knowledge Base'] };
		}
	}
	return { reply: DEFAULT_REPLY, sources: ['Demo Knowledge Base'] };
}

// ── Mock predictions history for Insights ───────────────────
export const MOCK_PREDICTIONS_HISTORY = [
	{
		id: 'demo-1',
		timestamp: '2026-02-22T09:15:00Z',
		topBundle: 1,
		confidence: 0.421,
		modelVersion: 'v1',
	},
	{
		id: 'demo-2',
		timestamp: '2026-02-22T09:12:00Z',
		topBundle: 4,
		confidence: 0.387,
		modelVersion: 'v1',
	},
	{
		id: 'demo-3',
		timestamp: '2026-02-22T09:08:00Z',
		topBundle: 2,
		confidence: 0.512,
		modelVersion: 'v1',
	},
	{
		id: 'demo-4',
		timestamp: '2026-02-22T08:55:00Z',
		topBundle: 1,
		confidence: 0.445,
		modelVersion: 'v1',
	},
	{
		id: 'demo-5',
		timestamp: '2026-02-22T08:42:00Z',
		topBundle: 0,
		confidence: 0.298,
		modelVersion: 'v1',
	},
	{
		id: 'demo-6',
		timestamp: '2026-02-22T08:30:00Z',
		topBundle: 7,
		confidence: 0.361,
		modelVersion: 'v1',
	},
	{
		id: 'demo-7',
		timestamp: '2026-02-22T08:20:00Z',
		topBundle: 1,
		confidence: 0.478,
		modelVersion: 'v1',
	},
	{
		id: 'demo-8',
		timestamp: '2026-02-22T08:10:00Z',
		topBundle: 3,
		confidence: 0.335,
		modelVersion: 'v1',
	},
	{
		id: 'demo-9',
		timestamp: '2026-02-22T07:58:00Z',
		topBundle: 4,
		confidence: 0.402,
		modelVersion: 'v1',
	},
	{
		id: 'demo-10',
		timestamp: '2026-02-22T07:45:00Z',
		topBundle: 2,
		confidence: 0.489,
		modelVersion: 'v1',
	},
	{
		id: 'demo-11',
		timestamp: '2026-02-22T07:30:00Z',
		topBundle: 5,
		confidence: 0.267,
		modelVersion: 'v1',
	},
	{
		id: 'demo-12',
		timestamp: '2026-02-22T07:15:00Z',
		topBundle: 1,
		confidence: 0.455,
		modelVersion: 'v1',
	},
	{
		id: 'demo-13',
		timestamp: '2026-02-22T07:00:00Z',
		topBundle: 9,
		confidence: 0.312,
		modelVersion: 'v1',
	},
	{
		id: 'demo-14',
		timestamp: '2026-02-22T06:48:00Z',
		topBundle: 4,
		confidence: 0.378,
		modelVersion: 'v1',
	},
	{
		id: 'demo-15',
		timestamp: '2026-02-22T06:35:00Z',
		topBundle: 1,
		confidence: 0.501,
		modelVersion: 'v1',
	},
	{
		id: 'demo-16',
		timestamp: '2026-02-22T06:20:00Z',
		topBundle: 6,
		confidence: 0.289,
		modelVersion: 'v1',
	},
	{
		id: 'demo-17',
		timestamp: '2026-02-22T06:05:00Z',
		topBundle: 2,
		confidence: 0.467,
		modelVersion: 'v1',
	},
	{
		id: 'demo-18',
		timestamp: '2026-02-22T05:50:00Z',
		topBundle: 8,
		confidence: 0.243,
		modelVersion: 'v1',
	},
	{
		id: 'demo-19',
		timestamp: '2026-02-22T05:38:00Z',
		topBundle: 1,
		confidence: 0.439,
		modelVersion: 'v1',
	},
	{
		id: 'demo-20',
		timestamp: '2026-02-22T05:25:00Z',
		topBundle: 0,
		confidence: 0.356,
		modelVersion: 'v1',
	},
	{
		id: 'demo-21',
		timestamp: '2026-02-21T18:30:00Z',
		topBundle: 4,
		confidence: 0.412,
		modelVersion: 'v1',
	},
	{
		id: 'demo-22',
		timestamp: '2026-02-21T17:15:00Z',
		topBundle: 1,
		confidence: 0.468,
		modelVersion: 'v1',
	},
	{
		id: 'demo-23',
		timestamp: '2026-02-21T16:00:00Z',
		topBundle: 7,
		confidence: 0.341,
		modelVersion: 'v1',
	},
	{
		id: 'demo-24',
		timestamp: '2026-02-21T14:45:00Z',
		topBundle: 3,
		confidence: 0.295,
		modelVersion: 'v1',
	},
	{
		id: 'demo-25',
		timestamp: '2026-02-21T13:30:00Z',
		topBundle: 2,
		confidence: 0.523,
		modelVersion: 'v1',
	},
];
