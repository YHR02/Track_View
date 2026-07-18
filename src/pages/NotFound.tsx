import { Link } from 'react-router-dom';

export function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center animate-pop-in">
      <h1 className="text-6xl font-display font-black text-brand-600 mb-2">404</h1>
      <h2 className="text-xl font-bold font-display mb-4">Page Not Found</h2>
      <p className="text-sm opacity-60 max-w-xs mb-8">The page you are looking for does not exist or has been moved.</p>
      <Link 
        to="/" 
        className="px-5 py-2.5 bg-brand-600 hover:bg-brand-700 text-white rounded-xl font-semibold text-sm transition"
      >
        Go to Dashboard
      </Link>
    </div>
  );
}
