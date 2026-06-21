import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import clsx from "clsx";
import SlotReel from "./components/SlotReel";
import {
  easySubjects,
  easyActions,
  easyLocation,
  hardSubjects,
  hardActions,
  hardLocation,
} from "./data/prompts";

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

  // Difficulty mode: "easy" or "hard"
  const [difficulty, setDifficulty] = useState("easy");

  // Slot indices — defaults set to 0 to show Who, What, Where on load
  const [indices, setIndices] = useState([0, 0, 0]);

  // Spinning orchestration
  const [isSpinning, setIsSpinning] = useState(false);
  const [slotTargets, setSlotTargets] = useState([null, null, null]);
  const [slotSpinnings, setSlotSpinnings] = useState([false, false, false]);
  const [showArrows, setShowArrows] = useState(true);
  const [ellipsis, setEllipsis] = useState("");

  // Shake to spin permission state
  const [shakeEnabled, setShakeEnabled] = useState(false);

  // Determine active lists based on difficulty
  const currentSubjects = difficulty === "easy" ? easySubjects : hardSubjects;
  const currentActions = difficulty === "easy" ? easyActions : hardActions;
  const currentLocations = difficulty === "easy" ? easyLocation : hardLocation;

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
    const t1 = Math.floor(Math.random() * (currentSubjects.length - 1)) + 1;
    const t2 = Math.floor(Math.random() * (currentActions.length - 1)) + 1;
    const t3 = Math.floor(Math.random() * (currentLocations.length - 1)) + 1;

    setSlotTargets([t1, t2, t3]);
    setSlotSpinnings([true, true, true]);

    // Full sequence = slot 3 delay (0.4s) + spin (3s) = 3.4s + buffer
    setTimeout(() => {
      setIsSpinning(false);
      setSlotSpinnings([false, false, false]);
      setSlotTargets([null, null, null]);
      setShowArrows(true); // smooth fade in
    }, 3800);
  }, [isSpinning, currentSubjects, currentActions, currentLocations]);

  // Auto-enable shake on mount if supported and doesn't require explicit iOS permission dialogs
  useEffect(() => {
    if (
      typeof DeviceMotionEvent !== "undefined" &&
      typeof DeviceMotionEvent.requestPermission !== "function"
    ) {
      setShakeEnabled(true);
    }
  }, []);

  // Listen for device shake
  useEffect(() => {
    if (!shakeEnabled || isSpinning) return;

    const SHAKE_THRESHOLD = 15;
    const SHAKE_COOLDOWN = 4500; // cooldown longer than spin sequence to prevent double triggers
    let lastShake = 0;
    let lastX = null, lastY = null, lastZ = null;

    const handleMotion = (event) => {
      const acc = event.acceleration;
      if (acc && acc.x !== null && acc.y !== null && acc.z !== null) {
        const total = Math.sqrt(acc.x ** 2 + acc.y ** 2 + acc.z ** 2);
        if (total > SHAKE_THRESHOLD) {
          const now = Date.now();
          if (now - lastShake > SHAKE_COOLDOWN) {
            lastShake = now;
            // Trigger haptic feedback if supported on shake
            if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
              navigator.vibrate(160);
            }
            handleSpin();
          }
        }
      } else {
        const accG = event.accelerationIncludingGravity;
        if (accG && accG.x !== null && accG.y !== null && accG.z !== null) {
          if (lastX !== null && lastY !== null && lastZ !== null) {
            const dx = accG.x - lastX;
            const dy = accG.y - lastY;
            const dz = accG.z - lastZ;
            const total = Math.sqrt(dx ** 2 + dy ** 2 + dz ** 2);
            if (total > SHAKE_THRESHOLD) {
              const now = Date.now();
              if (now - lastShake > SHAKE_COOLDOWN) {
                lastShake = now;
                // Trigger haptic feedback if supported on shake
                if (typeof navigator !== "undefined" && typeof navigator.vibrate === "function") {
                  navigator.vibrate(160);
                }
                handleSpin();
              }
            }
          }
          lastX = accG.x;
          lastY = accG.y;
          lastZ = accG.z;
        }
      }
    };

    window.addEventListener("devicemotion", handleMotion);
    return () => window.removeEventListener("devicemotion", handleMotion);
  }, [shakeEnabled, isSpinning, handleSpin]);

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

  // Difficulty toggle handler
  const handleDifficultyChange = useCallback((mode) => {
    if (isSpinning) return;
    setDifficulty(mode);
    setIndices([0, 0, 0]); // reset reels to placeholders on mode change
  }, [isSpinning]);

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

        {/* Title & Toggle wrapper to group top elements */}
        <div className="flex flex-col items-center gap-[20px] md:gap-[40px]">
          {/* Title */}
          <h1 className="text-white text-center font-bogle select-none text-[80px] sm:text-[80px] md:text-[100px] leading-none">
            DRAW IT!
          </h1>

          {/* Mode Toggle */}
          <div 
            onClick={() => handleDifficultyChange(difficulty === "easy" ? "hard" : "easy")}
            className={clsx(
              "bg-[#141414] h-[40px] w-[190px] rounded-[20px] relative flex items-center p-[4px] cursor-pointer select-none shrink-0",
              isSpinning && "opacity-60 cursor-not-allowed"
            )}
            style={{ WebkitTapHighlightColor: "transparent" }}
          >
            {/* Active Pill slider */}
            <motion.div 
              className="absolute bg-white h-[32px] rounded-[16px] w-[91px] left-[4px]"
              animate={{ x: difficulty === "easy" ? 0 : 91 }}
              transition={{ type: "spring", stiffness: 380, damping: 30 }}
            />
            
            {/* EASY button */}
            <button
              onClick={(e) => { e.stopPropagation(); handleDifficultyChange("easy"); }}
              disabled={isSpinning}
              className={clsx(
                "absolute left-[4px] top-[4px] h-[32px] w-[91px] flex items-center justify-center font-bayon text-[17px] tracking-wide uppercase select-none transition-colors duration-200 cursor-pointer focus:outline-none",
                difficulty === "easy" ? "text-[#141414]" : "text-[#a6a6a6]"
              )}
              style={{ WebkitTapHighlightColor: "transparent" }}
            >
              EASY
            </button>
            
            {/* HARD button */}
            <button
              onClick={(e) => { e.stopPropagation(); handleDifficultyChange("hard"); }}
              disabled={isSpinning}
              className={clsx(
                "absolute left-[95px] top-[4px] h-[32px] w-[91px] flex items-center justify-center font-bayon text-[17px] tracking-wide uppercase select-none transition-colors duration-200 cursor-pointer focus:outline-none",
                difficulty === "hard" ? "text-[#141414]" : "text-[#a6a6a6]"
              )}
              style={{ WebkitTapHighlightColor: "transparent" }}
            >
              HARD
            </button>
          </div>
        </div>

        {/* Slots */}
        <div className="flex flex-col md:flex-row gap-[10px] items-center justify-center w-full max-w-[1220px]">
          <SlotReel
            slotIndex={0}
            items={currentSubjects}
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
            items={currentActions}
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
            items={currentLocations}
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
            "w-full h-[80px] md:max-w-[350px] rounded-[40px] font-bayon text-[30px] tracking-wide text-white uppercase select-none shrink-0",
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
