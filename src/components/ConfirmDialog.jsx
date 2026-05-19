export default function ConfirmDialog({
  type = 'confirm',
  title,
  message,
  confirmLabel,
  cancelLabel,
  danger = false,
  onConfirm,
  onCancel,
}) {
  const isAlert = type === 'alert';

  return (
    <div
      className="modal-backdrop confirm-dialog-backdrop"
      onClick={isAlert ? onConfirm : onCancel}
      role="presentation"
    >
      <div
        className="confirm-dialog"
        onClick={(e) => e.stopPropagation()}
        role="alertdialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby="confirm-dialog-message"
      >
        <h2 id="confirm-dialog-title" className="confirm-dialog__title">
          {title}
        </h2>
        <p id="confirm-dialog-message" className="confirm-dialog__message">
          {message}
        </p>
        <footer className="confirm-dialog__actions">
          {!isAlert && (
            <button type="button" className="btn btn--ghost" onClick={onCancel}>
              {cancelLabel}
            </button>
          )}
          <button
            type="button"
            className={`btn ${danger ? 'btn--confirm-danger' : 'btn--primary'}`}
            onClick={onConfirm}
            autoFocus
          >
            {confirmLabel}
          </button>
        </footer>
      </div>
    </div>
  );
}
