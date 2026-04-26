import React, { useEffect , useLayoutEffect} from 'react';
import './App.css';
import { BrowserRouter as Router, Routes, Route, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion'; 
import Banner from './components/Banner/Banner';
import FeaturedTreks from './components/FeaturedTreks';
import CommunitySection from './components/CommunitySection';
import HowItWorks from './components/HowItWorks';
import MountainHero from './components/MountainHero';
import Footer from './components/Footer';
import Explore from './components/Explore';
import Community from './components/Community';
import Blog from './components/Blog';
import CreateBlog from './components/CreateBlog';
import BlogDetail from './components/BlogDetail';
import { RewardsHero, RewardsSection } from './components/Rewards';
import About from './components/about/About';
import Profile from './components/Profile';
import Login from './components/Login';
import Signup from './components/Signup';
import OrganizerSignup from './components/OrganizerSignup';
import ChatRoom from './components/ChatRoom.improved';
import TrekDetails from './components/TreksDetails';
import TrekAdmin from './components/TrekAdmin';
import SimpleAdmin from './components/SimpleAdmin';
import CommunityAdmin from './components/CommunityAdmin';
import TrekCategoryAdmin from './components/TrekCategoryAdmin';
import BottomNavbar from './components/BottomNavbar';
import { checkMessageCleanupDue } from './utils/messageCleanup';
import TermsPage from './pages/TermsPage';
import PrivacyPolicyPage from './pages/PrivacyPolicyPage';
import CookiesPolicyPage from './pages/CookiesPolicyPage';
import AccessibilityPage from './pages/AccessibilityPage';
import { SearchProvider } from './context/SearchContext';
import SearchResultsPage from './pages/SearchResultsPage';
import PaymentTester from './components/PaymentTester';
import MockPaymentTester from './components/MockPaymentTester';
import RazorpayDebugger from './components/RazorpayDebugger';
import UserAdmin from './components/UserAdmin';
import CouponAdmin from './components/CouponAdmin';
import OrganizerTreks from './components/OrganizerTreks';
import AccessControl from './components/AccessControl';
import OrganizerDashboard from './components/OrganizerDashboard';
import OrganizerTrekLogin from './components/OrganizerTrekLogin';
import OrganizerAddTrek from './components/OrganizerAddTrek';
import OrganizerEditTrek from './components/OrganizerEditTrek';
import OrganizerProfile from './components/OrganizerProfile';
import EditProfile from './components/EditProfile';
import BookingConfirmation from './components/BookingConfirmation';
import OrganizerBookings from './components/OrganizerBookings'; 
import OrganizerSettings from './components/OrganizerSettings';
import VerifyCertificate from './Interns/VerifyCertificate';
import CertificateAdmin from './Interns/CertificateAdmin';
import InternshipJoin from './intern_join'; 
import Support from "./pages/SupportPage";
import BookingPage from './components/BookingPage';

// ─────────────────────────────────────────────
// PAGE TRANSITION
// ─────────────────────────────────────────────
const PageTransition = ({ children }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      style={{ width: '100%' }}
    >
      {children}
    </motion.div>
  );
};

// ─────────────────────────────────────────────
// ROUTES WHERE BOTTOM NAV SHOULD BE HIDDEN
// ─────────────────────────────────────────────
const HIDDEN_NAV_ROUTES = [
  '/trek',
  '/booking/',
  '/booking-confirmation/',
];

// ─────────────────────────────────────────────
// BOTTOM NAV WITH ROUTE AWARENESS
// ─────────────────────────────────────────────
const ConditionalBottomNav = () => {
  const location = useLocation();

  const shouldHide = HIDDEN_NAV_ROUTES.some(route =>
    location.pathname.startsWith(route)
  );

  if (shouldHide) return null;

  return <BottomNavbar />;
};
// ─────────────────────────────────────────────
// ★ SCROLL TO TOP ON EVERY ROUTE CHANGE + INITIAL LOAD
// ─────────────────────────────────────────────
const ScrollToTop = () => {
  const { pathname } = useLocation();

  // ★ Handle initial page load (before paint)
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
  }, []);

  // ★ Handle every route change
};

// ─────────────────────────────────────────────
// APP
// ─────────────────────────────────────────────
function App() {
  useEffect(() => {
    const performCleanup = async () => {
      try {
        console.log("Performing scheduled message cleanup...");
        const results = await checkMessageCleanupDue();
        console.log("Message cleanup results:", results);
      } catch (error) {
        console.error("Error during message cleanup:", error);
      }
    };
    
    performCleanup();
    
    const cleanupInterval = setInterval(performCleanup, 60 * 60 * 1000);
    return () => clearInterval(cleanupInterval);
  }, []);

  return (
    <Router>
      <SearchProvider>
        <div className="App">
          {/* ✅ ConditionalBottomNav hides on booking pages */}
          <ConditionalBottomNav />
          <ScrollToTop />
          <div className="main-content">
            <Routes>
              <Route path="/" element={
                <PageTransition>
                  <>
                    <Banner />
                    <FeaturedTreks />
                    <CommunitySection />
                    <HowItWorks />
                    <MountainHero />
                    <Footer />
                  </>
                </PageTransition>
              } />
              <Route path="/explore" element={
                <PageTransition>
                  <Explore />
                </PageTransition>
              } />
              <Route path="/community" element={
                <PageTransition>
                  <Community />
                </PageTransition>
              } />
              <Route path="/chat/:roomId" element={
                <PageTransition>
                  <ChatRoom />
                </PageTransition>
              } />
              <Route path="/blog" element={
                <PageTransition>
                  <Blog />
                </PageTransition>
              } />
              <Route path="/create-blog" element={
                <PageTransition>
                  <CreateBlog />
                </PageTransition>
              } />
              <Route path="/blogs/:id" element={
                <PageTransition>
                  <BlogDetail />
                </PageTransition>
              } />
              <Route path="/rewards" element={
                <PageTransition>
                  <>
                    <RewardsHero />
                    <RewardsSection />
                  </>
                </PageTransition>
              } />
              <Route path="/about" element={
                <PageTransition>
                  <About />
                </PageTransition>
              } />
              <Route path="/profile" element={
                <PageTransition>
                  <Profile />
                </PageTransition>
              } />
              <Route path="/edit-profile" element={
                <PageTransition>
                  <EditProfile />
                </PageTransition>
              } />
              <Route path="/login" element={
                <PageTransition>
                  <Login />
                </PageTransition>
              } />
              <Route path="/signup" element={
                <PageTransition>
                  <Signup />
                </PageTransition>
              } />
              <Route path="/organizer-signup" element={
                <PageTransition>
                  <OrganizerSignup />
                </PageTransition>
              } />
              <Route path="/trek/:id" element={
                <PageTransition>
                  <TrekDetails />
                </PageTransition>
              } />
              <Route path="/admin" element={
                <PageTransition>
                  <AccessControl requiredRole="admin">
                    <SimpleAdmin />
                  </AccessControl>
                </PageTransition>
              } />
              <Route path="/admin/treks" element={
                <PageTransition>
                  <AccessControl requiredRole="admin">
                    <TrekAdmin />
                  </AccessControl>
                </PageTransition>
              } />
              <Route path="/admin/communities" element={
                <PageTransition>
                  <AccessControl requiredRole="admin">
                    <CommunityAdmin />
                  </AccessControl>
                </PageTransition>
              } />
              <Route path="/admin/trek-categories" element={
                <PageTransition>
                  <AccessControl requiredRole="admin">
                    <TrekCategoryAdmin />
                  </AccessControl>
                </PageTransition>
              } />
              <Route path="/admin/coupons" element={
                <PageTransition>
                  <AccessControl requiredRole="admin">
                    <CouponAdmin />
                  </AccessControl>
                </PageTransition>
              } />
              <Route path="/terms" element={
                <PageTransition>
                  <TermsPage />
                </PageTransition>
              } />
              <Route path="/privacy" element={
                <PageTransition>
                  <PrivacyPolicyPage />
                </PageTransition>
              } />
              <Route path="/support" element={
                <PageTransition>
                  <Support />
                </PageTransition>
              } />
              <Route path="/search-results" element={
                <PageTransition>
                  <SearchResultsPage />
                </PageTransition>
              } />
              <Route path="/cookies" element={
                <PageTransition>
                  <CookiesPolicyPage />
                </PageTransition>
              } />
              <Route path="/accessibility" element={
                <PageTransition>
                  <AccessibilityPage />
                </PageTransition>
              } />
              <Route path="/payment-test" element={
                <PageTransition>
                  <PaymentTester />
                </PageTransition>
              } />
              <Route path="/mock-payment" element={
                <PageTransition>
                  <MockPaymentTester />
                </PageTransition>
              } />
              <Route path="/razorpay-debugger" element={
                <PageTransition>
                  <RazorpayDebugger />
                </PageTransition>
              } />
              <Route path="/admin/users" element={
                <PageTransition>
                  <AccessControl requiredRole="admin">
                    <UserAdmin />
                  </AccessControl>
                </PageTransition>
              } />

              {/* --- ORGANIZER ROUTES --- */}
              <Route path="/organizer/treks" element={
                <PageTransition>
                  <AccessControl requiredRole="organizer">
                    <OrganizerTreks />
                  </AccessControl>
                </PageTransition>
              } />
              <Route path="/organizer/dashboard" element={
                <PageTransition>
                  <AccessControl requiredRole="organizer">
                    <OrganizerDashboard />
                  </AccessControl>
                </PageTransition>
              } />
              <Route path="/organizer/bookings" element={
                <PageTransition>
                  <AccessControl requiredRole="organizer">
                    <OrganizerBookings />
                  </AccessControl>
                </PageTransition>
              } />
              <Route path="/organizer/settings" element={
                <PageTransition>
                  <AccessControl requiredRole="organizer">
                    <OrganizerSettings />
                  </AccessControl>
                </PageTransition>
              } />
              <Route path="/access-control" element={
                <PageTransition>
                  <AccessControl />
                </PageTransition>
              } />
              <Route path="/organizer-trek-login" element={
                <PageTransition>
                  <OrganizerTrekLogin />
                </PageTransition>
              } />
              <Route path="/organizer-dashboard" element={
                <PageTransition>
                  <AccessControl requiredRole="organizer">
                    <OrganizerDashboard />
                  </AccessControl>
                </PageTransition>
              } />
              <Route path="/organizer/add-trek" element={
                <PageTransition>
                  <AccessControl requiredRole="organizer">
                    <OrganizerAddTrek />
                  </AccessControl>
                </PageTransition>
              } />
              <Route path="/organizer/edit-trek/:id" element={
                <PageTransition>
                  <AccessControl requiredRole="organizer">
                    <OrganizerEditTrek />
                  </AccessControl>
                </PageTransition>
              } />

              <Route path="/organizer/:id" element={
                <PageTransition>
                  <OrganizerProfile />
                </PageTransition>
              } />

              {/* ✅ BOOKING ROUTES */}
              <Route path="/booking/:id" element={
                <PageTransition>
                  <BookingPage />
                </PageTransition>
              } />
              <Route path="/booking-confirmation/:bookingId" element={
                <PageTransition>
                  <BookingConfirmation />
                </PageTransition>
              } />

              <Route path="/verify/:certificateId" element={<VerifyCertificate />} />
              <Route path="/admin/certificates" element={
                <PageTransition>
                  <AccessControl requiredRole="admin">
                    <CertificateAdmin />
                  </AccessControl>
                </PageTransition>
              } />
              <Route path="/intern" element={<InternshipJoin />} />
            </Routes>
          </div>
        </div>
      </SearchProvider>
    </Router>
  );
}

export default App;