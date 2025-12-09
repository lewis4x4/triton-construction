import { useState, type FormEvent } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Mail, Lock, ArrowRight, AlertCircle, Loader2 } from 'lucide-react';
import { useAuth } from '../hooks/useAuth';
import './Login.css';

export function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const from = (location.state as { from?: string })?.from || '/';

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);
    setIsLoading(true);

    try {
      const { error } = await signIn(email, password);

      if (error) {
        setError(error.message);
        setIsLoading(false);
        return;
      }

      navigate(from, { replace: true });
    } catch (err) {
      setError('An unexpected error occurred. Please try again.');
      setIsLoading(false);
    }
  }

  return (
    <div className="login-page">
      {/* Left Hero Section */}
      <div className="login-hero">
        <div className="login-hero-overlay"></div>
        <div className="login-hero-content">
          <h1>
            Paving the <br />
            <span>Future.</span>
          </h1>
          <p>
            The comprehensive platform for heavy civil, road, and bridge contactors.
            Streamline your operations from bid to closeout.
          </p>
        </div>
      </div>

      {/* Right Form Section */}
      <div className="login-form-container">
        <div className="login-content-wrapper">
          <div className="login-header">
            {/* Logo placeholder - using text if image fails or for better scalability, 
                ideally use an SVG or the generic T circle from Layout */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '2rem' }}>
              <div style={{
                width: '40px', height: '40px', background: '#3D6B4F', color: 'white',
                borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                fontWeight: 'bold', fontSize: '24px'
              }}>T</div>
              <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#1A1A2E' }}>Triton</span>
            </div>

            <h2 className="login-title">Welcome back</h2>
            <p className="login-subtitle">Please enter your details to sign in.</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form">
            {error && (
              <div className="auth-error-banner">
                <AlertCircle size={20} />
                <span>{error}</span>
              </div>
            )}

            <div className="input-group">
              <label htmlFor="email" className="input-label">Email Address</label>
              <div className="input-wrapper">
                <Mail size={18} className="input-icon" />
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="login-input"
                  placeholder="name@company.com"
                  required
                  autoComplete="email"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="input-group">
              <label htmlFor="password" className="input-label">Password</label>
              <div className="input-wrapper">
                <Lock size={18} className="input-icon" />
                <input
                  id="password"
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="login-input"
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                  disabled={isLoading}
                />
              </div>
            </div>

            <div className="login-actions">
              <label className="remember-me">
                <input type="checkbox" className="remember-checkbox" />
                <span>Remember me</span>
              </label>
              <Link to="/forgot-password" className="forgot-password">
                Forgot password?
              </Link>
            </div>

            <button type="submit" className="login-button" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 size={20} className="animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <ArrowRight size={20} />
                </>
              )}
            </button>

            <div className="login-footer">
              Don't have an account?
              <Link to="/signup">Create an account</Link>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
