import { useDialog } from '../context/DialogContext';

/**
 * Standard confirmations for admin actions (not used on Messages / Chat).
 */
export function useAdminConfirm() {
  const { confirm, alert } = useDialog();

  const confirmDelete = (message, title = 'Delete') =>
    confirm({
      title,
      message,
      confirmLabel: 'Delete',
      danger: true,
    });

  const confirmRemove = (message, title = 'Remove') =>
    confirm({
      title,
      message,
      confirmLabel: 'Remove',
      danger: true,
    });

  const confirmSave = (message, title = 'Save changes') =>
    confirm({
      title,
      message,
      confirmLabel: 'Save',
    });

  const confirmUpdate = (message, title = 'Confirm') =>
    confirm({
      title,
      message,
      confirmLabel: 'Continue',
    });

  const confirmUpload = (message, title = 'Upload') =>
    confirm({
      title,
      message,
      confirmLabel: 'Upload',
    });

  const confirmLogout = (message = 'Are you sure you want to sign out?', title = 'Log out') =>
    confirm({
      title,
      message,
      confirmLabel: 'Log out',
    });

  return {
    confirm,
    alert,
    confirmDelete,
    confirmRemove,
    confirmSave,
    confirmUpdate,
    confirmUpload,
    confirmLogout,
  };
}
