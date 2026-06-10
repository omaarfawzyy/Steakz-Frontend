import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useApp } from '../context/AppContext';
import { getRoleLabel } from '../lib/utils';

export function LoginPage() {
  const navigate = useNavigate();
  const { currentUser, error, registerCustomer, session, signIn } = useApp();
  const [activeMode, setActiveMode] = useState('signin');
  const [signInForm, setSignInForm] = useState({
    email: '',
    password: '',
  });
  const [registerForm, setRegisterForm] = useState({
    fullName: '',
    email: '',
    phone: '',
    password: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  function updateSignInField(event) {
    const { name, value } = event.target;
    setSignInForm((previous) => ({ ...previous, [name]: value }));
  }

  function updateRegisterField(event) {
    const { name, value } = event.target;
    setRegisterForm((previous) => ({ ...previous, [name]: value }));
  }

  async function handleSignIn(event) {
    event.preventDefault();
    setFormError('');
    setIsSubmitting(true);

    try {
      const user = await signIn(signInForm.email, signInForm.password);
      navigate(`/portal/${user.role}`);
    } catch (err) {
      setFormError(err.message || 'Unable to sign in. Please check the account details.');
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleRegister(event) {
    event.preventDefault();
    setFormError('');
    setIsSubmitting(true);

    try {
      const user = await registerCustomer(registerForm);
      navigate(`/portal/${user.role}`);
    } catch (err) {
      setFormError(err.message || 'Unable to create the customer account.');
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="access-layout">
      <section className="panel panel--form access-panel">
        <div className="section-heading">
          <div>
            <span className="eyebrow">Steakz account</span>
            <h1>Sign in or create your Steakz account.</h1>
            <p>
              Save your details, reserve tables faster, and review your Steakz booking history
              from one private customer account.
            </p>
          </div>
        </div>

        {session ? (
          <section className="panel panel--success access-session">
            <span className="eyebrow">Current account</span>
            <h2>{currentUser?.name ?? getRoleLabel(session.role)}</h2>
            <p>{getRoleLabel(session.role)} access is active.</p>
            <NavLink to={`/portal/${session.role}`} className="button button--primary">
              Open account
            </NavLink>
          </section>
        ) : null}

        <div className="access-tabs" role="tablist" aria-label="Access options">
          <button
            type="button"
            className={activeMode === 'signin' ? 'access-tab access-tab--active' : 'access-tab'}
            onClick={() => {
              setActiveMode('signin');
              setFormError('');
            }}
          >
            Sign in
          </button>
          <button
            type="button"
            className={activeMode === 'register' ? 'access-tab access-tab--active' : 'access-tab'}
            onClick={() => {
              setActiveMode('register');
              setFormError('');
            }}
          >
            Create customer account
          </button>
        </div>

        {activeMode === 'signin' ? (
          <form className="form-grid form-grid--single" onSubmit={handleSignIn}>
            <label className="field">
              <span className="field__label">Email address</span>
              <input
                name="email"
                type="email"
                value={signInForm.email}
                onChange={updateSignInField}
                placeholder="name@steakz.co.uk"
                autoComplete="email"
                required
              />
            </label>

            <label className="field">
              <span className="field__label">Password</span>
              <input
                name="password"
                type="password"
                value={signInForm.password}
                onChange={updateSignInField}
                placeholder="Enter your password"
                autoComplete="current-password"
                required
              />
            </label>

            {formError || error ? (
              <p className="form-alert">{formError || error}</p>
            ) : null}

            <button type="submit" className="button button--primary button--full" disabled={isSubmitting}>
              {isSubmitting ? 'Signing in...' : 'Sign in'}
            </button>
          </form>
        ) : (
          <form className="form-grid form-grid--single" onSubmit={handleRegister}>
            <label className="field">
              <span className="field__label">Full name</span>
              <input
                name="fullName"
                value={registerForm.fullName}
                onChange={updateRegisterField}
                placeholder="Enter your full name"
                autoComplete="name"
                required
              />
            </label>

            <label className="field">
              <span className="field__label">Email address</span>
              <input
                name="email"
                type="email"
                value={registerForm.email}
                onChange={updateRegisterField}
                placeholder="customer@example.com"
                autoComplete="email"
                required
              />
            </label>

            <label className="field">
              <span className="field__label">Phone number</span>
              <input
                name="phone"
                value={registerForm.phone}
                onChange={updateRegisterField}
                placeholder="+44 7700 900000"
                autoComplete="tel"
              />
            </label>

            <label className="field">
              <span className="field__label">Password</span>
              <input
                name="password"
                type="password"
                minLength="8"
                value={registerForm.password}
                onChange={updateRegisterField}
                placeholder="Create a password"
                autoComplete="new-password"
                required
              />
            </label>

            {formError || error ? (
              <p className="form-alert">{formError || error}</p>
            ) : null}

            <button type="submit" className="button button--primary button--full" disabled={isSubmitting}>
              {isSubmitting ? 'Creating account...' : 'Create customer account'}
            </button>
          </form>
        )}
      </section>

      <aside className="access-aside">
        <section className="panel">
          <span className="eyebrow">Customer reservations</span>
          <h2>Login is required to book a table.</h2>
          <p>
            Public guests can view the menu first. To reserve a table, create a customer account or
            sign in so Steakz can save the booking to your profile.
          </p>
          <NavLink to="/login" className="button button--ghost">
            Sign in to reserve
          </NavLink>
        </section>

        <section className="panel">
          <span className="eyebrow">Why create an account?</span>
          <ul className="detail-list">
            <li>Book faster with your saved contact details.</li>
            <li>Track your reservations and upcoming visits.</li>
            <li>Keep every table booking connected to your profile.</li>
            <li>Keep your Steakz dining history in one place.</li>
          </ul>
        </section>
      </aside>
    </div>
  );
}
