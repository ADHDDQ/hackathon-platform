export default function Loader({ text = 'Loading…' }) {
	return (
		<div className="loader">
			<div className="loader-spinner" />
			<span>{text}</span>
		</div>
	);
}
