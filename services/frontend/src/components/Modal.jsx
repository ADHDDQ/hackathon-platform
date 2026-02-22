export default function Modal({ open, onClose, title, children }) {
	if (!open) return null;
	return (
		<div className="modal-overlay" onClick={onClose}>
			<div className="modal-content" onClick={(e) => e.stopPropagation()}>
				<div className="modal-header">
					<h2 className="modal-title">{title}</h2>
					<button className="modal-close" onClick={onClose}>
						✕
					</button>
				</div>
				<div className="modal-body">{children}</div>
			</div>
		</div>
	);
}
