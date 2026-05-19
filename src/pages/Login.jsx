import { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function Login() {
  const { user, login, verifyOtp } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('login');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (user) return <Navigate to="/" replace />;

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const result = await login(email, password);
      if (result.requiresVerification) {
        setStep('otp');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleOtp = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await verifyOtp(email, otp);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="login-page">
      <article className="login-card">
        <header className="login-card__brand">
          <span className="login-card__logo">M</span>
          <h1>Mood Studios</h1>
          <p>Admin dashboard</p>
        </header>

        {step === 'login' ? (
          <form onSubmit={handleLogin} className="login-form">
            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                placeholder="you@example.com"
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
              />
            </label>
            {error && <p className="form-error">{error}</p>}
            <button type="submit" className="btn btn--primary btn--block" disabled={loading}>
              {loading ? 'Signing in…' : 'Sign in'}
            </button>
          </form>
        ) : (
          <form onSubmit={handleOtp} className="login-form">
            <p className="login-form__hint">Enter the verification code sent to {email}</p>
            <label>
              OTP code
              <input
                type="text"
                value={otp}
                onChange={(e) => setOtp(e.target.value)}
                required
                maxLength={6}
                inputMode="numeric"
                placeholder="123456"
              />
            </label>
            {error && <p className="form-error">{error}</p>}
            <button type="submit" className="btn btn--primary btn--block" disabled={loading}>
              {loading ? 'Verifying…' : 'Verify email'}
            </button>
            <button type="button" className="btn btn--ghost btn--block" onClick={() => setStep('login')}>
              Back to login
            </button>
          </form>
        )}
      </article>
    </section>
  );
}
