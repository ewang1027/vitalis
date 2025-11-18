import { useState, useEffect } from "react";
import { useCurrentUser } from "@/hooks/useSupabaseData";
import { ArrowRight } from "lucide-react";

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

    return () => {
      clearTimeout(timer1);
    };
  }, []);

  const handleEnter = () => {
    // Start fade out animation
    setAnimationPhase("fading-out");

    // Complete after fade out
    setTimeout(() => {
      setAnimationPhase("complete");
      onComplete();
    }, 1000);
  };

  // Show loading state if user data is still being fetched
  const displayName = loading ? "..." : user?.name || "Guest";

  return (
    <div
      className={`fixed inset-0 z-[9999] flex items-center justify-center welcome-gradient transition-opacity duration-1000 ${
        animationPhase === "fading-out" || animationPhase === "complete"
          ? "opacity-0"
          : "opacity-100"
      }`}
    >
      <div
        className={`flex flex-col items-center transition-opacity duration-1000 ${
          animationPhase === "showing-text" ? "opacity-100" : "opacity-0"
        }`}
      >
        {/* Logo */}
        <img
          src="/vitalislogo/vitaliswhite.png"
          alt="Vitalis Logo"
          className="w-128 h-128 object-contain mb-4 -mt-16"
        />

        {/* Welcome Text - Overlapping with logo bottom */}
        <h1 className="text-6xl font-bold text-white tracking-wide -mt-16">
          Welcome, Nurse
        </h1>

        {/* Enter Button with Arrow */}
        <button
          onClick={handleEnter}
          className="mt-12 group flex items-center justify-center w-16 h-16 rounded-full bg-white/20 hover:bg-white/30 border border-white/40 transition-all hover:scale-110"
        >
          <ArrowRight className="w-8 h-8 text-white group-hover:translate-x-1 transition-transform" />
        </button>
      </div>
    </div>
  );
};

export default WelcomeScreen;
