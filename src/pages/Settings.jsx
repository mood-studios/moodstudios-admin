import { useState } from 'react';
import PageHeader from '../components/PageHeader';
import PasswordField from '../components/PasswordField';
import { useAdminConfirm } from '../hooks/useAdminConfirm';
import { userApi } from '../api';
import { useAuth } from '../context/AuthContext';

export default function Settings() {
  const { user } = useAuth();
  const { confirmSave } = useAdminConfirm();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [saving, setSaving] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (newPassword.length < 8) {
      setError('New password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('New passwords do not match.');
      return;
    }

    const ok = await confirmSave('Change your admin password?', 'Change password');
    if (!ok) return;

    setSaving(true);
    try {
      await userApi.changePassword(currentPassword, newPassword);
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setSuccess('Password updated successfully.');
    } catch (err) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <PageHeader title="Settings" subtitle="Account and security" />

      <section className="panel" style={{ maxWidth: '32rem' }}>
        <h3 style={{ marginTop: 0 }}>Change password</h3>
        <p className="muted" style={{ marginTop: 0 }}>
          Signed in as <strong>{user?.email}</strong>
        </p>

        {error && <p className="form-error">{error}</p>}
        {success && <p className="form-success">{success}</p>}

        <form className="form-stack" onSubmit={handleSubmit}>
          <PasswordField
            label="Current password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
          <PasswordField
            label="New password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
          />
          <PasswordField
            label="Confirm new password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
          />
          <footer className="form-actions">
            <button type="submit" className="btn btn--primary" disabled={saving}>
              {saving ? 'Updating…' : 'Update password'}
            </button>
          </footer>
        </form>
      </section>
    </>
  );
}
