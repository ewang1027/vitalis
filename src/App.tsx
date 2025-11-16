import React, { useState, useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import Index from "./pages/Index";
import NotFound from "./pages/NotFound";
import WelcomeScreen from "./components/WelcomeScreen";

const queryClient = new QueryClient();

const WELCOME_SCREEN_KEY = "vitalis_welcome_shown";

const App = () => {
  const [showWelcome, setShowWelcome] = useState(true);

  useEffect(() => {
    // Check if welcome screen has already been shown this session
    const hasSeenWelcome = sessionStorage.getItem(WELCOME_SCREEN_KEY);
    if (hasSeenWelcome) {
      setShowWelcome(false);
    }
  }, []);

  const handleWelcomeComplete = () => {
    // Mark welcome screen as shown for this session
    sessionStorage.setItem(WELCOME_SCREEN_KEY, "true");
    setShowWelcome(false);
  };

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        {showWelcome && <WelcomeScreen onComplete={handleWelcomeComplete} />}
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Index />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
