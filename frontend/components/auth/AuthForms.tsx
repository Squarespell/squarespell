'use client';
/**
 * The sign-in, sign-up and password forms, shown inside AuthShell. They call our own sign-in API through
 * lib/auth/client (no third-party widget), so every message and field is ours to word and style.
 */
import React, { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { DASHBOARD_COLORS as C } from '@/app/dashboard/_components/dashboardColors';
import { authApi } from '@/lib/auth/client';

const ACC = C.ACCENT;

const S = {
  form: { display: 'flex', flexDirection: 'column' as const, gap: 16, width: '100%', fontFamily: C.FONT },
  title: { fontFamily: C.DISPLAY_FONT, fontWeight: 500, fontSize: 30, lineHeight: 1.15, letterSpacing: '-0.02em', color: C.INK, margin: 0 },
  sub: { fontSize: 15, lineHeight: 1.55, color: C.TEXT_SUBTLE, margin: '-6px 0 4px' },
  label: { display: 'flex', flexDirection: 'column' as const, gap: 6, fontSize: 14, fontWeight: 500, color: C.INK },
  input: {
    height: 46, padding: '0 14px', border: '1px solid ' + C.BORDER, borderRadius: 8, fontSize: 15, color: C.INK,
    background: '#fff', outline: 'none', fontFamily: C.FONT, width: '100%', boxSizing: 'border-box' as const,
  },
  button: {
    height: 48, border: 'none', borderRadius: 8, background: ACC, color: '#fff', fontSize: 15, fontWeight: 600,
    cursor: 'pointer', fontFamily: C.FONT,
  },
  secondary: {
    height: 48, border: '1px solid ' + C.BORDER, borderRadius: 8, background: '#fff', color: C.INK, fontSize: 15,
    fontWeight: 500, cursor: 'pointer', fontFamily: C.FONT, display: 'flex', alignItems: 'center', justifyContent: 'center',
    gap: 10, textDecoration: 'none',
  },
  error: { background: C.DANGER_LIGHT, color: C.DANGER, borderRadius: 8, padding: '10px 12px', fontSize: 14, lineHeight: 1.5 },
  notice: { background: C.BRAND_50, color: C.INK, borderRadius: 8, padding: '12px 14px', fontSize: 14, lineHeight: 1.55 },
  link: { color: ACC, textDecoration: 'none', fontWeight: 500 },
  small: { fontSize: 14, color: C.TEXT_SUBTLE, textAlign: 'center' as const },
  divider: { display: 'flex', alignItems: 'center', gap: 12, fontSize: 13, color: C.GRAY_400 },
  rule: { flex: 1, height: 1, background: C.BORDER },
};

function GoogleLogo() {
  return (
    <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.7 29.2 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.4-.4-3.5z" />
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 15.1 19 12 24 12c3.1 0 5.8 1.2 7.9 3.1l5.7-5.7C34 6.1 29.3 4 24 4 16.3 4 9.7 8.3 6.3 14.7z" />
      <path fill="#4CAF50" d="M24 44c5.2 0 9.9-2 13.4-5.2l-6.2-5.2C29.2 35.1 26.7 36 24 36c-5.2 0-9.6-3.3-11.3-8l-6.5 5C9.5 39.6 16.2 44 24 44z" />
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.2-4.1 5.6l6.2 5.2C37 39.2 44 34 44 24c0-1.3-.1-2.4-.4-3.5z" />
    </svg>
  );
}

function useGoogle(): boolean {
  const [on, setOn] = useState(false);
  useEffect(function () { authApi.config().then(function (c) { setOn(!!c.google); }); }, []);
  return on;
}

function GoogleButton({ next, label }: { next: string; label: string }) {
  return (
    <>
      <a href={authApi.googleUrl(next)} style={S.secondary}><GoogleLogo />{label}</a>
      <div style={S.divider}><span style={S.rule} />or<span style={S.rule} /></div>
    </>
  );
}

const GOOGLE_ERRORS: Record<string, string> = {
  google_unavailable: 'Google sign-in is not available right now. Use your email and password.',
  google_failed: 'Google sign-in did not finish. Please try again.',
  google_unverified: 'Google did not confirm that email address. Use another account or your email and password.',
};

export function SignInForm({ next, signUpHref, errorCode }: { next: string; signUpHref: string; errorCode?: string }) {
  const router = useRouter();
  const google = useGoogle();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(errorCode ? GOOGLE_ERRORS[errorCode] || '' : '');
  const [notice, setNotice] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(''); setNotice('');
    const r = await authApi.signIn(email, password);
    setBusy(false);
    if (r.ok) { router.replace(next); return; }
    if (r.data && r.data.code === 'password_not_set') { setNotice(r.data.error); return; }
    setError((r.data && r.data.error) || 'Could not sign in. Try again.');
  }

  return (
    <form onSubmit={submit} style={S.form} noValidate>
      <h1 style={S.title}>Sign in</h1>
      <p style={S.sub}>Welcome back. Sign in to your quizzes and leads.</p>
      {google && <GoogleButton next={next} label="Continue with Google" />}
      {error && <div role="alert" style={S.error}>{error}</div>}
      {notice && <div role="status" style={S.notice}>{notice}</div>}
      <label style={S.label}>Email
        <input style={S.input} type="email" autoComplete="email" required value={email} onChange={function (e) { setEmail(e.target.value); }} />
      </label>
      <label style={S.label}>
        <span style={{ display: 'flex', justifyContent: 'space-between' }}>Password <a href="/forgot-password" style={{ ...S.link, fontSize: 13 }}>Forgot password?</a></span>
        <input style={S.input} type="password" autoComplete="current-password" required value={password} onChange={function (e) { setPassword(e.target.value); }} />
      </label>
      <button type="submit" style={{ ...S.button, opacity: busy ? 0.7 : 1 }} disabled={busy}>{busy ? 'Signing in…' : 'Sign in'}</button>
      <p style={S.small}>New to Squarespell Quiz? <a href={signUpHref} style={S.link}>Create an account</a></p>
    </form>
  );
}

export function SignUpForm({ next, signInHref }: { next: string; signInHref: string }) {
  const router = useRouter();
  const google = useGoogle();
  const [firstName, setFirstName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError(''); setNotice('');
    const r = await authApi.signUp(email, password, firstName);
    setBusy(false);
    if (r.ok) { router.replace(next); return; }
    if (r.data && r.data.code === 'password_not_set') { setNotice(r.data.error); return; }
    setError((r.data && r.data.error) || 'Could not create the account. Try again.');
  }

  return (
    <form onSubmit={submit} style={S.form} noValidate>
      <h1 style={S.title}>Create your account</h1>
      <p style={S.sub}>Build quiz funnels from your website in minutes.</p>
      {google && <GoogleButton next={next} label="Sign up with Google" />}
      {error && <div role="alert" style={S.error}>{error}</div>}
      {notice && <div role="status" style={S.notice}>{notice}</div>}
      <label style={S.label}>First name
        <input style={S.input} type="text" autoComplete="given-name" value={firstName} onChange={function (e) { setFirstName(e.target.value); }} />
      </label>
      <label style={S.label}>Email
        <input style={S.input} type="email" autoComplete="email" required value={email} onChange={function (e) { setEmail(e.target.value); }} />
      </label>
      <label style={S.label}>Password
        <input style={S.input} type="password" autoComplete="new-password" required minLength={10} value={password} onChange={function (e) { setPassword(e.target.value); }} />
        <span style={{ fontSize: 13, fontWeight: 400, color: C.TEXT_SUBTLE }}>At least 10 characters. A short phrase works well.</span>
      </label>
      <button type="submit" style={{ ...S.button, opacity: busy ? 0.7 : 1 }} disabled={busy}>{busy ? 'Creating account…' : 'Create account'}</button>
      <p style={S.small}>Already have an account? <a href={signInHref} style={S.link}>Sign in</a></p>
    </form>
  );
}

export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState('');
  const [error, setError] = useState('');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true); setError('');
    const r = await authApi.forgotPassword(email);
    setBusy(false);
    if (r.ok) setSent((r.data && r.data.message) || 'Check your inbox for a reset link.');
    else setError((r.data && r.data.error) || 'Could not send the email. Try again.');
  }

  return (
    <form onSubmit={submit} style={S.form} noValidate>
      <h1 style={S.title}>Reset your password</h1>
      <p style={S.sub}>Enter your account email and we will send you a link to choose a new password.</p>
      {error && <div role="alert" style={S.error}>{error}</div>}
      {sent ? <div role="status" style={S.notice}>{sent}</div> : (
        <>
          <label style={S.label}>Email
            <input style={S.input} type="email" autoComplete="email" required value={email} onChange={function (e) { setEmail(e.target.value); }} />
          </label>
          <button type="submit" style={{ ...S.button, opacity: busy ? 0.7 : 1 }} disabled={busy}>{busy ? 'Sending…' : 'Send reset link'}</button>
        </>
      )}
      <p style={S.small}><a href="/sign-in" style={S.link}>Back to sign in</a></p>
    </form>
  );
}

export function ResetPasswordForm({ token }: { token: string }) {
  const router = useRouter();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(token ? '' : 'This link is missing its code. Ask for a new reset link.');

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (password !== confirm) { setError('The two passwords do not match.'); return; }
    setBusy(true); setError('');
    const r = await authApi.resetPassword(token, password);
    setBusy(false);
    if (r.ok) { router.replace('/dashboard'); return; }
    setError((r.data && r.data.error) || 'Could not set the password. Try again.');
  }

  return (
    <form onSubmit={submit} style={S.form} noValidate>
      <h1 style={S.title}>Choose a new password</h1>
      <p style={S.sub}>Use at least 10 characters. You will be signed in right after.</p>
      {error && <div role="alert" style={S.error}>{error} {/expired|already used|missing/.test(error) && <a href="/forgot-password" style={S.link}>Send a new link</a>}</div>}
      <label style={S.label}>New password
        <input style={S.input} type="password" autoComplete="new-password" required minLength={10} value={password} onChange={function (e) { setPassword(e.target.value); }} />
      </label>
      <label style={S.label}>Repeat new password
        <input style={S.input} type="password" autoComplete="new-password" required minLength={10} value={confirm} onChange={function (e) { setConfirm(e.target.value); }} />
      </label>
      <button type="submit" style={{ ...S.button, opacity: busy || !token ? 0.7 : 1 }} disabled={busy || !token}>{busy ? 'Saving…' : 'Save password and sign in'}</button>
    </form>
  );
}

export function VerifyEmailView({ token }: { token: string }) {
  const [state, setState] = useState<'working' | 'done' | 'failed'>(token ? 'working' : 'failed');
  const [message, setMessage] = useState(token ? '' : 'This link is missing its code.');
  useEffect(function () {
    if (!token) return;
    authApi.verifyEmail(token).then(function (r) {
      if (r.ok) setState('done');
      else { setState('failed'); setMessage((r.data && r.data.error) || 'This link has expired or was already used.'); }
    });
  }, [token]);
  return (
    <div style={S.form}>
      <h1 style={S.title}>{state === 'done' ? 'Email confirmed' : state === 'working' ? 'Confirming your email…' : 'Link not valid'}</h1>
      {state === 'done' && <p style={S.sub}>Thanks. Your email address is confirmed.</p>}
      {state === 'failed' && <div role="alert" style={S.error}>{message} Sign in and we can send you a new link.</div>}
      {state !== 'working' && <a href="/dashboard" style={{ ...S.button, display: 'flex', alignItems: 'center', justifyContent: 'center', textDecoration: 'none' }}>Go to dashboard</a>}
    </div>
  );
}
