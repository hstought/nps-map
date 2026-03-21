"use client";

import { ChevronDown, DollarSign } from "lucide-react";
import { useState } from "react";
import type { ParkEntranceFee } from "@/types/park";

interface EntranceFeesSectionProps {
  entranceFees: ParkEntranceFee[];
}

function formatCost(cost: string): string {
  const num = Number.parseFloat(cost);
  if (Number.isNaN(num) || num === 0) return "Free";
  return `$${num.toFixed(2)}`;
}

function FeeItem({ fee }: { fee: ParkEntranceFee }) {
  const [showDetails, setShowDetails] = useState(false);

  return (
    <div className="flex flex-col gap-0.5">
      <div className="flex items-baseline justify-between gap-2">
        <button
          type="button"
          onClick={() => fee.description && setShowDetails((prev) => !prev)}
          className={`text-left text-[11px] font-medium text-gray-700 ${fee.description ? "cursor-pointer hover:text-gray-900" : ""}`}
        >
          {fee.title}
          {fee.description && (
            <ChevronDown
              className={`ml-0.5 inline h-2.5 w-2.5 text-gray-400 transition-transform ${showDetails ? "rotate-180" : ""}`}
            />
          )}
        </button>
        <span className="shrink-0 text-[11px] font-semibold text-green-700">
          {formatCost(fee.cost)}
        </span>
      </div>
      {showDetails && fee.description && (
        <p className="text-[10px] leading-relaxed text-gray-500">
          {fee.description}
        </p>
      )}
    </div>
  );
}

export function EntranceFeesSection({
  entranceFees,
}: EntranceFeesSectionProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!entranceFees || entranceFees.length === 0) return null;

  return (
    <div className="rounded-lg border border-gray-100">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-gray-50"
        aria-expanded={isOpen}
      >
        <DollarSign className="h-3.5 w-3.5 text-green-700" />
        <span className="flex-1 text-xs font-medium text-gray-700">
          Entrance Fees
        </span>
        <span className="mr-1 text-[11px] font-semibold text-green-700">
          {formatCost(entranceFees[0].cost)}
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 text-gray-400 transition-transform ${
            isOpen ? "rotate-180" : ""
          }`}
        />
      </button>

      {isOpen && (
        <div className="flex flex-col gap-2 border-t border-gray-100 px-3 py-2">
          {entranceFees.map((fee, index) => (
            <FeeItem key={`${fee.title}-${index}`} fee={fee} />
          ))}
        </div>
      )}
    </div>
  );
}
