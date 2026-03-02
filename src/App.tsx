import { useEffect } from "react";
import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import { initAnalytics } from "./lib/firebase";
import Index from "./pages/Index";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import NotFound from "./pages/NotFound";

const queryClient = new QueryClient();

/**
 * Vite injects BASE_URL from the `base` option.
 * We use it for BrowserRouter's basename, but when the base is "./"
 * (used for static/relative deployments like GitHub Pages) we want an
 * empty basename so routes resolve at the current path.
 */
const rawBase = import.meta.env.BASE_URL;
const basename =
  rawBase === "./" ? "" : rawBase.replace(/\/$/, "");

const App = () => {
  useEffect(() => {
    initAnalytics().catch((err) => {
      console.error("Firebase Analytics failed to initialize", err);
    });
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter basename={basename}>
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
