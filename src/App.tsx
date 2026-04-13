import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useEffect } from "react";
import Index from "./pages/home/HomePage";
import Login from "./pages/auth/LoginPage";
import Signup from "./pages/auth/SignupPage";
import ConfigureGame from "./pages/configure/ConfigureGamePage";
import About from "./pages/about/AboutPage";
import Account from "./pages/account/AccountPage";
import AccountUsername from "./pages/account/AccountUsernamePage";
import AccountEmail from "./pages/account/AccountEmailPage";
import AccountPassword from "./pages/account/AccountPasswordPage";
import Puzzles from "./pages/puzzles/PuzzlesPage";
import Drills from "./pages/drills/DrillsPage";
import Openings from "./pages/openings/OpeningsPage";
import NotFound from "./pages/not-found/NotFoundPage";
import { trackPageView } from "@/lib/firebaseAnalytics";

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

const FirebaseAnalyticsTracker = () => {
  const location = useLocation();

  useEffect(() => {
    const pagePath = `${location.pathname}${location.search}${location.hash}`;
    const frame = window.requestAnimationFrame(() => {
      void trackPageView(pagePath, document.title);
    });

    return () => window.cancelAnimationFrame(frame);
  }, [location.hash, location.pathname, location.search]);

  return null;
};

const App = () => {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter basename={basename}>
          <FirebaseAnalyticsTracker />
          <Routes>
            <Route path="/" element={<Index />} />
            <Route path="/game/:sessionId" element={<Index />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
            <Route path="/configure" element={<ConfigureGame />} />
            <Route path="/account" element={<Account />} />
            <Route path="/account/username" element={<AccountUsername />} />
            <Route path="/account/email" element={<AccountEmail />} />
            <Route path="/account/password" element={<AccountPassword />} />
            <Route path="/puzzles" element={<Puzzles />} />
            <Route path="/puzzles/:sessionId" element={<Puzzles />} />
            <Route path="/drills" element={<Drills />} />
            <Route path="/drills/:sessionId" element={<Drills />} />
            <Route path="/openings" element={<Openings />} />
            <Route path="/openings/:sessionId" element={<Openings />} />
            <Route path="/games" element={<About />} />
            <Route path="/about" element={<About />} />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </QueryClientProvider>
  );
};

export default App;
