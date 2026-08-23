import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="h-screen w-screen bg-[#0A0C0E] text-neutral-200 flex flex-col items-center justify-center p-6 text-center font-sans">
      <h2 className="text-2xl font-bold text-neutral-100 mb-2">404 - Page Not Found</h2>
      <p className="text-neutral-400 text-xs mb-4">The requested page or resource could not be found.</p>
      <Link
        href="/"
        className="px-3 py-1.5 bg-[#1F242C] hover:bg-[#2A313C] border border-[#30363D] rounded text-xs font-medium text-sky-400 transition-colors"
      >
        Return to Workbench
      </Link>
    </div>
  );
}
