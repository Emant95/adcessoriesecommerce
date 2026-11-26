import { Link } from 'react-router-dom';

export default function NotFound() {
  return (
    <div className="container-x flex min-h-[50vh] flex-col items-center justify-center py-20 text-center">
      <p className="eyebrow">404</p>
      <h1 className="mt-3 text-4xl">This page has wandered off</h1>
      <p className="mt-3 text-taupe">The page you're looking for doesn't exist.</p>
      <Link to="/" className="btn-primary mt-8">Back to home</Link>
    </div>
  );
}
