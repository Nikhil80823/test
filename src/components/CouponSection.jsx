import React, { useState } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { FiCheckCircle, FiXCircle, FiTag, FiLoader, FiGift, FiScissors } from 'react-icons/fi';
import { db } from '../firebase';
import { collection, getDocs, query, where } from 'firebase/firestore';

// ============================================
// ANIMATIONS
// ============================================
const spin = keyframes`
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
`;

const fadeSlideIn = keyframes`
  from { opacity: 0; transform: translateY(-10px); }
  to { opacity: 1; transform: translateY(0); }
`;

const successPop = keyframes`
  0% { opacity: 0; transform: scale(0.85); }
  60% { transform: scale(1.04); }
  100% { opacity: 1; transform: scale(1); }
`;

const shimmer = keyframes`
  0% { background-position: -400px 0; }
  100% { background-position: 400px 0; }
`;

const ticketWiggle = keyframes`
  0%, 100% { transform: rotate(-2deg); }
  50% { transform: rotate(2deg); }
`;

const glowPulse = keyframes`
  0%, 100% { box-shadow: 0 0 0 0 rgba(165, 61, 30, 0.3); }
  50% { box-shadow: 0 0 0 6px rgba(165, 61, 30, 0); }
`;

// ============================================
// THEME DEFAULTS
// ============================================
const C = {
  primary: '#a53d1e',
  primaryDark: '#ed4c1b',
  primaryLight: '#FFAB91',
  success: '#16a34a',
  successBg: '#f0fdf4',
  successBorder: '#bbf7d0',
  error: '#dc2626',
  errorBg: '#fef2f2',
  white: '#fff',
  cream: '#FFF8F0',
  peach: '#FFE4D6',
  text: '#1e293b',
  muted: '#64748b',
  border: '#e2e8f0',
};

// ============================================
// STYLED COMPONENTS
// ============================================

const Wrapper = styled.div`
  margin: 1rem 0;
  animation: ${fadeSlideIn} 0.4s ease-out;
`;

// --- Ticket-style outer card ---
const TicketCard = styled.div`
  position: relative;
  background: ${C.white};
  border-radius: 16px;
  border: 2px dashed ${props => props.$applied ? C.success : C.primary};
  overflow: visible;
  transition: all 0.35s ease;

  ${props => props.$applied && css`
    border-style: solid;
    background: ${C.successBg};
    animation: ${successPop} 0.45s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  `}
`;

// Decorative notch cutouts on sides
const Notch = styled.div`
  position: absolute;
  width: 22px;
  height: 22px;
  background: #f1f5f9;
  border-radius: 50%;
  top: 50%;
  transform: translateY(-50%);
  ${props => props.$side === 'left' ? 'left: -12px;' : 'right: -12px;'}
  border: 2px solid ${props => props.$applied ? C.success : C.primary};
  z-index: 2;
`;

// Top colorful header band
const CardBand = styled.div`
  background: linear-gradient(135deg, ${C.primary} 0%, ${C.primaryDark} 100%);
  padding: 0.85rem 1.25rem;
  border-radius: 13px 13px 0 0;
  display: flex;
  align-items: center;
  gap: 0.6rem;
  position: relative;
  overflow: hidden;

  &::after {
    content: '';
    position: absolute;
    inset: 0;
    background: linear-gradient(
      90deg,
      transparent 0%,
      rgba(255,255,255,0.08) 50%,
      transparent 100%
    );
    background-size: 400px 100%;
    animation: ${shimmer} 3s ease-in-out infinite;
  }

  svg { color: white; flex-shrink: 0; }
`;

const BandTitle = styled.span`
  font-size: 0.85rem;
  font-weight: 700;
  color: white;
  text-transform: uppercase;
  letter-spacing: 0.08em;
`;

const BandSubtitle = styled.span`
  font-size: 0.75rem;
  color: rgba(255,255,255,0.75);
  margin-left: auto;
`;

// Dashed divider line
const DashedDivider = styled.div`
  height: 1px;
  background: repeating-linear-gradient(
    90deg,
    ${props => props.$applied ? C.successBorder : C.peach} 0px,
    ${props => props.$applied ? C.successBorder : C.peach} 8px,
    transparent 8px,
    transparent 16px
  );
  margin: 0 1.25rem;
`;

// Body of the ticket
const CardBody = styled.div`
  padding: 1.1rem 1.25rem 1.25rem;
`;

// Input row
const InputRow = styled.div`
  display: flex;
  gap: 0.65rem;
  align-items: stretch;
`;

const InputWrap = styled.div`
  flex: 1;
  position: relative;
`;

const CouponInput = styled.input`
  width: 100%;
  padding: 0.8rem 1rem 0.8rem 2.5rem;
  border: 2px solid ${C.border};
  border-radius: 10px;
  font-size: 0.9rem;
  font-weight: 700;
  letter-spacing: 2.5px;
  text-transform: uppercase;
  color: ${C.text};
  background: ${C.cream};
  outline: none;
  transition: all 0.25s ease;
  font-family: 'Courier New', monospace;

  &::placeholder {
    font-weight: 400;
    letter-spacing: 1px;
    color: #a0aec0;
    font-family: 'Inter', sans-serif;
    text-transform: none;
    font-size: 0.85rem;
  }

  &:focus {
    border-color: ${C.primary};
    background: ${C.white};
    box-shadow: 0 0 0 3px rgba(165, 61, 30, 0.1);
  }
`;

const InputIcon = styled.div`
  position: absolute;
  left: 0.75rem;
  top: 50%;
  transform: translateY(-50%);
  color: ${C.primary};
  display: flex;
  align-items: center;
  opacity: 0.7;
`;

const ApplyBtn = styled.button`
  padding: 0.8rem 1.4rem;
  background: linear-gradient(135deg, ${C.primary} 0%, ${C.primaryDark} 100%);
  color: white;
  border: none;
  border-radius: 10px;
  font-size: 0.875rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.25s ease;
  display: flex;
  align-items: center;
  gap: 0.4rem;
  white-space: nowrap;
  letter-spacing: 0.03em;
  box-shadow: 0 4px 12px rgba(165, 61, 30, 0.3);

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 18px rgba(165, 61, 30, 0.4);
  }

  &:active:not(:disabled) {
    transform: translateY(0);
  }

  &:disabled {
    background: #cbd5e1;
    box-shadow: none;
    cursor: not-allowed;
  }

  .spin {
    animation: ${spin} 0.8s linear infinite;
  }
`;

// Error message
const ErrorBox = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 0.85rem;
  background: ${C.errorBg};
  border: 1px solid #fecaca;
  border-radius: 8px;
  color: ${C.error};
  font-size: 0.8rem;
  font-weight: 600;
  margin-top: 0.65rem;
  animation: ${fadeSlideIn} 0.25s ease-out;
`;

// Hint text below input
const HintRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  margin-top: 0.6rem;
  font-size: 0.75rem;
  color: ${C.muted};
`;

const HintDot = styled.span`
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: ${C.primaryLight};
  flex-shrink: 0;
`;

// ---- Applied coupon display ----
const AppliedInner = styled.div`
  display: flex;
  align-items: center;
  gap: 1rem;
`;

const SuccessCircle = styled.div`
  width: 48px;
  height: 48px;
  border-radius: 50%;
  background: linear-gradient(135deg, ${C.success}, #15803d);
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  flex-shrink: 0;
  animation: ${glowPulse} 2.5s ease-in-out infinite;
  box-shadow: 0 4px 12px rgba(22, 163, 74, 0.35);
`;

const AppliedInfo = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 2px;
`;

const AppliedTopRow = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
`;

const CodeBadge = styled.span`
  font-size: 0.95rem;
  font-weight: 800;
  letter-spacing: 2.5px;
  color: ${C.success};
  font-family: 'Courier New', monospace;
  background: ${C.successBorder};
  padding: 0.15rem 0.6rem;
  border-radius: 6px;
  text-transform: uppercase;
`;

const SavedBadge = styled.span`
  font-size: 0.78rem;
  font-weight: 700;
  color: white;
  background: linear-gradient(135deg, ${C.success}, #15803d);
  padding: 0.15rem 0.55rem;
  border-radius: 20px;
  letter-spacing: 0.02em;
`;

const AppliedDesc = styled.span`
  font-size: 0.78rem;
  color: ${C.muted};
  margin-top: 2px;
`;

const AppliedExpiry = styled.span`
  font-size: 0.72rem;
  color: #94a3b8;
`;

const RemoveBtn = styled.button`
  background: none;
  border: 1.5px solid #fca5a5;
  color: ${C.error};
  font-size: 0.75rem;
  font-weight: 700;
  cursor: pointer;
  padding: 0.4rem 0.85rem;
  border-radius: 8px;
  transition: all 0.2s ease;
  flex-shrink: 0;
  letter-spacing: 0.02em;

  &:hover {
    background: ${C.errorBg};
    border-color: ${C.error};
  }
`;

// Savings summary strip at the bottom
const SavingsStrip = styled.div`
  margin-top: 0.85rem;
  padding: 0.7rem 1rem;
  background: linear-gradient(135deg, rgba(22,163,74,0.07), rgba(22,163,74,0.03));
  border: 1px solid ${C.successBorder};
  border-radius: 10px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  animation: ${fadeSlideIn} 0.3s ease-out;
`;

const SavingsLabel = styled.span`
  font-size: 0.82rem;
  color: ${C.muted};
  font-weight: 500;
`;

const SavingsAmount = styled.span`
  font-size: 1rem;
  font-weight: 800;
  color: ${C.success};
`;

// ============================================
// COMPONENT
// ============================================
const CouponSection = ({ orderTotal, onApplyCoupon, theme }) => {
  const [couponCode, setCouponCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [activeCoupon, setActiveCoupon] = useState(null);

  const handleApply = async (e) => {
    e.preventDefault();
    if (!couponCode.trim()) { setError('Please enter a coupon code'); return; }

    setLoading(true);
    setError('');

    try {
      const snap = await getDocs(
        query(collection(db, 'coupons'), where('code', '==', couponCode.trim().toUpperCase()))
      );

      if (snap.empty) {
        setError('Invalid coupon code. Please check and try again.');
        onApplyCoupon?.(null);
        return;
      }

      const couponData = { id: snap.docs[0].id, ...snap.docs[0].data() };
      if (couponData.validFrom) couponData.validFrom = couponData.validFrom.toDate();
      if (couponData.validUntil) couponData.validUntil = couponData.validUntil.toDate();

      const now = new Date();

      if (couponData.status === 'inactive') { setError('This coupon is no longer active.'); onApplyCoupon?.(null); return; }
      if (couponData.validFrom && now < couponData.validFrom) {
        setError(`Coupon active from ${couponData.validFrom.toLocaleDateString()}.`);
        onApplyCoupon?.(null); return;
      }
      if (couponData.validUntil && now > couponData.validUntil) {
        setError(`This coupon expired on ${couponData.validUntil.toLocaleDateString()}.`);
        onApplyCoupon?.(null); return;
      }
      if (couponData.usageLimit && couponData.usageCount >= couponData.usageLimit) {
        setError('This coupon has reached its usage limit.'); onApplyCoupon?.(null); return;
      }
      if (couponData.minPurchase && orderTotal < couponData.minPurchase) {
        setError(`Minimum order of ₹${couponData.minPurchase} required.`); onApplyCoupon?.(null); return;
      }

      let discount = couponData.discountType === 'percentage'
        ? Math.min((orderTotal * couponData.discountValue) / 100, couponData.maxDiscount || Infinity)
        : Math.min(couponData.discountValue, orderTotal);

      const result = { ...couponData, calculatedDiscount: discount };
      setActiveCoupon(result);
      onApplyCoupon?.(result);
    } catch (err) {
      console.error(err);
      setError('Failed to apply coupon. Please try again.');
      onApplyCoupon?.(null);
    } finally {
      setLoading(false);
    }
  };

  const handleRemove = () => {
    setCouponCode('');
    setActiveCoupon(null);
    setError('');
    onApplyCoupon?.(null);
  };

  const formatDate = (date) => date ? new Date(date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '';

  return (
    <Wrapper>
      <TicketCard $applied={!!activeCoupon}>
        <Notch $side="left" $applied={!!activeCoupon} />
        <Notch $side="right" $applied={!!activeCoupon} />

        {/* Header band */}
        <CardBand>
          {activeCoupon ? <FiGift size={16} /> : <FiScissors size={16} />}
          <BandTitle>{activeCoupon ? 'Coupon Applied!' : 'Have a Coupon?'}</BandTitle>
          {!activeCoupon && <BandSubtitle>Save on your trek</BandSubtitle>}
        </CardBand>

        <DashedDivider $applied={!!activeCoupon} />

        <CardBody>
          {!activeCoupon ? (
            <>
              <InputRow>
                <InputWrap>
                  <InputIcon><FiTag size={14} /></InputIcon>
                  <CouponInput
                    type="text"
                    placeholder="Enter coupon code"
                    value={couponCode}
                    onChange={(e) => {
                      setCouponCode(e.target.value.toUpperCase());
                      if (error) setError('');
                    }}
                  />
                </InputWrap>
                <ApplyBtn
                  type="button"
                  onClick={handleApply}
                  disabled={loading || !couponCode.trim()}
                >
                  {loading
                    ? <FiLoader className="spin" size={16} />
                    : 'Apply'}
                </ApplyBtn>
              </InputRow>

              {error && (
                <ErrorBox>
                  <FiXCircle size={13} /> {error}
                </ErrorBox>
              )}

              <HintRow>
                <HintDot />
                Coupons are case-insensitive and applied at checkout
              </HintRow>
            </>
          ) : (
            <>
              <AppliedInner>
                <SuccessCircle>
                  <FiCheckCircle size={22} />
                </SuccessCircle>

                <AppliedInfo>
                  <AppliedTopRow>
                    <CodeBadge>{activeCoupon.code}</CodeBadge>
                    <SavedBadge>
                      {activeCoupon.discountType === 'percentage'
                        ? `${activeCoupon.discountValue}% OFF`
                        : `₹${activeCoupon.discountValue} OFF`}
                    </SavedBadge>
                  </AppliedTopRow>
                  {activeCoupon.description && (
                    <AppliedDesc>{activeCoupon.description}</AppliedDesc>
                  )}
                  {activeCoupon.validUntil && (
                    <AppliedExpiry>Expires {formatDate(activeCoupon.validUntil)}</AppliedExpiry>
                  )}
                </AppliedInfo>

                <RemoveBtn onClick={handleRemove}>Remove</RemoveBtn>
              </AppliedInner>

              <SavingsStrip>
                <SavingsLabel>🎉 Total discount applied</SavingsLabel>
                <SavingsAmount>− ₹{activeCoupon.calculatedDiscount?.toFixed(2)}</SavingsAmount>
              </SavingsStrip>
            </>
          )}
        </CardBody>
      </TicketCard>
    </Wrapper>
  );
};

export default CouponSection;