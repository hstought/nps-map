"use client";

import { ChevronDown, Clock } from "lucide-react";
import { useState } from "react";
import type { ParkOperatingHours } from "@/types/park";

interface OperatingHoursSectionProps {
  operatingHours: ParkOperatingHours[];
}

const DAY_ORDER = [
  "monday",
  "tuesday",
  "wednesday",
  "thursday",
  "friday",
  "saturday",
  "sunday",
] as const;

const DAY_LABELS: Record<string, string> = {
  monday: "Mon",
  tuesday: "Tue",
  wednesday: "Wed",
  thursday: "Thu",
  friday: "Fri",
  saturday: "Sat",
  sunday: "Sun",
};

function formatHours(hours: string): string {
  if (!hours || hours.toLowerCase() === "closed") return "Closed";
  if (hours.toLowerCase().includes("all day") || hours === "24 Hours")
    return "24 Hours";
  return hours;
}

export function OperatingHoursSection({
  operatingHours,
}: OperatingHoursSectionProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!operatingHours || operatingHours.length === 0) return null;

  const primaryHours = operatingHours[0];

  return (
    <div className="rounded-lg border border-gray-100">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-gray-50"
        aria-expanded={isOpen}
      >
        <Clock className="h-3.5 w-3.5 text-green-700" />
        <span className="flex-1 text-xs font-medium text-gray-700">
          Operating Hours
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-gray-400 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="border-t border-gray-100 px-3 py-2">
          {primaryHours.name && (
            <p className="mb-1.5 text-[11px] font-medium text-gray-600">
              {primaryHours.name}
            </p>
          )}

          {/* Day-by-day hours */}
          {(() => {
            const formattedHours = DAY_ORDER.map((day) => ({
              day,
              hours: formatHours(primaryHours.standardHours?.[day] ?? ""),
            }));
            const allSame = formattedHours.every(
              (d) => d.hours === formattedHours[0].hours
            );

            if (allSame && formattedHours[0].hours) {
              return (
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-[11px] font-medium text-gray-500">
                    Mon–Sun
                  </span>
                  <span className="text-[11px] text-gray-700">
                    {formattedHours[0].hours}
                  </span>
                </div>
              );
            }

            return (
              <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5">
                {formattedHours.map(({ day, hours }) => {
                  if (!hours) return null;
                  const isClosed = hours === "Closed";
                  return (
                    <div key={day} className="contents">
                      <span className="text-[11px] font-medium text-gray-500">
                        {DAY_LABELS[day]}
                      </span>
                      <span
                        className={`text-[11px] ${isClosed ? "text-red-500" : "text-gray-700"}`}
                      >
                        {hours}
                      </span>
                    </div>
                  );
                })}
              </div>
            );
          })()}

          {/* Exceptions (deduplicated by name + dates) */}
          {primaryHours.exceptions?.length > 0 &&
            (() => {
              const seen = new Set<string>();
              const unique = primaryHours.exceptions.filter((ex) => {
                const key = `${ex.name}|${ex.startDate}|${ex.endDate}`;
                if (seen.has(key)) return false;
                seen.add(key);
                return true;
              });
              return (
                <div className="mt-2 border-t border-gray-50 pt-2">
                  <p className="mb-1 text-[10px] font-medium text-amber-700">
                    Exceptions
                  </p>
                  {unique.map((exception) => (
                    <div key={`${exception.name}-${exception.startDate}-${exception.endDate}`} className="mb-1 last:mb-0">
                      <p className="text-[10px] font-medium text-gray-600">
                        {exception.name}
                      </p>
                      <p className="text-[10px] text-gray-400">
                        {exception.startDate} – {exception.endDate}
                      </p>
                    </div>
                  ))}
                </div>
              );
            })()}

          {/* Additional hours entries */}
          {operatingHours.length > 1 && (
            <div className="mt-2 border-t border-gray-50 pt-2">
              {operatingHours.slice(1).map((entry) => (
                <div key={entry.name} className="mb-2 last:mb-0">
                  <p className="mb-1 text-[11px] font-medium text-gray-600">
                    {entry.name}
                  </p>
                  {entry.description && (
                    <p className="mb-1 text-[10px] text-gray-500">
                      {entry.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
