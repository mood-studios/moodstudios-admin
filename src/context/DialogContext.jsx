import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import ConfirmDialog from '../components/ConfirmDialog';

const DialogContext = createContext(null);

const DEFAULT_CONFIRM = {
  title: 'Confirm',
  message: '',
  confirmLabel: 'OK',
  cancelLabel: 'Cancel',
  danger: false,
};

export function DialogProvider({ children }) {
  const [dialog, setDialog] = useState(null);
  const resolveRef = useRef(null);

  const close = useCallback((result) => {
    const resolve = resolveRef.current;
    resolveRef.current = null;
    setDialog(null);
    resolve?.(result);
  }, []);

  const confirm = useCallback((options = {}) => {
    const opts = typeof options === 'string' ? { message: options } : options;
    return new Promise((resolve) => {
      resolveRef.current = resolve;
      setDialog({ type: 'confirm', ...DEFAULT_CONFIRM, ...opts });
    });
  }, []);

  const alert = useCallback((options = {}) => {
    const opts = typeof options === 'string' ? { message: options } : options;
    return new Promise((resolve) => {
      resolveRef.current = () => resolve();
      setDialog({
        type: 'alert',
        title: opts.title ?? 'Notice',
        message: opts.message ?? '',
        confirmLabel: opts.confirmLabel ?? 'OK',
        danger: false,
      });
    });
  }, []);

  useEffect(() => {
    if (!dialog) return undefined;

    const onKeyDown = (e) => {
      if (e.key === 'Escape') {
        if (dialog.type === 'alert') close();
        else close(false);
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [dialog, close]);

  return (
    <DialogContext.Provider value={{ confirm, alert }}>
      {children}
      {dialog && (
        <ConfirmDialog
          type={dialog.type}
          title={dialog.title}
          message={dialog.message}
          confirmLabel={dialog.confirmLabel}
          cancelLabel={dialog.cancelLabel}
          danger={dialog.danger}
          onConfirm={() => close(dialog.type === 'alert' ? undefined : true)}
          onCancel={() => close(false)}
        />
      )}
    </DialogContext.Provider>
  );
}

export function useDialog() {
  const ctx = useContext(DialogContext);
  if (!ctx) {
    throw new Error('useDialog must be used within DialogProvider');
  }
  return ctx;
}
