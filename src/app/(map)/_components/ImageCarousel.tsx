"use client";

import useEmblaCarousel from "embla-carousel-react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import Image from "next/image";
import { useCallback, useEffect, useState } from "react";
import type { ParkImage } from "@/types/park";

interface ImageCarouselProps {
  images: ParkImage[];
  parkName: string;
}

export function ImageCarousel({ images, parkName }: ImageCarouselProps) {
  const [imageErrors, setImageErrors] = useState<Set<number>>(new Set());
  const [emblaRef, emblaApi] = useEmblaCarousel({ loop: true });
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [canScrollPrev, setCanScrollPrev] = useState(false);
  const [canScrollNext, setCanScrollNext] = useState(false);

  const validImages = images.filter((_, i) => !imageErrors.has(i));
  const hasMultiple = validImages.length > 1;

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setSelectedIndex(emblaApi.selectedScrollSnap());
    setCanScrollPrev(emblaApi.canScrollPrev());
    setCanScrollNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    return () => {
      emblaApi.off("select", onSelect);
      emblaApi.off("reInit", onSelect);
    };
  }, [emblaApi, onSelect]);

  const scrollPrev = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      emblaApi?.scrollPrev();
    },
    [emblaApi],
  );

  const scrollNext = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      emblaApi?.scrollNext();
    },
    [emblaApi],
  );

  const handleImageError = useCallback((index: number) => {
    setImageErrors((prev) => new Set(prev).add(index));
  }, []);

  // No valid images — show fallback
  if (images.length === 0 || validImages.length === 0) {
    return (
      <div className="flex h-28 w-full items-center justify-center bg-gradient-to-br from-green-800 to-green-950">
        <span className="text-3xl">🏞️</span>
      </div>
    );
  }

  // Single image — simple render (no carousel)
  if (!hasMultiple) {
    const img = validImages[0];
    return (
      <div className="relative h-44 w-full overflow-hidden">
        <Image
          src={img.url}
          alt={img.altText || parkName}
          fill
          sizes="384px"
          className="object-cover"
          onError={() => handleImageError(images.indexOf(img))}
          unoptimized
        />
        {img.credit && (
          <span className="absolute bottom-1 right-1 rounded bg-black/50 px-1.5 py-0.5 text-[10px] text-white/80">
            {img.credit}
          </span>
        )}
      </div>
    );
  }

  // Multiple images — carousel
  return (
    <div className="relative h-44 w-full overflow-hidden">
      <div className="embla h-full" ref={emblaRef}>
        <div className="embla__container flex h-full">
          {images.map((img, index) =>
            imageErrors.has(index) ? null : (
              <div
                className="embla__slide relative h-full min-w-0 flex-[0_0_100%]"
                key={`${img.url}-${index}`}
              >
                <Image
                  src={img.url}
                  alt={img.altText || `${parkName} photo ${index + 1}`}
                  fill
                  sizes="384px"
                  className="object-cover"
                  onError={() => handleImageError(index)}
                  unoptimized
                />
                {img.credit && (
                  <span className="absolute bottom-1 right-1 rounded bg-black/50 px-1.5 py-0.5 text-[10px] text-white/80">
                    {img.credit}
                  </span>
                )}
              </div>
            ),
          )}
        </div>
      </div>

      {/* Previous / Next arrows */}
      {canScrollPrev && (
        <button
          type="button"
          onClick={scrollPrev}
          aria-label="Previous image"
          className="absolute top-1/2 left-2 -translate-y-1/2 rounded-full bg-black/40 p-1 text-white backdrop-blur-sm transition-colors hover:bg-black/60"
        >
          <ChevronLeft className="h-4 w-4" />
        </button>
      )}
      {canScrollNext && (
        <button
          type="button"
          onClick={scrollNext}
          aria-label="Next image"
          className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full bg-black/40 p-1 text-white backdrop-blur-sm transition-colors hover:bg-black/60"
        >
          <ChevronRight className="h-4 w-4" />
        </button>
      )}

      {/* Dot indicators */}
      <div className="absolute bottom-2 left-1/2 flex -translate-x-1/2 gap-1">
        {validImages.map((_, i) => (
          <button
            key={`dot-${validImages[i].url}`}
            type="button"
            aria-label={`Go to image ${i + 1}`}
            onClick={(e) => {
              e.stopPropagation();
              emblaApi?.scrollTo(i);
            }}
            className={`h-1.5 rounded-full transition-all ${
              i === selectedIndex
                ? "w-4 bg-white"
                : "w-1.5 bg-white/50 hover:bg-white/80"
            }`}
          />
        ))}
      </div>
    </div>
  );
}
