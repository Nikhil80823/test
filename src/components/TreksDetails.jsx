// TrekDetails.jsx - Integrated with central theme
import { useState, useEffect, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import styled, { createGlobalStyle, keyframes } from "styled-components";
import { motion } from "framer-motion";
import { db, auth } from "../firebase";

import {
  doc,
  getDoc,
  collection,
  query,
  where,
  getDocs,
} from "firebase/firestore";
import { onAuthStateChanged } from "firebase/auth";
import { getValidImageUrl } from "../utils/images";
import { saveBooking } from "../utils/bookingService";

// ✅ Import central theme instead of local tokens
import { T as tokens } from '../theme.js';

// Import modular components
import Header from "./TrekPage/Header";
import Hero from "./TrekPage/Hero";
import Stats from "./TrekPage/Stats";
import Description from "./TrekPage/Description";
import Highlights from "./TrekPage/Highlights";
import Itinerary from "./TrekPage/Itinerary";
import IncludedExcluded from "./TrekPage/IncludedExcluded";
import BestTimeToVisit from "./TrekPage/BestTimeToVisit";
import MeetOrganizer from "./TrekPage/MeetOrganizer";
import BookingCard from "./TrekPage/BookingCard";
import PhotoGallery from "./TrekPage/PhotoGallery";
import GalleryModal from "./TrekPage/GalleryModal";
import ReviewsSection from "./TrekPage/ReviewsSection";
import WhatsAppButton from "./TrekPage/WhatsAppButton";





// ============================================================
// GLOBAL STYLES
// ============================================================
const GlobalStyles = createGlobalStyle`
  @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Sora:wght@600;700;800&display=swap');

  *, *::before, *::after { 
    box-sizing: border-box; 
    margin: 0; 
    padding: 0; 
  }

  html {
    scroll-behavior: smooth;
    scroll-padding-top: 160px;
  }

  body {
    background: ${tokens.bg};
    color: ${tokens.textPrimary};
    font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
    line-height: 1.6;
    overflow-x: hidden;
    -webkit-font-smoothing: antialiased;
  }

  ::-webkit-scrollbar { width: 6px; }
  ::-webkit-scrollbar-track { background: ${tokens.bg}; }
  ::-webkit-scrollbar-thumb {
    background: ${tokens.primary};
    border-radius: 3px;
  }
  ::-webkit-scrollbar-thumb:hover { background: #fb923c; }

  ::selection {
    background: rgba(249, 115, 22, 0.15);
    color: #fb923c;
  }
`;

// ============================================================
// ANIMATIONS
// ============================================================
const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(24px); }
  to { opacity: 1; transform: translateY(0); }
`;

const fadeIn = keyframes`
  from { opacity: 0; }
  to { opacity: 1; }
`;

const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const shimmer = keyframes`
  0% { background-position: -1000px 0; }
  100% { background-position: 1000px 0; }
`;

const slideHorizontal = keyframes`
  0%, 100% { transform: translateX(-4px); }
  50% { transform: translateX(4px); }
`;

// ============================================================
// LAYOUT COMPONENTS
// ============================================================
const PageWrapper = styled.div`
  min-height: 100vh;
  background: ${tokens.bg};
  color: ${tokens.textPrimary};
  position: relative;
  overflow-x: hidden;
`;

const Container = styled.div`
  max-width: 1320px;
  margin: 0 auto;
  padding: 0 1.5rem;

  @media (min-width: 1400px) {
    max-width: 1400px;
  }
  @media (max-width: 768px) {
    padding: 0 1rem;
  }
`;

const MainLayout = styled.div`
  padding: 3rem 0 6rem;

  @media (max-width: 900px) {
    padding-bottom: 120px;
  }
`;

const ContentGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 380px;
  gap: 2.5rem;
  align-items: start;

  @media (max-width: 1100px) {
    grid-template-columns: 1fr 340px;
    gap: 2rem;
  }

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
    gap: 2rem;
  }
`;

const MainCol = styled.main`
  display: flex;
  flex-direction: column;
  gap: 2rem;
  min-width: 0;
`;

const SideCol = styled.aside`
  @media (min-width: 901px) {
    position: sticky;
    top: 160px;
    height: fit-content;
  }

  @media (max-width: 900px) {
    order: -1;
  }
`;

// ============================================================
// SECTION NAVIGATION BAR
// ============================================================
const SectionNavWrapper = styled.div`
  position: sticky;
  top: 80px;
  z-index: 80;
  background: rgba(10, 10, 10, 0.95);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid ${tokens.border};
  transition: ${tokens.transition.base};

  &.scrolled {
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
  }

  @media (max-width: 768px) {
    top: 70px;
  }
`;

const SectionNavContainer = styled(Container)`
  padding: 0;
`;

const SectionNavScroller = styled.div`
  overflow-x: auto;
  overflow-y: hidden;
  -webkit-overflow-scrolling: touch;
  scrollbar-width: none;
  
  &::-webkit-scrollbar {
    display: none;
  }

  @media (max-width: 768px) {
    scroll-snap-type: x proximity;
    scroll-padding-left: 1rem;
  }

  position: relative;
  
  &::after {
    content: '';
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    width: 40px;
    background: linear-gradient(to left, rgba(10, 10, 10, 0.95), transparent);
    pointer-events: none;
    
    @media (max-width: 768px) {
      width: 20px;
    }
  }
`;

const SectionNav = styled.nav`
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
  padding: 0 1.5rem;
  min-width: max-content;

  @media (max-width: 1024px) {
    gap: 0.25rem;
    padding: 0 1.25rem;
  }

  @media (max-width: 768px) {
    padding: 0 1rem;
    gap: 0.125rem;
  }
`;

const NavItem = styled.button`
  position: relative;
  padding: 1.25rem 1.5rem;
  background: transparent;
  border: none;
  color: ${({ $active }) => $active ? tokens.primary : tokens.textMuted};
  font-size: 0.875rem;
  font-weight: ${({ $active }) => $active ? 600 : 500};
  cursor: pointer;
  transition: ${tokens.transition.base};
  white-space: nowrap;
  font-family: 'Inter', sans-serif;
  flex-shrink: 0;

  &:hover {
    color: ${tokens.primary};
  }

  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 2px;
    background: ${tokens.primary};
    transform: scaleX(${({ $active }) => $active ? 1 : 0});
    transition: transform 0.3s ease;
  }

  &:hover::after {
    transform: scaleX(1);
  }

  @media (max-width: 1024px) {
    padding: 1.125rem 1.25rem;
    font-size: 0.8125rem;
  }

  @media (max-width: 768px) {
    padding: 1rem 1rem;
    font-size: 0.75rem;
    scroll-snap-align: start;
    
    ${({ $active }) => $active && `
      background: rgba(249, 115, 22, 0.08);
      border-radius: 8px 8px 0 0;
    `}
  }

  @media (max-width: 480px) {
    padding: 0.875rem 0.875rem;
    font-size: 0.7rem;
  }
`;

const ScrollIndicator = styled.div`
  display: none;
  
  @media (max-width: 768px) {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.5rem 0 0.25rem;
    font-size: 0.7rem;
    color: ${tokens.textMuted};
    gap: 0.5rem;
    animation: ${fadeIn} 0.3s ease;
    
    svg {
      width: 14px;
      height: 14px;
      animation: ${slideHorizontal} 1.5s ease-in-out infinite;
    }
  }
`;

// ============================================================
// MOBILE BOOKING BAR

const MobilePrice = styled.div`
  font-family: "Sora", sans-serif;
  font-size: 1.4rem;
  color: ${tokens.primary};
  line-height: 1;

  sub {
    font-size: 0.75rem;
    color: ${tokens.textMuted};
  }
`;

const MobileLabel = styled.div`
  font-size: 0.72rem;
  color: ${tokens.textMuted};
  margin-bottom: 0.25rem;
`;

const PrimaryBtn = styled.button`
  display: inline-flex;
  align-items: center;
  gap: 0.625rem;
  padding: 0.75rem 1.5rem;
  border-radius: ${tokens.radius.lg};
  border: none;
  background: linear-gradient(
    135deg,
    ${tokens.primary} 0%,
    ${tokens.primaryDark} 100%
  );
  color: white;
  font-weight: 700;
  font-size: 0.875rem;
  cursor: pointer;
  transition: ${tokens.transition.base};
  box-shadow: 0 8px 25px rgba(249, 115, 22, 0.35);
  white-space: nowrap;

  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 12px 35px rgba(249, 115, 22, 0.5);
  }

  &:active {
    transform: translateY(0);
  }
`;

// ============================================================
// LOADING & ERROR STATES
// ============================================================
const FullCenter = styled.div`
  min-height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${tokens.bg};
`;

const LoadingWrapper = styled.div`
  text-align: center;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1.5rem;
  animation: ${fadeIn} 0.5s ease;
`;

const LoadingSpinner = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  border: 3px solid rgba(255, 255, 255, 0.07);
  border-top-color: ${tokens.primary};
  animation: ${spin} 0.8s linear infinite;
`;

const LoadingTitle = styled.h2`
  font-size: 1.375rem;
  font-weight: 600;
  color: ${tokens.textPrimary};
`;

const LoadingSubtitle = styled.p`
  font-size: 0.9rem;
  color: ${tokens.textMuted};
`;

const SkeletonBar = styled.div`
  height: ${({ $h }) => $h || "14px"};
  width: ${({ $w }) => $w || "100%"};
  border-radius: 100px;
  background: linear-gradient(
    90deg,
    #1f1f1f 25%,
    rgba(255, 255, 255, 0.06) 50%,
    #1f1f1f 75%
  );
  background-size: 1000px 100%;
  animation: ${shimmer} 1.5s infinite linear;
`;

const ErrorWrapper = styled.div`
  background: rgba(249, 115, 22, 0.08);
  border: 1px solid rgba(249, 115, 22, 0.25);
  border-radius: ${tokens.radius.xl};
  padding: 2.5rem 2rem;
  text-align: center;
  max-width: 480px;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 1rem;
`;

const HomeBtn = styled.button`
  padding: 0.75rem 2rem;
  border-radius: ${tokens.radius.lg};
  border: none;
  background: linear-gradient(
    135deg,
    ${tokens.primary},
    ${tokens.primaryDark}
  );
  color: white;
  font-weight: 600;
  font-size: 0.9375rem;
  cursor: pointer;
  transition: ${tokens.transition.base};
  margin-top: 0.5rem;

  &:hover {
    transform: translateY(-1px);
    box-shadow: 0 8px 20px rgba(249, 115, 22, 0.3);
  }
`;

// ============================================================
// HELPER FUNCTIONS
// ============================================================
function formatPrice(price) {
  if (!price) return "₹0";
  if (typeof price === "number") return `₹${price.toLocaleString()}`;
  if (typeof price === "string") {
    const clean = price.replace(/^[$₹]/, "");
    return `₹${clean}`;
  }
  return "₹0";
}

function getNumericPrice(price) {
  if (!price) return 0;
  if (typeof price === "number") return price;
  if (typeof price === "string") {
    const n = parseFloat(price.replace(/^[$₹]/, "").replace(/,/g, ""));
    return isNaN(n) ? 0 : n;
  }
  return 0;
}

function generateItinerary(days, title) {
  const activityPool = [
    { act: "Scenic hike through alpine meadows", duration: "5–6 hrs", elevation: "+600m" },
    { act: "Trek across suspension bridges", duration: "4–5 hrs", elevation: "+400m" },
    { act: "Reach panoramic viewpoints", duration: "6–7 hrs", elevation: "+800m" },
    { act: "Explore ancient mountain villages", duration: "3–4 hrs", elevation: "+200m" },
    { act: "Cross glacial streams and ridgelines", duration: "5–6 hrs", elevation: "+500m" },
    { act: "Camp beside crystal alpine lakes", duration: "4 hrs", elevation: "+300m" },
    { act: "Traverse dense rhododendron forests", duration: "4–5 hrs", elevation: "+350m" },
    { act: "Final descent through valley floors", duration: "4–5 hrs", elevation: "-800m" },
  ];
  const dayTitles = [
    "Arrival & acclimatisation", "Into the high country", "Ridge traverse",
    "Valley crossing", "High camp push", "Summit approach",
    "Rest & exploration day", "Descent begins", "Return to civilization", "Departure day",
  ];
  return Array.from({ length: days }, (_, i) => {
    const a = activityPool[i % activityPool.length];
    return {
      day: i + 1,
      title: dayTitles[i] || `Day ${i + 1} — ${title}`,
      description: a.act + ". Today's journey takes you through breathtaking scenery with opportunities for wildlife spotting and photography.",
      duration: a.duration,
      elevation: a.elevation,
    };
  });
}

function generateHighlights(title) {
  return [
    `Stunning panoramic views of ${title} peaks`,
    "Diverse alpine flora and rare wildlife",
    "Expert certified mountain guides",
    "Comfortable mountain lodges & camps",
    "Cultural immersion in local villages",
    "Authentic Himalayan cuisine",
    "Unlimited photography opportunities",
    "Small group, personalised experience",
  ];
}

function getIncluded() {
  return [
    "Professional mountain guide",
    "All accommodation during trek",
    "Meals as per itinerary (B+L+D)",
    "All transportation during trek",
    "Entry fees & permits",
    "Safety & first-aid equipment",
    "Emergency support & comms",
    "Trekking poles & rain gear",
  ];
}

function getExcluded() {
  return [
    "International / domestic flights",
    "Personal travel insurance",
    "Personal expenses & tips",
    "Alcoholic beverages",
    "Personal trekking gear",
    "Emergency evacuation costs",
  ];
}

function generateReviews(title) {
  const pool = [
    { name: "Aryan S.", text: `${title} was the most breathtaking experience of my life. Every day brought new landscapes that left me speechless.` },
    { name: "Priya M.", text: "The guides were incredibly knowledgeable and kept us safe throughout. Organisation was flawless." },
    { name: "James T.", text: "Challenging at moments but the views more than make up for it. Would highly recommend to any adventure lover." },
    { name: "Simran K.", text: "The food was surprisingly amazing at altitude! Loved the camping under the stars." },
    { name: "David L.", text: "Small group made it feel personal. The team genuinely cared about our experience. Unforgettable." },
  ];
  const dates = ["2 weeks ago", "1 month ago", "3 months ago", "5 months ago", "2 months ago"];
  const ratings = [5, 5, 4, 5, 4];
  return pool.map((r, i) => ({
    id: `r-${i}`,
    author: r.name,
    date: dates[i],
    rating: ratings[i],
    text: r.text,
  }));
}

// ============================================================
// MAIN COMPONENT
// ============================================================
export default function TrekDetails() {
  const { id } = useParams();
  const navigate = useNavigate();

  // Core state
  const [trek, setTrek] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // UI state
  const [navScrolled, setNavScrolled] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [authUser, setAuthUser] = useState(null);
  const [isLiked, setIsLiked] = useState(false);
  const [activeSection, setActiveSection] = useState("overview");

  // Gallery state
  const [galleryOpen, setGalleryOpen] = useState(false);
  const [galleryIdx, setGalleryIdx] = useState(0);

  // Booking floating button
  const bookingCardRef = useRef(null);


  // Section refs for navigation
  const sectionRefs = useRef({
    overview: null,
    highlights: null,
    itinerary: null,
    included: null,
    besttime: null,
    organizer: null,
    gallery: null,
    reviews: null,
  });

  // Section navigation refs
  const sectionNavScrollerRef = useRef(null);
  const [showScrollIndicator, setShowScrollIndicator] = useState(false);

  // ── Auth listener ────────────────────────────────────────
  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => setAuthUser(u));
    return unsub;
  }, []);

  // ── Scroll listener ──────────────────────────────────────
  useEffect(() => {
    const handler = () => setNavScrolled(window.scrollY > 60);
    window.addEventListener("scroll", handler, { passive: true });
    return () => window.removeEventListener("scroll", handler);
  }, []);

  // ── Active section observer ──────────────────────────────
  useEffect(() => {
    const observers = [];
    const options = { rootMargin: "-160px 0px -50% 0px", threshold: 0 };

    const callback = (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          const sectionId = entry.target.getAttribute("data-section");
          if (sectionId) setActiveSection(sectionId);
        }
      });
    };

    Object.keys(sectionRefs.current).forEach((key) => {
      const element = sectionRefs.current[key];
      if (element) {
        const observer = new IntersectionObserver(callback, options);
        observer.observe(element);
        observers.push(observer);
      }
    });

    return () => { observers.forEach((observer) => observer.disconnect()); };
  }, [trek]);

  // ── Booking card visibility ──────────────────────────────
  useEffect(() => {
    const el = bookingCardRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => { setShowBookingFloating(!entry.isIntersecting); },
      { threshold: 0.15, rootMargin: "0px 0px -10% 0px" },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [trek]);

  // ── Section nav scroll indicator ─────────────────────────
  useEffect(() => {
    const scroller = sectionNavScrollerRef.current;
    if (!scroller) return;

    const checkScroll = () => {
      const { scrollWidth, clientWidth, scrollLeft } = scroller;
      const canScroll = scrollWidth > clientWidth;
      const isAtEnd = scrollLeft + clientWidth >= scrollWidth - 10;
      setShowScrollIndicator(canScroll && !isAtEnd);
    };

    checkScroll();
    scroller.addEventListener('scroll', checkScroll, { passive: true });
    window.addEventListener('resize', checkScroll, { passive: true });

    return () => {
      scroller.removeEventListener('scroll', checkScroll);
      window.removeEventListener('resize', checkScroll);
    };
  }, [trek]);

  // ── Auto-scroll to active section in navbar ──────────────
  useEffect(() => {
    const scroller = sectionNavScrollerRef.current;
    if (!scroller) return;

    const activeButton = scroller.querySelector(`[data-section-nav="${activeSection}"]`);
    if (activeButton) {
      const scrollerRect = scroller.getBoundingClientRect();
      const buttonRect = activeButton.getBoundingClientRect();
      
      if (buttonRect.left < scrollerRect.left || buttonRect.right > scrollerRect.right) {
        const scrollLeft = activeButton.offsetLeft - scroller.offsetWidth / 2 + activeButton.offsetWidth / 2;
        scroller.scrollTo({ left: scrollLeft, behavior: 'smooth' });
      }
    }
  }, [activeSection]);

  // ── Image preload ────────────────────────────────────────
  useEffect(() => {
    if (!trek) return;
    const urls = Array.isArray(trek.imageUrls)
      ? trek.imageUrls.filter(Boolean)
      : [trek.image].filter(Boolean);

    if (!urls.length) { setImageLoaded(true); return; }

    const img = new Image();
    img.src = getValidImageUrl(urls[0]);
    img.onload = () => setImageLoaded(true);
    const t = setTimeout(() => setImageLoaded(true), 3000);
    urls.slice(1).forEach((u) => { const i = new Image(); i.src = getValidImageUrl(u); });
    return () => clearTimeout(t);
  }, [trek]);

  // ── Data fetch ───────────────────────────────────────────
  useEffect(() => {
    let mounted = true;

    const fallback = () => {
      const name = id.replace(/-/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
      return {
        id,
        title: name,
        image: `https://images.unsplash.com/photo-1464822759023-fed622ff2c3b?w=1600&q=80`,
        description: `Experience the legendary ${name} — a journey through some of the most dramatic mountain scenery on earth. Expert-led, small-group expeditions.`,
        days: 7,
        difficulty: "Moderate",
        location: "Himalayan Region",
        country: "Nepal",
        season: "Mar – Jun, Sep – Nov",
        price: 12500,
        rating: 4.8,
        reviews: 64,
        capacity: 12,
        altitude: "4,200m",
        reviewsData: generateReviews(name),
      };
    };

    const load = async () => {
      try {
        const ref = doc(db, "treks", id);
        const snap = await getDoc(ref);

        if (!mounted) return;

        let data;

        if (snap.exists()) {
          data = { id: snap.id, ...snap.data() };
        } else {
          const q = query(collection(db, "treks"), where("id", "==", id));
          const qs = await getDocs(q);
          if (!qs.empty) {
            data = { id: qs.docs[0].id, ...qs.docs[0].data() };
          } else {
            const all = await getDocs(collection(db, "treks"));
            all.forEach((d) => {
              const ddata = d.data();
              if (
                !data &&
                (d.id === id ||
                  ddata.id === id ||
                  (ddata.title && ddata.title.toLowerCase().replace(/\s+/g, "-") === id.toLowerCase()))
              ) {
                data = { id: d.id, ...ddata };
              }
            });
          }
        }

        if (!data) data = fallback();

        try {
          const rq = query(collection(db, "reviews"), where("trekId", "==", id));
          const rs = await getDocs(rq);
          data.reviewsData = rs.empty
            ? generateReviews(data.title)
            : rs.docs.map((d) => ({ id: d.id, ...d.data() }));
        } catch {
          data.reviewsData = generateReviews(data.title);
        }

        if (mounted) {
          setTrek(data);
          setLoading(false);
        }
      } catch (err) {
        console.error(err);
        if (mounted) {
          setTrek(fallback());
          setLoading(false);
        }
      }
    };

    load();
    const timeout = setTimeout(() => {
      if (mounted && loading) {
        setTrek(fallback());
        setLoading(false);
      }
    }, 8000);

    return () => {
      mounted = false;
      clearTimeout(timeout);
    };
  }, [id, loading]);

  // ── Handlers ─────────────────────────────────────────────
  const handleBook = () => {
    if (!authUser) {
      navigate("/login", { state: { redirectTo: `/trek/${id}` } });
      return;
    }
    navigate(`/booking/${trek.id || id}`, {
      state: {
        trek: {
          ...trek,
          numericPrice: getNumericPrice(trek?.price),
        },
      },
    });
  };

  const handleLike = async () => {
    setIsLiked((prev) => !prev);
  };

  const handleShare = () => {
    if (navigator.share) {
      navigator.share({ title: trek?.title || "Trek", url: window.location.href }).catch(console.error);
    } else {
      navigator.clipboard.writeText(window.location.href);
      alert("Link copied to clipboard!");
    }
  };

  const handleViewItinerary = () => {
    scrollToSection("itinerary");
  };

  const handleGalleryNavigate = (direction) => {
    const images = (trek?.imageUrls || []).filter(Boolean);
    if (typeof direction === "number") {
      setGalleryIdx(direction);
    } else if (direction === "prev") {
      setGalleryIdx((p) => (p - 1 + images.length) % images.length);
    } else if (direction === "next") {
      setGalleryIdx((p) => (p + 1) % images.length);
    }
  };

  const scrollToSection = (sectionId) => {
    const element = sectionRefs.current[sectionId];
    if (element) {
      const yOffset = -160;
      const y = element.getBoundingClientRect().top + window.pageYOffset + yOffset;
      window.scrollTo({ top: y, behavior: 'smooth' });
      setActiveSection(sectionId);
    }
  };

  // ── Derived values ────────────────────────────────────────
  const title = trek?.title || "Mountain Trek";
  const description = trek?.description || "";
  const detailedDesc = trek?.detailedDescription || description;
  const image = getValidImageUrl(trek?.image);
  const days = trek?.days || 7;
  const price = formatPrice(trek?.price);
  const difficulty = trek?.difficulty || "Moderate";
  const trekLocation = trek?.location || "Mountain Region";
  const season = trek?.season || "Year-round";
  const country = trek?.country || "Nepal";
  const rating = Number(trek?.rating) || 4.8;
  const capacity = trek?.capacity || "12";
  const altitude = trek?.altitude || "3,500m";
  const organizerName = trek?.organizerName;
  const organizerId = trek?.organizerId;
  const itinerary = trek?.itinerary || generateItinerary(days, title);
  const highlights = trek?.highlights || generateHighlights(title);
  const included = trek?.included || getIncluded();
  const excluded = trek?.excluded || getExcluded();
  const reviews = trek?.reviewsData || generateReviews(title);
  const reviewCount = trek?.reviews || reviews.length;
  const images = Array.isArray(trek?.imageUrls)
    ? trek.imageUrls.filter(Boolean)
    : [trek?.image].filter(Boolean);
  const availableMonths = trek?.availableMonths || [];

  const waMsg = encodeURIComponent(
    `Hi! I'm interested in booking the ${title} trek. Could you share more details?`,
  );
  const waHref = `https://wa.me/?text=${waMsg}`;

  const sections = [
    { id: "overview", label: "Overview" },
    { id: "highlights", label: "Highlights" },
    { id: "itinerary", label: "Itinerary" },
    { id: "included", label: "Included" },
    { id: "besttime", label: "Best Time" },
    { id: "organizer", label: "Organizer" },
    { id: "gallery", label: "Gallery" },
    { id: "reviews", label: "Reviews" },
  ];

  // ── Loading ───────────────────────────────────────────────
  if (loading) {
    return (
      <FullCenter>
        <LoadingWrapper>
          <LoadingSpinner />
          <LoadingTitle>Loading your adventure…</LoadingTitle>
          <LoadingSubtitle>Gathering trek details and highlights</LoadingSubtitle>
          <div style={{ display: "flex", flexDirection: "column", gap: "0.625rem", width: 280, marginTop: "0.5rem" }}>
            <SkeletonBar $h="12px" $w="80%" />
            <SkeletonBar $h="12px" $w="60%" />
            <SkeletonBar $h="12px" $w="70%" />
          </div>
        </LoadingWrapper>
      </FullCenter>
    );
  }

  if (error && !trek) {
    return (
      <FullCenter>
        <ErrorWrapper>
          <h2 style={{ color: tokens.textPrimary, fontSize: "1.375rem", fontWeight: 700 }}>
            Trek Not Found
          </h2>
          <p style={{ color: tokens.textMuted, fontSize: "0.9rem" }}>
            We couldn't find the trail you're looking for.
          </p>
          <HomeBtn onClick={() => navigate("/")}>Go Home</HomeBtn>
        </ErrorWrapper>
      </FullCenter>
    );
  }

  // ── Render ────────────────────────────────────────────────
  return (
    <>
      <GlobalStyles />

      <PageWrapper>
        <Header
          title={title}
          scrolled={navScrolled}
          isLiked={isLiked}
          onLike={handleLike}
          onShare={handleShare}
          onBook={handleBook}
        />

        <Hero
          title={title}
          description={description}
          image={image}
          location={trekLocation}
          country={country}
          difficulty={difficulty}
          days={days}
          altitude={altitude}
          rating={rating}
          reviewCount={reviewCount}
          capacity={capacity}
          price={price}
          imageLoaded={imageLoaded}
          onImageLoad={() => setImageLoaded(true)}
          onBook={handleBook}
          onBookNow={handleBook}
          onViewItinerary={handleViewItinerary}
          organizerVerified={trek?.organizerVerified}
        />

        <Stats
          days={days}
          altitude={altitude}
          difficulty={difficulty}
          capacity={capacity}
          rating={rating}
          season={season}
        />

        <SectionNavWrapper className={navScrolled ? 'scrolled' : ''}>
          <SectionNavContainer>
            <SectionNavScroller ref={sectionNavScrollerRef}>
              <SectionNav>
                {sections.map((section) => (
                  <NavItem
                    key={section.id}
                    data-section-nav={section.id}
                    $active={activeSection === section.id}
                    onClick={() => scrollToSection(section.id)}
                  >
                    {section.label}
                  </NavItem>
                ))}
              </SectionNav>
            </SectionNavScroller>
            {showScrollIndicator && (
              <ScrollIndicator>
                <svg fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                </svg>
                <span>Scroll for more</span>
              </ScrollIndicator>
            )}
          </SectionNavContainer>
        </SectionNavWrapper>

        <MainLayout>
          <Container>
            <ContentGrid>
              <MainCol>
                <div ref={(el) => (sectionRefs.current.overview = el)} data-section="overview">
                  <Description description={description} detailedDescription={detailedDesc} />
                </div>

                <div ref={(el) => (sectionRefs.current.highlights = el)} data-section="highlights">
                  <Highlights highlights={highlights} />
                </div>

                <div ref={(el) => (sectionRefs.current.itinerary = el)} data-section="itinerary">
                  <Itinerary itinerary={itinerary} />
                </div>

                <div ref={(el) => (sectionRefs.current.besttime = el)} data-section="besttime">
                  <BestTimeToVisit season={season} availableMonths={availableMonths} />
                </div>
              </MainCol>

              <SideCol>
                <BookingCard
                  cardRef={bookingCardRef}
                  price={price}
                  rating={rating}
                  reviewCount={reviewCount}
                  days={days}
                  location={trekLocation}
                  difficulty={difficulty}
                  altitude={altitude}
                  capacity={capacity}
                  season={season}
                  country={country}
                  onBook={handleBook}
                  organizerName={organizerName}
                  whatsappLink={waHref}
                />
              </SideCol>
            </ContentGrid>
          </Container>

          <Container>
            <div ref={(el) => (sectionRefs.current.organizer = el)} data-section="organizer">
              <MeetOrganizer
                organizerName={organizerName}
                organizerId={organizerId}
                organizerVerified={trek?.organizerVerified}
                organizerTrekCount={trek?.organizerTrekCount}
                organizerExperience={trek?.organizerExperience}
                organizerDescription={trek?.organizerDescription}
              />
            </div>
          </Container>

          <Container>
            <div ref={(el) => (sectionRefs.current.included = el)} data-section="included">
              <IncludedExcluded included={included} excluded={excluded} />
            </div>
          </Container>
        </MainLayout>

        <div ref={(el) => (sectionRefs.current.gallery = el)} data-section="gallery">
          <PhotoGallery
            images={images}
            title={title}
            onImageClick={(idx) => {
              setGalleryIdx(idx);
              setGalleryOpen(true);
            }}
          />
        </div>

        <Container>
          <div ref={(el) => (sectionRefs.current.reviews = el)} data-section="reviews">
            <ReviewsSection reviews={reviews} rating={rating} />
          </div>
        </Container>

        <MobileBar
          initial={{ y: 100 }}
          animate={{ y: 0 }}
          transition={{ delay: 0.5, duration: 0.4 }}
        >
          <div>
            <MobileLabel>Starting from</MobileLabel>
            <MobilePrice>
              {price}
              <sub>/ person</sub>
            </MobilePrice>
          </div>
          <PrimaryBtn onClick={handleBook}>Book Now →</PrimaryBtn>
        </MobileBar>

        <GalleryModal
          isOpen={galleryOpen}
          images={images}
          currentIndex={galleryIdx}
          onClose={() => setGalleryOpen(false)}
          onNavigate={handleGalleryNavigate}
          title={title}
        />

        <WhatsAppButton href={waHref} />
      </PageWrapper>
    </>
  );
}