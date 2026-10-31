import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div style={{
      padding: '80px 40px', maxWidth: 480,
      margin: '0 auto', textAlign: 'center',
    }}>
      <p style={{
        fontFamily: 'var(--font-mono)', fontSize: 64, fontWeight: 700,
        color: 'var(--line)', lineHeight: 1, marginBottom: 20,
      }}>
        404
      </p>
      <h1 style={{ fontSize: 20, fontWeight: 600, color: 'var(--ink)', marginBottom: 10 }}>
        Page not found
      </h1>
      <p className="body-sm" style={{ marginBottom: 28 }}>
        The page you're looking for doesn't exist or has been moved.
      </p>
      <Link to="/" className="btn btn-primary" id="404-home-btn">
        Back to home
      </Link>
    </div>
  );
}
