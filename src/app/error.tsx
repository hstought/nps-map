"use client";

interface ErrorPageProps {
  error: Error & { digest?: string };
  reset: () => void;
}

export default function ErrorPage({ error, reset }: ErrorPageProps) {
  return (
    <div className="flex h-screen w-screen flex-col items-center justify-center gap-4 bg-gray-50">
      <div className="flex flex-col items-center gap-2 text-center">
        <span className="text-4xl">⚠️</span>
        <h2 className="text-lg font-semibold text-gray-900">
          Something went wrong
        </h2>
        <p className="max-w-md text-sm text-gray-600">
          {error.message ||
            "An unexpected error occurred while loading the map."}
        </p>
      </div>
      <button
        type="button"
        onClick={reset}
        className="rounded-lg bg-green-700 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-green-800"
      >
        Try again
      </button>
    </div>
  );
}
