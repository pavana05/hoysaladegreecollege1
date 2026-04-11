import { Outlet } from "react-router-dom";
import Navbar from "./Navbar";
import Footer from "./Footer";
import ChatBot from "./ChatBot";
import EnquireNowCTA from "./EnquireNowCTA";
import PageLoader from "./PageLoader";
import PageTransition from "./PageTransition";
import PopupBanner from "./PopupBanner";
import ScrollToTop from "./ScrollToTop";
import PullToRefresh from "./PullToRefresh";

export default function Layout() {
  return (
    <PullToRefresh>
      <div className="min-h-screen flex flex-col">
        <ScrollToTop />
        <PageLoader />
        <PopupBanner />
        <Navbar />
        <main className="flex-1">
          <PageTransition>
            <Outlet />
          </PageTransition>
        </main>
        <Footer />
        <ChatBot />
        <EnquireNowCTA />
      </div>
    </PullToRefresh>
  );
}

