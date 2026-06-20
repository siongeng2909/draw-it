import { useState, useEffect, useCallback } from "react";
import clsx from "clsx";
import SlotReel from "./components/SlotReel";
import { subjects, actions, styles } from "./data/prompts";

/* ── Responsive hook ──────────────────────────────────────────── */

function useIsMobile() {
  const [isMobile, setIsMobile] = useState(
    typeof window !== "undefined" ? window.innerWidth < 768 : false
  );
  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);
  return isMobile;
}

/* ── App ──────────────────────────────────────────────────────── */

export default function App() {
  const isMobile = useIsMobile();

  // Slot indices — defaults set to 0 to show Who, What, Where on load
  const [indices, setIndices] = useState([0, 0, 0]);

  // Spinning orchestration
  const [isSpinning, setIsSpinning] = useState(false);
  const [slotTargets, setSlotTargets] = useState([null, null, null]);
  const [slotSpinnings, setSlotSpinnings] = useState([false, false, false]);
  const [showArrows, setShowArrows] = useState(true);
  const [ellipsis, setEllipsis] = useState("");

  // Animated ellipsis during spin
  useEffect(() => {
    if (!isSpinning) { setEllipsis(""); return; }
    const id = setInterval(() => {
      setEllipsis((p) => (p.length >= 3 ? "." : p + "."));
    }, 400);
    return () => clearInterval(id);
  }, [isSpinning]);

  // SPIN handler
  const handleSpin = useCallback(() => {
    if (isSpinning) return;

    setIsSpinning(true);
    setShowArrows(false); // instant hide

    // Generate random target index, excluding index 0 (the placeholder)
    const t1 = Math.floor(Math.random() * (subjects.length - 1)) + 1;
    const t2 = Math.floor(Math.random() * (actions.length - 1)) + 1;
    const t3 = Math.floor(Math.random() * (styles.length - 1)) + 1;

    setSlotTargets([t1, t2, t3]);
    setSlotSpinnings([true, true, true]);

    // Full sequence = slot 3 delay (0.4s) + spin (3s) = 3.4s + buffer
    setTimeout(() => {
      setIsSpinning(false);
      setSlotSpinnings([false, false, false]);
      setSlotTargets([null, null, null]);
      setShowArrows(true); // smooth fade in
    }, 3800);
  }, [isSpinning]);

  // Listen for Space bar key press
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === " " || e.code === "Space") {
        // Prevent browser scrolling and trigger spin
        e.preventDefault();
        handleSpin();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [handleSpin]);

  // Manual index change from arrow buttons
  const handleIndexChange = useCallback((slotIdx, newIndex) => {
    setIndices((prev) => {
      const next = [...prev];
      next[slotIdx] = newIndex;
      return next;
    });
  }, []);

  return (
    <div className="min-h-dvh w-full relative overflow-hidden select-none">
      {/* ── Background with Figma noise texture ── */}
      <svg
        className="absolute inset-0 w-full h-full pointer-events-none"
        preserveAspectRatio="none"
        style={{ zIndex: 0 }}
      >
        <rect width="100%" height="100%" fill="#56ce7a" filter="url(#noise-filter)" />
      </svg>

      {/* ── Content layer ── */}
      <div className="relative z-10 min-h-dvh w-full flex flex-col items-center justify-center py-0 px-[20px] sm:px-[40px] md:px-[40px] gap-[40px] md:gap-[100px]">

        {/* Title */}
        <h1 className="text-white text-center font-bogle select-none text-[65px] sm:text-[80px] md:text-[100px] leading-none">
          DRAW IT!
        </h1>

        {/* Slots */}
        <div className="flex flex-col md:flex-row gap-[10px] items-center justify-center w-full max-w-[1220px]">
          <SlotReel
            slotIndex={0}
            items={subjects}
            currentIndex={indices[0]}
            onChangeIndex={(v) => handleIndexChange(0, v)}
            isSpinning={slotSpinnings[0]}
            targetIndex={slotTargets[0]}
            delay={0}
            showArrows={showArrows}
            isMobile={isMobile}
          />
          <SlotReel
            slotIndex={1}
            items={actions}
            currentIndex={indices[1]}
            onChangeIndex={(v) => handleIndexChange(1, v)}
            isSpinning={slotSpinnings[1]}
            targetIndex={slotTargets[1]}
            delay={0.2}
            showArrows={showArrows}
            isMobile={isMobile}
          />
          <SlotReel
            slotIndex={2}
            items={styles}
            currentIndex={indices[2]}
            onChangeIndex={(v) => handleIndexChange(2, v)}
            isSpinning={slotSpinnings[2]}
            targetIndex={slotTargets[2]}
            delay={0.4}
            showArrows={showArrows}
            isMobile={isMobile}
          />
        </div>

        {/* SPIN Button */}
        <button
          disabled={isSpinning}
          onClick={handleSpin}
          className={clsx(
            "w-full h-[80px] md:max-w-[350px] rounded-[40px] font-bayon text-[30px] tracking-wide text-white uppercase select-none",
            "flex items-center justify-center transition-colors duration-200",
            isSpinning
              ? "bg-[#30b257] cursor-not-allowed"
              : "bg-[#1b1b1b] hover:bg-black active:bg-black cursor-pointer"
          )}
          style={{ WebkitTapHighlightColor: "transparent" }}
        >
          {isSpinning ? `SPINNING ${ellipsis}` : "SPIN!"}
        </button>
      </div>
    </div>
  );
}
