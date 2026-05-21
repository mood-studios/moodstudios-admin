import { useState } from 'react';

export default function PasswordField({
  label,
  value,
  onChange,
  required = false,
  minLength,
  autoComplete,
  id,
  placeholder,
}) {
  const [visible, setVisible] = useState(false);

  return (
    <label>
      {label}
      <div className="password-input-wrap">
        <input
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={onChange}
          required={required}
          minLength={minLength}
          autoComplete={autoComplete}
          placeholder={placeholder}
        />
        <button
          type="button"
          className="password-toggle"
          onClick={() => setVisible((v) => !v)}
          aria-label={visible ? 'Hide password' : 'Show password'}
          aria-pressed={visible}
        >
          {visible ? 'Hide' : 'Show'}
        </button>
      </div>
    </label>
  );
}
