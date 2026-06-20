import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence, useAnimation, animate } from "framer-motion";
import clsx from "clsx";

/* ── Arrow Button ─────────────────────────────────────────────── */

const CARET = {
  left:  "M18 10L13 15L18 20",
  right: "M12 10L17 15L12 20",
  up:    "M10 18L15 13L20 18",
  down:  "M10 13L15 17L20 13",
};

function ArrowButton({ direction, onClick, visible }) {
  return (
    <button
      onClick={onClick}
      className={clsx(
        "size-[30px] flex items-center justify-center cursor-pointer select-none shrink-0 group focus:outline-none",
        "transition-all",
        visible
          ? "opacity-100 duration-500 pointer-events-auto"
          : "opacity-0 duration-0 pointer-events-none"
      )}
      style={{ WebkitTapHighlightColor: "transparent" }}
      tabIndex={visible ? 0 : -1}
    >
      <div
        className={clsx(
          "size-[25px] rounded-full flex items-center justify-center transition-all",
          "bg-[#d4d4d4] text-[#999] group-hover:bg-black group-hover:text-white group-active:bg-black group-active:text-white"
        )}
      >
        <svg width="15" height="15" viewBox="0 0 30 30" fill="none">
          <path
            d={CARET[direction]}
            stroke="currentColor"
            strokeWidth="3.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </div>
    </button>
  );
}

/* ── Slide variants for arrow-click transitions ───────────────── */

const slideVariants = {
  enter: (ctx) => ({
    [ctx.axis]: ctx.dir * 45,
    opacity: 0,
  }),
  center: {
    x: 0,
    y: 0,
    opacity: 1,
  },
  exit: (ctx) => ({
    [ctx.axis]: ctx.dir * -45,
    opacity: 0,
  }),
};

/* ── Slot Reel ────────────────────────────────────────────────── */

const REEL_COUNT = 20;

export default function SlotReel({
  items,
  currentIndex,
  onChangeIndex,
  isSpinning,
  targetIndex,
  delay = 0,
  showArrows,
  isMobile,
  slotIndex,
}) {
  const containerRef = useRef(null);
  const controls = useAnimation();
  const mountedRef = useRef(true);

  const [spinning, setSpinning] = useState(false);
  const [reelItems, setReelItems] = useState([]);
  const [blurAmount, setBlurAmount] = useState(0);
  const [slideDir, setSlideDir] = useState(1); // 1 = next, -1 = prev

  // Stable ref to currentIndex for async callbacks
  const currentIndexRef = useRef(currentIndex);
  currentIndexRef.current = currentIndex;

  // Track unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  /* ── Spin animation ──────────────────────────────────────── */

  useEffect(() => {
    if (!isSpinning || targetIndex === null) return;

    // Build reel sequence
    const seq = [];
    if (isMobile) {
      seq.push(items[currentIndexRef.current]);
      for (let i = 0; i < REEL_COUNT - 2; i++) {
        seq.push(items[Math.floor(Math.random() * (items.length - 1)) + 1]);
      }
      seq.push(items[targetIndex]);
    } else {
      // For desktop, to spin downwards:
      // Start with targetIndex at top, and end with current index at bottom
      seq.push(items[targetIndex]);
      for (let i = 0; i < REEL_COUNT - 2; i++) {
        seq.push(items[Math.floor(Math.random() * (items.length - 1)) + 1]);
      }
      seq.push(items[currentIndexRef.current]);
    }

    setReelItems(seq);
    setSpinning(true);

    // Delay start so React has time to render the reel items
    const timer = setTimeout(() => {
      if (!mountedRef.current) return;

      const el = containerRef.current;
      if (!el) return;
      const size = isMobile ? el.offsetWidth : el.offsetHeight;
      const totalDist = -(REEL_COUNT - 1) * size;

      // Reset position
      if (isMobile) {
        controls.set({ x: 0 });
      } else {
        // Start translated down to show the current item at the bottom of the sequence
        controls.set({ y: totalDist });
      }

      // Blur animation (ramp → hold → fade)
      animate(0, 1, {
        keyframes: [0, 6, 6, 0],
        times: [0, 0.2, 0.7, 1],
        duration: 3,
        delay,
        ease: "easeInOut",
        onUpdate: (v) => {
          if (mountedRef.current) setBlurAmount(v);
        },
      });

      // Position animation
      if (isMobile) {
        controls
          .start({
            x: totalDist,
            transition: {
              duration: 3,
              delay,
              ease: [0.32, 0.05, 0.12, 1],
            },
          })
          .then(() => {
            if (!mountedRef.current) return;
            setSpinning(false);
            setBlurAmount(0);
            setReelItems([]);
            controls.set({ x: 0, y: 0 });
            onChangeIndex(targetIndex);
          });
      } else {
        // Animate up to 0 to shift the track downwards (showing targetIndex at the top)
        controls
          .start({
            y: 0,
            transition: {
              duration: 3,
              delay,
              ease: [0.32, 0.05, 0.12, 1],
            },
          })
          .then(() => {
            if (!mountedRef.current) return;
            setSpinning(false);
            setBlurAmount(0);
            setReelItems([]);
            controls.set({ x: 0, y: 0 });
            onChangeIndex(targetIndex);
          });
      }
    }, 60);

    // Cleanup resets everything (handles StrictMode double-invoke)
    return () => {
      clearTimeout(timer);
      controls.stop();
      setSpinning(false);
      setReelItems([]);
      setBlurAmount(0);
    };
  }, [isSpinning, targetIndex]);

  /* ── Manual stepping with direction tracking ─────────────── */

  const handlePrev = useCallback(() => {
    if (spinning) return;
    setSlideDir(-1);
    onChangeIndex((currentIndex - 1 + items.length) % items.length);
  }, [spinning, currentIndex, items.length, onChangeIndex]);

  const handleNext = useCallback(() => {
    if (spinning) return;
    setSlideDir(1);
    onChangeIndex((currentIndex + 1) % items.length);
  }, [spinning, currentIndex, items.length, onChangeIndex]);

  /* ── Touch gesture swipe handling for mobile ─────────────── */
  const touchStartX = useRef(null);
  const touchStartY = useRef(null);

  const handleTouchStart = useCallback((e) => {
    if (!isMobile || spinning) return;
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }, [isMobile, spinning]);

  const handleTouchEnd = useCallback((e) => {
    if (!isMobile || spinning || touchStartX.current === null || touchStartY.current === null) return;
    const touchEndX = e.changedTouches[0].clientX;
    const touchEndY = e.changedTouches[0].clientY;
    const diffX = touchStartX.current - touchEndX;
    const diffY = Math.abs(touchStartY.current - touchEndY);
    const threshold = 40; // px minimum swipe distance

    // Check if swipe is horizontal and meets threshold
    if (Math.abs(diffX) > threshold && Math.abs(diffX) > diffY) {
      if (diffX > 0) {
        handleNext();
      } else {
        handlePrev();
      }
    }
    touchStartX.current = null;
    touchStartY.current = null;
  }, [isMobile, spinning, handleNext, handlePrev]);

  /* ── Render ──────────────────────────────────────────────── */

  const blurStyle =
    blurAmount > 0.3
      ? { filter: `blur(${blurAmount}px)`, willChange: "transform, filter" }
      : { willChange: "transform" };

  // Context passed to slide variants for directional animation
  const slideCtx = { axis: isMobile ? "x" : "y", dir: slideDir };

  return (
    <div
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      className={clsx(
        "bg-white relative overflow-hidden rounded-[40px] select-none",
        isMobile
          ? "h-[130px] w-full"
          : "h-[250px] lg:h-[200px] flex-1 max-w-[400px] min-w-[180px]"
      )}
    >
      {/* ── White gradient fade overlays ── */}
      {isMobile ? (
        <>
          <div className="absolute top-0 left-0 bottom-0 w-[35px] z-[5] pointer-events-none bg-linear-to-r from-white to-transparent" />
          <div className="absolute top-0 right-0 bottom-0 w-[35px] z-[5] pointer-events-none bg-linear-to-l from-white to-transparent" />
        </>
      ) : (
        <>
          <div className="absolute top-0 left-0 right-0 h-[55px] lg:h-[45px] z-[5] pointer-events-none bg-linear-to-b from-white to-transparent" />
          <div className="absolute bottom-0 left-0 right-0 h-[55px] lg:h-[45px] z-[5] pointer-events-none bg-linear-to-t from-white to-transparent" />
        </>
      )}

      {/* ── Arrows (absolutely positioned, z-10) ── */}
      {isMobile ? (
        <>
          <div className="absolute left-[20px] top-1/2 -translate-y-1/2 z-10">
            <ArrowButton direction="left" onClick={handlePrev} visible={showArrows} />
          </div>
          <div className="absolute right-[20px] top-1/2 -translate-y-1/2 z-10">
            <ArrowButton direction="right" onClick={handleNext} visible={showArrows} />
          </div>
        </>
      ) : (
        <>
          <div className="absolute top-[12px] left-1/2 -translate-x-1/2 z-10">
            <ArrowButton direction="up" onClick={handlePrev} visible={showArrows} />
          </div>
          <div className="absolute bottom-[12px] left-1/2 -translate-x-1/2 z-10">
            <ArrowButton direction="down" onClick={handleNext} visible={showArrows} />
          </div>
        </>
      )}

      {/* ── Viewport ── */}
      <div
        ref={containerRef}
        className="w-full h-full overflow-hidden relative"
      >
        {/* IDLE — AnimatePresence for arrow-click slide transitions */}
        {!spinning && (
          <div className="absolute inset-0 flex items-center justify-center px-[60px] md:px-[20px]">
            <AnimatePresence mode="popLayout" initial={false} custom={slideCtx}>
              <motion.p
                key={currentIndex}
                custom={slideCtx}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.2, ease: "easeInOut" }}
                className="font-bogle text-black text-center text-[28px] sm:text-[32px] md:text-[35px] leading-tight [word-break:break-word] uppercase"
              >
                {items[currentIndex]}
              </motion.p>
            </AnimatePresence>
          </div>
        )}

        {/* SPINNING — scrolling reel strip */}
        {spinning && (
          <motion.div
            animate={controls}
            style={{
              ...blurStyle,
              position: "absolute",
              top: 0,
              left: 0,
              height: isMobile ? "100%" : "auto",
              display: "flex",
              flexDirection: isMobile ? "row" : "column",
            }}
          >
            {reelItems.map((item, idx) => (
              <div
                key={idx}
                style={{
                  width: isMobile
                    ? containerRef.current?.offsetWidth ?? 300
                    : "100%",
                  height: isMobile
                    ? "100%"
                    : containerRef.current?.offsetHeight ?? 250,
                  flexShrink: 0,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                <p className="font-bogle text-black text-center text-[28px] sm:text-[32px] md:text-[35px] leading-tight [word-break:break-word] uppercase px-[20px]">
                  {item}
                </p>
              </div>
            ))}
          </motion.div>
        )}
      </div>
    </div>
  );
}
