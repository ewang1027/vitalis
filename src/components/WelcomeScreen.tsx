import { useState, useEffect } from "react";
import { useCurrentUser } from "@/hooks/useSupabaseData";
import { Button } from "@/components/ui/button";

interface WelcomeScreenProps {
  onComplete: () => void;
}

const WelcomeScreen = ({ onComplete }: WelcomeScreenProps) => {
  const { user, loading } = useCurrentUser();
  const [password, setPassword] = useState("");
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

  const handleLogin = () => {
    // Start fade out animation
    setAnimationPhase("fading-out");

    // Complete after fade out
    setTimeout(() => {
      setAnimationPhase("complete");
      onComplete();
    }, 1000);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleLogin();
    }
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
          Welcome, {displayName}
        </h1>

        {/* Password Input */}
        <div className="flex flex-col items-center gap-3 mt-12">
          <input
            type="password"
            placeholder="Enter password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyPress={handleKeyPress}
            className="px-4 py-2 w-64 rounded-md bg-white/10 border border-white/30 text-white placeholder-white/60 focus:outline-none focus:ring-2 focus:ring-white/50 transition-all"
          />

          {/* Login Button */}
          <Button
            onClick={handleLogin}
            className="w-64 bg-white/20 hover:bg-white/30 text-white border border-white/40 transition-all"
          >
            Login
          </Button>
        </div>
      </div>
    </div>
  );
};

export default WelcomeScreen;
