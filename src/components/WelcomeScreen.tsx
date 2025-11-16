import { useState, useEffect } from "react";
import { useCurrentUser } from "@/hooks/useSupabaseData";

interface WelcomeScreenProps {
  onComplete: () => void;
}

const WelcomeScreen = ({ onComplete }: WelcomeScreenProps) => {
  const { user, loading } = useCurrentUser();
  const [animationPhase, setAnimationPhase] = useState<
    "initial" | "showing-text" | "fading-out" | "complete"
  >("initial");

  useEffect(() => {
    // Phase 1: Initial gradient display (0-1s)
    const timer1 = setTimeout(() => {
      setAnimationPhase("showing-text");
    }, 1000);

    // Phase 2: Text visible (1-2.5s)
    const timer2 = setTimeout(() => {
      setAnimationPhase("fading-out");
    }, 2500);

    // Phase 3: Fade out (2.5-4s)
    const timer3 = setTimeout(() => {
      setAnimationPhase("complete");
      onComplete();
    }, 4000);

    return () => {
      clearTimeout(timer1);
      clearTimeout(timer2);
      clearTimeout(timer3);
    };
  }, [onComplete]);

  // Show loading state if user data is still being fetched
  const displayName = loading ? "..." : user?.name || "Guest";

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center welcome-gradient transition-opacity duration-1000 ${
        animationPhase === "fading-out" || animationPhase === "complete"
          ? "opacity-0"
          : "opacity-100"
      }`}
    >
      <div
        className={`text-center transition-opacity duration-1000 ${
          animationPhase === "showing-text" ? "opacity-100" : "opacity-0"
        }`}
      >
        <h1 className="text-6xl font-bold text-white tracking-wide">
          Welcome, {displayName}
        </h1>
      </div>
    </div>
  );
};

export default WelcomeScreen;
