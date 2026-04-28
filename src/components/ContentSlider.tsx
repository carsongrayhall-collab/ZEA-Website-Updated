"use client";

import { AnimatePresence, motion, PanInfo } from "framer-motion";
import { useEffect, useState } from "react";
import { OrnamentalBar } from "@/components/OrnamentalBar";

export interface Slide {
  id: string;
  title?: string;
  body?: string;
  bullets?: string[];
}

export function ContentSlider({
  slides,
  minHeight = 220,
  showProgress = true,
  compact = false,
  underlineTitle = true,
  titleAlign = "left"
}: {
  slides: Slide[];
  minHeight?: number;
  showProgress?: boolean;
  compact?: boolean;
  underlineTitle?: boolean;
  titleAlign?: "left" | "center" | "right";
}) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(1);

  const goTo = (next: number) => {
    setDirection(next > index ? 1 : -1);
    setIndex((next + slides.length) % slides.length);
  };

  const onDragEnd = (_: MouseEvent | TouchEvent | PointerEvent, info: PanInfo) => {
    if (Math.abs(info.offset.x) < 40) return;
    goTo(index + (info.offset.x < 0 ? 1 : -1));
  };

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if (event.key === "ArrowLeft") goTo(index - 1);
      if (event.key === "ArrowRight") goTo(index + 1);
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [index, slides.length]);

  const current = slides[index];
  const titleAlignmentClass =
    titleAlign === "right" ? "ml-auto text-right" : titleAlign === "center" ? "mx-auto text-center" : "";

  return (
    <div className="space-y-5">
      <div
        className="relative overflow-hidden"
        style={{ minHeight }}
        role="region"
        aria-roledescription="carousel"
        aria-label={current.title ?? "Content slider"}
        tabIndex={0}
      >
        <AnimatePresence custom={direction} mode="wait">
          <motion.article
            key={current.id}
            custom={direction}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.06}
            onDragEnd={onDragEnd}
            initial={{ opacity: 0, x: direction * 26 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction * -26 }}
            transition={{ duration: 0.3, ease: "easeOut" }}
            className="absolute inset-0 z-0"
          >
            <div className="space-y-4 pr-2">
              {current.title ? (
                <h3
                  className={[
                    "font-serif text-burgundy",
                    titleAlignmentClass,
                    underlineTitle ? "inline-block border-b border-[rgba(110,31,27,0.45)] pb-1" : "",
                    compact ? "text-[1.55rem]" : "text-[2rem]"
                  ].join(" ")}
                >
                  {current.title}
                </h3>
              ) : null}
              {current.body ? (
                <p className="max-w-[34ch] text-[0.96rem] leading-7 text-text">{current.body}</p>
              ) : null}
              {current.bullets ? (
                <ul className="space-y-3 text-[0.95rem] leading-7 text-text">
                  {current.bullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              ) : null}
            </div>
          </motion.article>
        </AnimatePresence>
      </div>

      <div className="relative z-20 flex items-center justify-between gap-6 px-1 text-burgundy">
        <button
          type="button"
          aria-label="Previous slide"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-[rgba(110,31,27,0.24)] text-lg transition hover:bg-[rgba(110,31,27,0.06)]"
          onClick={() => goTo(index - 1)}
        >
          {"\u2190"}
        </button>
        <button
          type="button"
          aria-label="Next slide"
          className="flex h-11 w-11 items-center justify-center rounded-full border border-[rgba(110,31,27,0.24)] text-lg transition hover:bg-[rgba(110,31,27,0.06)]"
          onClick={() => goTo(index + 1)}
        >
          {"\u2192"}
        </button>
      </div>

      {showProgress ? <OrnamentalBar index={index} total={slides.length} className="w-36" /> : null}
    </div>
  );
}
