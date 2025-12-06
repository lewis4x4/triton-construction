import { useState, type FormEvent } from 'react';
import { Link } from 'react-router-dom';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;

export function Signup() {
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    organizationName: '',
  });
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length < 8) {
      setError('Password must be at least 8 characters');
      return;
    }

    setIsLoading(true);

    try {
      const response = await fetch(`${SUPABASE_URL}/functions/v1/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          firstName: formData.firstName,
          lastName: formData.lastName,
          organizationName: formData.organizationName,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to create account');
        setIsLoading(false);
        return;
      }

      setSuccess(true);
    } catch (err) {
      setError('Network error. Please try again.');
      setIsLoading(false);
    }
  }

  if (success) {
    return (
      <div className="auth-container">
        <div className="auth-card">
          <div className="auth-header">
            <img
              src="/fb-logo.jpg"
              alt="Triton Construction, Inc."
              className="auth-logo-image"
            />
          </div>

          <div className="auth-success">
            <h2>Account Created!</h2>
            <p>
              Your account and organization have been created successfully.
              You can now sign in with your credentials.
            </p>
            <Link to="/login" className="auth-button">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-container">
      <div className="auth-card">
        <div className="auth-header">
          <img
            src="/fb-logo.jpg"
            alt="Triton Construction, Inc."
            className="auth-logo-image"
          />
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <h2>Create Account</h2>

          {error && (
            <div className="auth-error">
              {error}
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="firstName">First Name</label>
              <input
                id="firstName"
                name="firstName"
                type="text"
                value={formData.firstName}
                onChange={handleChange}
                placeholder="John"
                required
                disabled={isLoading}
              />
            </div>

            <div className="form-group">
              <label htmlFor="lastName">Last Name</label>
              <input
                id="lastName"
                name="lastName"
                type="text"
                value={formData.lastName}
                onChange={handleChange}
                placeholder="Smith"
                required
                disabled={isLoading}
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="you@company.com"
              required
              autoComplete="email"
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="organizationName">Company Name</label>
            <input
              id="organizationName"
              name="organizationName"
              type="text"
              value={formData.organizationName}
              onChange={handleChange}
              placeholder="Triton Construction, Inc."
              required
              disabled={isLoading}
            />
            <span className="form-hint">You'll be the administrator of this organization</span>
          </div>

          <div className="form-group">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="At least 8 characters"
              required
              autoComplete="new-password"
              disabled={isLoading}
            />
          </div>

          <div className="form-group">
            <label htmlFor="confirmPassword">Confirm Password</label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleChange}
              placeholder="Confirm your password"
              required
              autoComplete="new-password"
              disabled={isLoading}
            />
          </div>

          <button type="submit" className="auth-button" disabled={isLoading}>
            {isLoading ? 'Creating Account...' : 'Create Account'}
          </button>

          <div className="auth-links">
            <span>Already have an account?</span>
            <Link to="/login">Sign In</Link>
          </div>
        </form>
      </div>
    </div>
  );
}
