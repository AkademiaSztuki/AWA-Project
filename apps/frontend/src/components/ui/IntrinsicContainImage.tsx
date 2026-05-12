"use client";

import React from "react";

export type IntrinsicContainImageProps = {
  src: string;
  alt: string;
  /** Classes merged onto the underlying `<img>`. */
  className?: string;
  /**
   * Tailwind max-height cap while preserving natural aspect ratio (full image visible).
   * @default max-h-[min(72vh,960px)]
   */
  maxHeightClassName?: string;
};

/**
 * Shows a raster result at its intrinsic aspect ratio within max bounds (letterboxing via empty space).
 * Prefer over a fixed aspect-ratio box + `next/image` `fill` + `object-cover`, which crops ultrawide results.
 */
export function IntrinsicContainImage({
  src,
  alt,
  className = "",
  maxHeightClassName = "max-h-[min(72vh,960px)]",
}: IntrinsicContainImageProps) {
  return (
    // eslint-disable-next-line @next/next/no-img-element -- dynamic aspect ratios / data URLs; layout from natural dimensions
    <img
      src={src}
      alt={alt}
      decoding="async"
      className={`mx-auto block h-auto w-auto max-w-full object-contain object-center ${maxHeightClassName} ${className}`.trim()}
    />
  );
}
