"use client";

import Image from "next/image";
import { useEffect, useState } from "react";
import type { ParkDetail } from "@/types/park";

interface ParkDetailPopupProps {
  unitCode: string;
  onClose: () => void;
}

const DESCRIPTION_TRUNCATE_LENGTH = 180;

export function ParkDetailPopup({ unitCode, onClose }: ParkDetailPopupProps) {
  const [detail, setDetail] = useState<ParkDetail | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imageError, setImageError] = useState(false);
  const [isDescriptionExpanded, setIsDescriptionExpanded] = useState(false);

  useEffect(() => {
    setIsDescriptionExpanded(false);
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function fetchDetail() {
      setIsLoading(true);
      setError(null);
      setImageError(false);

      try {
        const response = await fetch(`/api/parks/${unitCode}`);
        if (!response.ok) throw new Error("Failed to load park details");
        const data: ParkDetail = await response.json();
        if (!cancelled) setDetail(data);
      } catch (err) {
        if (!cancelled)
          setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    }

    fetchDetail();
    return () => {
      cancelled = true;
    };
  }, [unitCode]);

  // Loading state
  if (isLoading) {
    return (
      <div className="flex w-72 flex-col items-center justify-center gap-3 p-6">
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-gray-300 border-t-green-700" />
        <p className="text-sm text-gray-500">Loading park info…</p>
      </div>
    );
  }

  // Error state
  if (error || !detail) {
    return (
      <div className="flex w-72 flex-col items-center justify-center gap-2 p-6">
        <p className="text-sm text-red-600">{error || "Park not found"}</p>
        <button
          type="button"
          onClick={onClose}
          className="text-sm text-gray-500 underline hover:text-gray-700"
        >
          Close
        </button>
      </div>
    );
  }

  const heroImage = detail.images?.[0];
  const descriptionText = detail.description ?? "";
  const descriptionIsTruncatable =
    descriptionText.length > DESCRIPTION_TRUNCATE_LENGTH;
  const displayedDescription = descriptionText
    ? descriptionIsTruncatable && !isDescriptionExpanded
      ? `${descriptionText.slice(0, DESCRIPTION_TRUNCATE_LENGTH).trim()}…`
      : descriptionText
    : null;
  const stateAbbreviations = detail.state
    ? Array.from(
        new Set(
          detail.state
            .split(",")
            .map((state) => state.trim().toUpperCase())
            .filter(Boolean),
        ),
      )
    : [];
  const formattedStates = stateAbbreviations.join(", ");

  return (
    <div className="flex w-80 flex-col overflow-hidden">
      {/* Hero image */}
      {heroImage && !imageError ? (
        <div className="relative h-44 w-full overflow-hidden">
          <Image
            src={heroImage.url}
            alt={heroImage.altText || detail.fullName}
            fill
            sizes="320px"
            className="object-cover"
            onError={() => setImageError(true)}
            unoptimized
          />
          {heroImage.credit && (
            <span className="absolute bottom-1 right-1 rounded bg-black/50 px-1.5 py-0.5 text-[10px] text-white/80">
              {heroImage.credit}
            </span>
          )}
        </div>
      ) : (
        <div className="flex h-28 w-full items-center justify-center bg-gradient-to-br from-green-800 to-green-950">
          <span className="text-3xl">🏞️</span>
        </div>
      )}

      {/* Content */}
      <div className="flex flex-col gap-2 p-4">
        {/* Park name */}
        <h3 className="text-base font-semibold leading-tight text-gray-900">
          {detail.fullName}
        </h3>

        {/* Designation badge + state */}
        <div className="flex items-center gap-2">
          {detail.designation && (
            <span className="inline-block rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
              {detail.designation}
            </span>
          )}
          {formattedStates && (
            <span className="text-xs text-gray-500">{formattedStates}</span>
          )}
        </div>

        {/* Description */}
        {displayedDescription && (
          <div className="flex flex-col gap-1">
            <p className="text-sm leading-relaxed text-gray-600">
              {displayedDescription}
            </p>
            {descriptionIsTruncatable && (
              <button
                type="button"
                onClick={() => setIsDescriptionExpanded((prev) => !prev)}
                aria-label={
                  isDescriptionExpanded
                    ? "Collapse park description"
                    : "Expand park description"
                }
                className="self-start text-xs font-medium text-green-700 hover:text-green-900 transition-colors"
              >
                {isDescriptionExpanded ? "See less" : "See more"}
              </button>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="mt-1 flex items-center justify-between border-t border-gray-100 pt-3">
          {detail.url ? (
            <a
              href={detail.url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-sm font-medium text-green-700 hover:text-green-900 transition-colors"
            >
              Visit NPS.gov
              <svg
                aria-hidden="true"
                className="h-3.5 w-3.5"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.5 6H5.25A2.25 2.25 0 003 8.25v10.5A2.25 2.25 0 005.25 21h10.5A2.25 2.25 0 0018 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25"
                />
              </svg>
            </a>
          ) : (
            <span />
          )}
        </div>
      </div>
    </div>
  );
}
