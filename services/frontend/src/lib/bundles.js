/**
 * Bundle ID → human-readable name mapping.
 * Replace these placeholder names with real product names when available.
 */
export const BUNDLE_NAMES = {
	0: 'Basic Health',
	1: 'Family Shield',
	2: 'Premium Life',
	3: 'Auto Essential',
	4: 'Home Protect',
	5: 'Travel Safe',
	6: 'Business Pro',
	7: 'Senior Care',
	8: 'Student Cover',
	9: 'Ultra Bundle',
};

export const BUNDLE_COLORS = {
	0: '#38bdf8',
	1: '#818cf8',
	2: '#f472b6',
	3: '#fb923c',
	4: '#34d399',
	5: '#facc15',
	6: '#a78bfa',
	7: '#f87171',
	8: '#2dd4bf',
	9: '#e879f9',
};

export function getBundleName(id) {
	return BUNDLE_NAMES[id] ?? `Bundle_${id}`;
}

export function getBundleColor(id) {
	return BUNDLE_COLORS[id] ?? '#94a3b8';
}
