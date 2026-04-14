import React, { useEffect, useState } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { useNavigate, useParams } from 'react-router-dom';
import {
  FiCheckCircle, FiMapPin, FiCalendar, FiUsers, FiCreditCard,
  FiFileText, FiPhone, FiArrowRight, FiCompass, FiUser,
  FiMail, FiAlertCircle, FiTag, FiClock, FiHome
} from 'react-icons/fi';
import BookingService from '../services/BookingService';
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';

// ============================================
// THEME
// ============================================
const T = {
  primary: '#a53d1e',
  primaryDark: '#ed4c1b',
  primaryLight: '#FFAB91',
  secondary: '#12182f',
  accent: '#ff6b4d',
  success: '#16a34a',
  successLight: '#f0fdf4',
  successBorder: '#bbf7d0',
  white: '#FFFFFF',
  cream: '#FFF8F0',
  peach: '#FFE4D6',
  lightGray: '#F8FAFC',
  mediumGray: '#E2E8F0',
  darkGray: '#64748B',
  text: '#1E293B',
  textLight: '#475569',
};

// ============================================
// ANIMATIONS
// ============================================
const fadeUp = keyframes`
  from { opacity: 0; transform: translateY(24px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const scaleIn = keyframes`
  0%   { opacity: 0; transform: scale(0.5); }
  70%  { transform: scale(1.08); }
  100% { opacity: 1; transform: scale(1); }
`;

const ringPulse = keyframes`
  0%   { transform: scale(1);    box-shadow: 0 0 0 0   rgba(22,163,74,0.4); }
  50%  { transform: scale(1.04); box-shadow: 0 0 0 14px rgba(22,163,74,0); }
  100% { transform: scale(1);    box-shadow: 0 0 0 0   rgba(22,163,74,0); }
`;

const shimmerSlide = keyframes`
  0%   { background-position: -600px 0; }
  100% { background-position:  600px 0; }
`;

const tickerDrop = keyframes`
  from { opacity: 0; transform: translateY(-8px); }
  to   { opacity: 1; transform: translateY(0); }
`;

const spin = keyframes`
  to { transform: rotate(360deg); }
`;

const confettiFall = keyframes`
  0%   { transform: translateY(-20px) rotate(0deg);   opacity: 1; }
  100% { transform: translateY(80px)  rotate(720deg); opacity: 0; }
`;

// ============================================
// PAGE SHELL
// ============================================
const Page = styled.div`
  min-height: 100vh;
  background: linear-gradient(160deg, ${T.cream} 0%, ${T.white} 45%, ${T.peach} 100%);
  padding: 0 0 5rem;
`;

// Top success banner
const SuccessBanner = styled.div`
  background: linear-gradient(135deg, ${T.secondary} 0%, #1e2a4a 100%);
  padding: 3rem 1.5rem 5rem;
  text-align: center;
  position: relative;
  overflow: hidden;

  &::after {
    content: '';
    position: absolute;
    bottom: 0; left: 0; right: 0;
    height: 3px;
    background: linear-gradient(90deg, ${T.primary}, ${T.accent}, ${T.primary});
    background-size: 200% 100%;
    animation: ${shimmerSlide} 3s linear infinite;
  }
`;

const BannerPattern = styled.div`
  position: absolute;
  inset: 0;
  background-image:
    radial-gradient(circle at 15% 50%, rgba(165,61,30,0.15) 0%, transparent 45%),
    radial-gradient(circle at 85% 30%, rgba(255,107,77,0.1) 0%, transparent 40%);
  pointer-events: none;
`;

// Confetti particles
const Dot = styled.div`
  position: absolute;
  width: ${p => p.$s || 8}px;
  height: ${p => p.$s || 8}px;
  border-radius: 50%;
  background: ${p => p.$c || T.primaryLight};
  top: ${p => p.$top}%;
  left: ${p => p.$left}%;
  animation: ${confettiFall} ${p => p.$dur || 2}s ease-out ${p => p.$delay || 0}s both;
  pointer-events: none;
`;

const CheckCircle = styled.div`
  width: 96px;
  height: 96px;
  border-radius: 50%;
  background: linear-gradient(135deg, ${T.success}, #15803d);
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1.5rem;
  animation: ${scaleIn} 0.6s cubic-bezier(0.175,0.885,0.32,1.275) 0.1s both,
             ${ringPulse} 2.5s ease-in-out 0.8s infinite;
  box-shadow: 0 8px 28px rgba(22,163,74,0.35);
  color: white;
`;

const BannerTitle = styled.h1`
  font-size: clamp(1.8rem, 5vw, 2.6rem);
  font-weight: 800;
  color: ${T.white};
  margin: 0 0 0.5rem;
  letter-spacing: -0.02em;
  animation: ${fadeUp} 0.6s ease-out 0.3s both;
`;

const BannerSub = styled.p`
  font-size: 1.05rem;
  color: rgba(255,255,255,0.7);
  margin: 0 0 1.5rem;
  animation: ${fadeUp} 0.6s ease-out 0.4s both;
`;

const BookingBadge = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  background: rgba(255,255,255,0.1);
  border: 1.5px solid rgba(255,255,255,0.2);
  border-radius: 50px;
  padding: 0.5rem 1.25rem;
  font-family: 'Courier New', monospace;
  font-size: 0.9rem;
  font-weight: 700;
  color: ${T.primaryLight};
  letter-spacing: 1.5px;
  animation: ${fadeUp} 0.6s ease-out 0.5s both;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(90deg, transparent, rgba(255,255,255,0.08), transparent);
    background-size: 600px 100%;
    animation: ${shimmerSlide} 2.5s linear infinite;
  }
`;

// ============================================
// CONTENT AREA
// ============================================
const ContentWrap = styled.div`
  max-width: 860px;
  margin: -2.5rem auto 0;
  padding: 0 1.25rem;
  position: relative;
  z-index: 2;
`;

// ============================================
// TICKET CARD
// ============================================
const TicketCard = styled.div`
  background: ${T.white};
  border-radius: 20px;
  box-shadow: 0 4px 6px rgba(0,0,0,0.04), 0 20px 40px rgba(0,0,0,0.08);
  margin-bottom: 1.25rem;
  overflow: hidden;
  animation: ${fadeUp} 0.5s ease-out ${p => p.$delay || '0s'} both;
`;

const CardBand = styled.div`
  background: ${p => p.$green
    ? `linear-gradient(135deg, ${T.success}, #15803d)`
    : `linear-gradient(135deg, ${T.secondary}, #1e2a4a)`};
  padding: 0.85rem 1.5rem;
  display: flex;
  align-items: center;
  gap: 0.65rem;
  color: white;
`;

const BandLabel = styled.span`
  font-size: 0.78rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.1em;
  opacity: 0.9;
`;

const CardBody = styled.div`
  padding: 1.5rem;

  @media (max-width: 480px) {
    padding: 1.1rem;
  }
`;

// ============================================
// TREK HERO INSIDE CARD
// ============================================
const TrekHero = styled.div`
  position: relative;
  border-radius: 14px;
  overflow: hidden;
  height: 200px;
  margin-bottom: 1.25rem;

  img {
    width: 100%; height: 100%;
    object-fit: cover;
  }

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(to top, rgba(0,0,0,0.55) 0%, transparent 60%);
  }
`;

const TrekHeroText = styled.div`
  position: absolute;
  bottom: 1rem;
  left: 1rem;
  right: 1rem;
  z-index: 2;
  color: white;

  h3 { margin: 0 0 0.2rem; font-size: 1.2rem; font-weight: 700; }
  span { font-size: 0.82rem; opacity: 0.85; display: flex; align-items: center; gap: 0.3rem; }
`;

// ============================================
// DETAIL GRID
// ============================================
const Grid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(180px, 1fr));
  gap: 0.85rem;

  @media (max-width: 480px) {
    grid-template-columns: 1fr 1fr;
    gap: 0.65rem;
  }
`;

const Cell = styled.div`
  background: ${T.lightGray};
  border: 1.5px solid ${T.mediumGray};
  border-radius: 12px;
  padding: 0.9rem 1rem;
  transition: border-color 0.2s, transform 0.2s;

  &:hover {
    border-color: ${T.primaryLight};
    transform: translateY(-2px);
  }
`;

const CellLabel = styled.div`
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: ${T.darkGray};
  margin-bottom: 0.35rem;
  display: flex;
  align-items: center;
  gap: 0.35rem;

  svg { color: ${T.primary}; }
`;

const CellValue = styled.div`
  font-size: 0.95rem;
  font-weight: 700;
  color: ${T.text};
  word-break: break-word;

  &.success { color: ${T.success}; }
  &.warning { color: #d97706; }
`;

// ============================================
// PARTICIPANT CARDS
// ============================================
const ParticipantGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 0.85rem;
`;

const ParticipantCard = styled.div`
  background: ${p => p.$primary ? `linear-gradient(135deg, ${T.peach}, ${T.cream})` : T.lightGray};
  border: 1.5px solid ${p => p.$primary ? T.primaryLight : T.mediumGray};
  border-radius: 14px;
  padding: 1rem 1.1rem;
  position: relative;
  animation: ${tickerDrop} 0.4s ease-out ${p => p.$delay || '0s'} both;
`;

const PrimaryBadge = styled.span`
  position: absolute;
  top: 0.6rem;
  right: 0.6rem;
  background: linear-gradient(135deg, ${T.primary}, ${T.primaryDark});
  color: white;
  font-size: 0.65rem;
  font-weight: 800;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  padding: 0.2rem 0.55rem;
  border-radius: 20px;
`;

const PName = styled.div`
  font-size: 1rem;
  font-weight: 700;
  color: ${T.text};
  margin-bottom: 0.5rem;
  padding-right: ${p => p.$hasBadge ? '5rem' : '0'};
`;

const PMeta = styled.div`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8rem;
  color: ${T.textLight};
  margin-bottom: 0.25rem;
  word-break: break-word;

  svg { color: ${T.primary}; flex-shrink: 0; }
`;

const PNum = styled.div`
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: ${T.darkGray};
  margin-bottom: 0.4rem;
`;

// ============================================
// PAYMENT SUMMARY STRIP
// ============================================
const PaymentStrip = styled.div`
  background: linear-gradient(135deg, rgba(165,61,30,0.06), rgba(255,107,77,0.04));
  border: 1.5px solid ${T.peach};
  border-radius: 14px;
  padding: 1.1rem 1.25rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex-wrap: wrap;
  gap: 0.75rem;
  margin-bottom: 0.85rem;
`;

const PayLabel = styled.span`
  font-size: 0.82rem;
  font-weight: 600;
  color: ${T.textLight};
  display: flex;
  align-items: center;
  gap: 0.4rem;
  svg { color: ${T.primary}; }
`;

const PayValue = styled.span`
  font-size: 0.95rem;
  font-weight: 700;
  color: ${T.text};
  word-break: break-all;

  &.big {
    font-size: 1.3rem;
    color: ${T.primary};
  }
  &.success { color: ${T.success}; }
  &.discount { color: ${T.success}; }
`;

const TotalStrip = styled(PaymentStrip)`
  background: linear-gradient(135deg, ${T.secondary} 0%, #1e2a4a 100%);
  border-color: transparent;
  border-radius: 14px;

  ${PayLabel} { color: rgba(255,255,255,0.75); svg { color: ${T.primaryLight}; } }
  ${PayValue} { color: white; &.big { color: ${T.primaryLight}; font-size: 1.5rem; } }
`;

// ============================================
// CTA BUTTONS
// ============================================
const CTARow = styled.div`
  display: flex;
  gap: 0.85rem;
  margin-top: 1.5rem;

  @media (max-width: 540px) {
    flex-direction: column;
  }
`;

const CTABtn = styled.button`
  flex: 1;
  padding: 0.95rem 1.25rem;
  border-radius: 12px;
  font-size: 0.9rem;
  font-weight: 700;
  cursor: pointer;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  transition: all 0.25s ease;
  letter-spacing: 0.02em;

  ${p => p.$primary ? css`
    background: linear-gradient(135deg, ${T.primary} 0%, ${T.primaryDark} 100%);
    border: none;
    color: white;
    box-shadow: 0 4px 14px rgba(165,61,30,0.3);
    &:hover { transform: translateY(-2px); box-shadow: 0 8px 22px rgba(165,61,30,0.4); }
  ` : css`
    background: ${T.white};
    border: 2px solid ${T.mediumGray};
    color: ${T.text};
    &:hover { border-color: ${T.primaryLight}; background: ${T.cream}; transform: translateY(-2px); }
  `}

  &:active { transform: translateY(0); }
`;

// ============================================
// LOADING / ERROR
// ============================================
const CenterBox = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  gap: 1rem;
  text-align: center;
  padding: 2rem;
`;

const Spinner = styled.div`
  width: 48px;
  height: 48px;
  border: 4px solid ${T.peach};
  border-top-color: ${T.primary};
  border-radius: 50%;
  animation: ${spin} 0.9s linear infinite;
`;

const LoadLabel = styled.p`
  color: ${T.darkGray};
  font-size: 1rem;
  font-weight: 500;
`;

const ErrCard = styled.div`
  background: ${T.white};
  border: 2px solid #fecaca;
  border-radius: 16px;
  padding: 2rem;
  max-width: 480px;
  text-align: center;
  animation: ${fadeUp} 0.4s ease-out;

  h3 { color: ${T.text}; font-size: 1.2rem; margin: 0.75rem 0 0.5rem; }
  p  { color: ${T.textLight}; font-size: 0.9rem; margin: 0 0 1.5rem; }
`;

// ============================================
// HELPERS
// ============================================
const formatDate = (val) => {
  if (!val) return 'Not specified';
  try {
    if (val?.toDate) return val.toDate().toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
    return new Date(val).toLocaleDateString('en-IN', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch { return String(val); }
};

const formatAmt = (val) => {
  if (!val && val !== 0) return null;
  const n = typeof val === 'number' ? val : parseFloat(val);
  return isNaN(n) ? null : n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
};

const capitalize = (s) => s ? s.charAt(0).toUpperCase() + s.slice(1) : '';

const participantCount = (booking) => {
  if (Array.isArray(booking.participants)) return booking.participants.length;
  if (booking.totalParticipants) return Number(booking.totalParticipants);
  if (booking.numberOfParticipants) return Number(booking.numberOfParticipants);
  if (booking.participants) return Number(booking.participants);
  return 1;
};

// confetti config
const CONFETTI = [
  { c: T.primaryLight, s: 10, top: 10, left: 20, dur: 2.2, delay: 0.1 },
  { c: '#fbbf24',      s: 7,  top: 5,  left: 50, dur: 2.5, delay: 0.3 },
  { c: T.successBorder,s: 9, top: 8,  left: 75, dur: 2.0, delay: 0.2 },
  { c: T.accent,       s: 6,  top: 15, left: 35, dur: 2.8, delay: 0.5 },
  { c: '#a78bfa',      s: 8,  top: 3,  left: 88, dur: 2.3, delay: 0.4 },
  { c: '#34d399',      s: 7,  top: 12, left: 62, dur: 2.6, delay: 0.15 },
];

// ============================================
// MAIN COMPONENT
// ============================================
const BookingConfirmation = () => {
  const { bookingId } = useParams();
  const [booking, setBooking]   = useState(null);
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    const fetch = async () => {
      try {
        setLoading(true);
        const user = auth.currentUser;
        if (!user) { setError('Please log in to view booking details.'); return; }

        const bookingData = await BookingService.getBookingById(bookingId);

        let profile = {};
        try {
          const snap = await getDoc(doc(db, 'users', user.uid));
          if (snap.exists()) profile = snap.data();
        } catch {}

        setBooking({
          ...bookingData,
          userName: bookingData.name || bookingData.userName || profile.name || profile.firstName || user.displayName,
          userEmail: bookingData.email || bookingData.userEmail || profile.email || user.email,
          userPhone: bookingData.contactNumber || bookingData.phone || profile.phone || profile.contactNumber,
        });
      } catch (e) {
        console.error(e);
        setError('Could not retrieve booking details. Please try again later.');
      } finally {
        setLoading(false);
      }
    };
    if (bookingId) fetch();
  }, [bookingId]);

  // ---- loading ----
  if (loading) return (
    <Page>
      <CenterBox>
        <Spinner />
        <LoadLabel>Loading your booking details…</LoadLabel>
      </CenterBox>
    </Page>
  );

  // ---- error / not found ----
  if (error || !booking) return (
    <Page>
      <CenterBox>
        <ErrCard>
          <FiAlertCircle size={44} color="#ef4444" />
          <h3>{error ? 'Something went wrong' : 'Booking not found'}</h3>
          <p>{error || 'We could not find this booking. Please check the ID.'}</p>
          <CTARow>
            <CTABtn onClick={() => navigate('/profile')}><FiUser />My Profile</CTABtn>
            <CTABtn $primary onClick={() => navigate('/explore')}><FiCompass />Explore</CTABtn>
          </CTARow>
        </ErrCard>
      </CenterBox>
    </Page>
  );

  // ---- derived ----
  const isConfirmed = booking.status === 'confirmed' || booking.paymentStatus === 'completed' || booking.paymentStatus === 'success';
  const totalAmt   = booking.totalAmount || booking.amount || booking.price || booking.finalAmount;
  const discount   = booking.discountAmount || booking.discount;
  const paymentId  = booking.paymentId || booking.transactionId || booking.razorpayPaymentId;
  const pCount     = participantCount(booking);
  const hasParticipants = Array.isArray(booking.participants) && booking.participants.length > 0;

  return (
    <Page>
      {/* ── BANNER ── */}
      <SuccessBanner>
        <BannerPattern />
        {CONFETTI.map((c, i) => (
          <Dot key={i} $c={c.c} $s={c.s} $top={c.top} $left={c.left} $dur={c.dur} $delay={c.delay} />
        ))}

        <CheckCircle>
          <FiCheckCircle size={48} strokeWidth={2.5} />
        </CheckCircle>

        <BannerTitle>🎉 Booking Confirmed!</BannerTitle>
        <BannerSub>Your adventure is all set and waiting for you.</BannerSub>

        <BookingBadge>
          <FiTag size={13} />
          {booking.id || bookingId}
        </BookingBadge>
      </SuccessBanner>

      {/* ── CONTENT ── */}
      <ContentWrap>

        {/* ── TREK DETAILS ── */}
        {booking.trek && (
          <TicketCard $delay="0.1s">
            <CardBand>
              <FiMapPin size={15} />
              <BandLabel>Trek Details</BandLabel>
            </CardBand>
            <CardBody>
              {booking.trek.imageUrl && (
                <TrekHero>
                  <img src={booking.trek.imageUrl} alt={booking.trek.title} />
                  <TrekHeroText>
                    <h3>{booking.trek.title}</h3>
                    {booking.trek.location && (
                      <span><FiMapPin size={12} />{booking.trek.location}</span>
                    )}
                  </TrekHeroText>
                </TrekHero>
              )}
              <Grid>
                {booking.trek.title && (
                  <Cell>
                    <CellLabel><FiCompass size={11} />Trek</CellLabel>
                    <CellValue>{booking.trek.title}</CellValue>
                  </Cell>
                )}
                {booking.trek.location && (
                  <Cell>
                    <CellLabel><FiMapPin size={11} />Location</CellLabel>
                    <CellValue>{booking.trek.location}</CellValue>
                  </Cell>
                )}
                {booking.trek.duration && (
                  <Cell>
                    <CellLabel><FiClock size={11} />Duration</CellLabel>
                    <CellValue>{booking.trek.duration}</CellValue>
                  </Cell>
                )}
                {booking.trek.difficulty && (
                  <Cell>
                    <CellLabel><FiAlertCircle size={11} />Difficulty</CellLabel>
                    <CellValue>{booking.trek.difficulty}</CellValue>
                  </Cell>
                )}
              </Grid>
            </CardBody>
          </TicketCard>
        )}

        {/* ── BOOKING DETAILS ── */}
        <TicketCard $delay="0.18s">
          <CardBand>
            <FiCalendar size={15} />
            <BandLabel>Booking Details</BandLabel>
          </CardBand>
          <CardBody>
            <Grid>
              <Cell>
                <CellLabel><FiCalendar size={11} />Start Date</CellLabel>
                <CellValue>{formatDate(booking.startDate || booking.trekDate || booking.dateOfTrek || booking.date)}</CellValue>
              </Cell>

              <Cell>
                <CellLabel><FiUsers size={11} />Participants</CellLabel>
                <CellValue>{pCount} person{pCount !== 1 ? 's' : ''}</CellValue>
              </Cell>

              <Cell>
                <CellLabel><FiCalendar size={11} />Booked On</CellLabel>
                <CellValue>{formatDate(booking.createdAt || booking.bookingDate)}</CellValue>
              </Cell>

              <Cell>
                <CellLabel><FiCheckCircle size={11} />Status</CellLabel>
                <CellValue className={isConfirmed ? 'success' : 'warning'}>
                  {isConfirmed ? '✓ Confirmed' : capitalize(booking.status || 'Pending')}
                </CellValue>
              </Cell>

              {booking.trekName && (
                <Cell>
                  <CellLabel><FiCompass size={11} />Trek Name</CellLabel>
                  <CellValue>{booking.trekName}</CellValue>
                </Cell>
              )}

              {booking.specialRequests && (
                <Cell style={{ gridColumn: '1 / -1' }}>
                  <CellLabel><FiFileText size={11} />Special Requests</CellLabel>
                  <CellValue>{booking.specialRequests}</CellValue>
                </Cell>
              )}
            </Grid>
          </CardBody>
        </TicketCard>

        {/* ── PARTICIPANTS ── */}
        <TicketCard $delay="0.26s">
          <CardBand>
            <FiUsers size={15} />
            <BandLabel>Participants ({pCount})</BandLabel>
          </CardBand>
          <CardBody>
            {hasParticipants ? (
              <ParticipantGrid>
                {booking.participants.map((p, i) => (
                  <ParticipantCard
                    key={p.participantId || i}
                    $primary={p.isPrimaryBooker}
                    $delay={`${i * 0.07}s`}
                  >
                    {p.isPrimaryBooker && <PrimaryBadge>Primary</PrimaryBadge>}
                    <PNum>Participant {i + 1}</PNum>
                    <PName $hasBadge={p.isPrimaryBooker}>
                      {p.name || `Participant ${i + 1}`}
                    </PName>
                    {p.email && (
                      <PMeta><FiMail size={11} />{p.email}</PMeta>
                    )}
                    {p.age && (
                      <PMeta><FiUser size={11} />Age: {p.age}</PMeta>
                    )}
                    {p.emergencyContact && (
                      <PMeta><FiPhone size={11} />Emergency: {p.emergencyContact}</PMeta>
                    )}
                  </ParticipantCard>
                ))}
              </ParticipantGrid>
            ) : (
              <Grid>
                <Cell>
                  <CellLabel><FiUsers size={11} />Total</CellLabel>
                  <CellValue>{pCount} person{pCount !== 1 ? 's' : ''}</CellValue>
                </Cell>
                {booking.userName && (
                  <Cell>
                    <CellLabel><FiUser size={11} />Booker</CellLabel>
                    <CellValue>{booking.userName}</CellValue>
                  </Cell>
                )}
                {booking.userEmail && (
                  <Cell>
                    <CellLabel><FiMail size={11} />Email</CellLabel>
                    <CellValue>{booking.userEmail}</CellValue>
                  </Cell>
                )}
                {booking.userPhone && (
                  <Cell>
                    <CellLabel><FiPhone size={11} />Phone</CellLabel>
                    <CellValue>{booking.userPhone}</CellValue>
                  </Cell>
                )}
              </Grid>
            )}
          </CardBody>
        </TicketCard>

        {/* ── PAYMENT ── */}
        {(totalAmt || paymentId) && (
          <TicketCard $delay="0.34s">
            <CardBand $green>
              <FiCreditCard size={15} />
              <BandLabel>Payment Summary</BandLabel>
            </CardBand>
            <CardBody>
              {booking.pricePerPerson && (
                <PaymentStrip>
                  <PayLabel><FiTag size={13} />Price per person</PayLabel>
                  <PayValue>₹{formatAmt(booking.pricePerPerson)}</PayValue>
                </PaymentStrip>
              )}

              {booking.pricePerPerson && pCount > 1 && (
                <PaymentStrip>
                  <PayLabel><FiUsers size={13} />× {pCount} participants</PayLabel>
                  <PayValue>₹{formatAmt(booking.pricePerPerson * pCount)}</PayValue>
                </PaymentStrip>
              )}

              {discount > 0 && (
                <PaymentStrip>
                  <PayLabel><FiTag size={13} />
                    Discount {booking.coupon?.code && `(${booking.coupon.code})`}
                  </PayLabel>
                  <PayValue className="discount">− ₹{formatAmt(discount)}</PayValue>
                </PaymentStrip>
              )}

              {paymentId && (
                <PaymentStrip>
                  <PayLabel><FiCreditCard size={13} />Payment ID</PayLabel>
                  <PayValue style={{ fontSize: '0.78rem', fontFamily: 'monospace' }}>{paymentId}</PayValue>
                </PaymentStrip>
              )}

              <TotalStrip>
                <PayLabel><FiCheckCircle size={13} />Total Paid</PayLabel>
                <PayValue className="big">₹{formatAmt(totalAmt)}</PayValue>
              </TotalStrip>
            </CardBody>
          </TicketCard>
        )}

        {/* ── EMERGENCY CONTACT ── */}
        {(booking.emergencyName || booking.emergencyContact || booking.emergencyPhone) && (
          <TicketCard $delay="0.42s">
            <CardBand>
              <FiPhone size={15} />
              <BandLabel>Emergency Contact</BandLabel>
            </CardBand>
            <CardBody>
              <Grid>
                {booking.emergencyName && (
                  <Cell>
                    <CellLabel><FiUser size={11} />Name</CellLabel>
                    <CellValue>{booking.emergencyName}</CellValue>
                  </Cell>
                )}
                {(booking.emergencyContact || booking.emergencyPhone) && (
                  <Cell>
                    <CellLabel><FiPhone size={11} />Number</CellLabel>
                    <CellValue>{booking.emergencyContact || booking.emergencyPhone}</CellValue>
                  </Cell>
                )}
              </Grid>
            </CardBody>
          </TicketCard>
        )}

        {/* ── CTA BUTTONS ── */}
        <CTARow>
          <CTABtn onClick={() => navigate('/profile')}>
            <FiHome size={16} /> My Bookings
          </CTABtn>
          <CTABtn $primary onClick={() => navigate('/explore')}>
            <FiCompass size={16} /> Explore More <FiArrowRight size={14} />
          </CTABtn>
        </CTARow>

      </ContentWrap>
    </Page>
  );
};

export default BookingConfirmation;