import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Home from "./pages/Home";
import PortfolioEditor from "./pages/PortfolioEditor";
import ReferralPage from "./pages/ReferralPage";
import JoinPage from "./pages/JoinPage";
import PublicPortfolio from "./pages/PublicPortfolio";
import AdminPage from "@/pages/AdminPage";
import InboxPage from "@/pages/InboxPage";

function Router() {
  return <Switch>
    <Route path="/" component={Home} />
    <Route path="/editor" component={PortfolioEditor} />
    <Route path="/inbox" component={InboxPage} />
    <Route path="/refer" component={ReferralPage} />
    <Route path="/join/:code" component={JoinPage} />
    <Route path="/p/:slug" component={PublicPortfolio} />
    <Route path="/admin" component={AdminPage} />
    <Route path="/404" component={NotFound} />
    <Route component={NotFound} />
  </Switch>;
}

export default function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="light"><TooltipProvider><Toaster /><Router /></TooltipProvider></ThemeProvider></ErrorBoundary>;
}
