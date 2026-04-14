import React, { useState, useEffect, useCallback } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import { FiX, FiCalendar, FiUser, FiPhone, FiMessageSquare, FiCreditCard, FiCheck, FiAlertCircle, FiInfo, FiArrowLeft } from 'react-icons/fi';
import { processBookingPayment, completeBookingPayment, handleBookingPaymentFailure } from '../utils/bookingService';
import { loadRazorpayScript } from '../services/payment/razorpay';
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import CouponSection from './CouponSection';
import emailService from '../services/emailService';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

// ============================================
// ANIMATIONS (Same as your BookingModal)
// ============================================
const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(30px); }
  to { opacity: 1; transform: translateY(0); }
`;

const scaleIn = keyframes`
  from { opacity: 0; transform: scale(0.8) translateY(40px); }
  to { opacity: 1; transform: scale(1) translateY(0); }
`;

const slideInFromLeft = keyframes`
  from { opacity: 0; transform: translateX(-30px); }
  to { opacity: 1; transform: translateX(0); }
`;

const slideInFromRight = keyframes`
  from { opacity: 0; transform: translateX(30px); }
  to { opacity: 1; transform: translateX(0); }
`;

const shimmer = keyframes`
  0% { background-position: -200px 0; }
  100% { background-position: calc(200px + 100%) 0; }
`;

const pulse = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.02); }
`;

const bounceIn = keyframes`
  0% { opacity: 0; transform: scale(0.3); }
  50% { opacity: 1; transform: scale(1.05); }
  70% { transform: scale(0.9); }
  100% { opacity: 1; transform: scale(1); }
`;

const spin = keyframes`
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
`;

const successPulse = keyframes`
  0%, 100% { 
    transform: scale(1);
    box-shadow: 0 0 0 0 rgba(76, 175, 80, 0.7);
  }
  50% { 
    transform: scale(1.05);
    box-shadow: 0 0 0 10px rgba(76, 175, 80, 0);
  }
`;

const checkDraw = keyframes`
  0% { stroke-dashoffset: 100; }
  100% { stroke-dashoffset: 0; }
`;

const confetti = keyframes`
  0% { transform: translateY(0px) rotate(0deg); opacity: 1; }
  100% { transform: translateY(-100px) rotate(720deg); opacity: 0; }
`;

const slideInUp = keyframes`
  from { opacity: 0; transform: translateY(50px); }
  to { opacity: 1; transform: translateY(0); }
`;

const gradientShift = keyframes`
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
`;

// ============================================
// THEME
// ============================================
const theme = {
  primary: '#a53d1e',
  primaryDark: '#ed4c1b',
  primaryLight: '#FFAB91',
  secondary: '#12182f',
  accent: '#ff6b4d',
  success: '#4eab53',
  white: '#FFFFFF',
  cream: '#FFF8F0',
  peach: '#FFE4D6',
  lightGray: '#F5F5F5',
  mediumGray: '#E0E0E0',
  darkGray: '#546E7A',
  text: '#263238',
};

// ADD THESE after your existing styled components
const CalendarWrapper = styled.div`
  .react-datepicker {
    font-family: 'Inter', sans-serif;
    border: none;
    border-radius: 16px;
    overflow: hidden;
    box-shadow: 0 8px 30px rgba(0, 0, 0, 0.12);
    width: 100%;
    background: white;
  }

  .react-datepicker__month-container {
    width: 100%;
    float: none;
  }

  .react-datepicker__header {
    background: linear-gradient(135deg, ${theme.secondary} 0%, #455A64 100%);
    border-bottom: none;
    padding: 1rem 1rem 0.75rem;
    border-radius: 0;
  }

  .react-datepicker__current-month {
    color: white;
    font-size: 1rem;
    font-weight: 700;
    font-family: 'Inter', sans-serif;
    margin-bottom: 0.5rem;
  }

  .react-datepicker__navigation {
    top: 1rem;
  }

  .react-datepicker__navigation-icon::before {
    border-color: white;
  }

  .react-datepicker__navigation:hover .react-datepicker__navigation-icon::before {
    border-color: ${theme.primaryLight};
  }

  .react-datepicker__day-names {
    background: rgba(255, 255, 255, 0.1);
    margin: 0;
    padding: 0.25rem 0;
    display: flex;
    justify-content: space-around;
  }

  .react-datepicker__day-name {
    color: rgba(255, 255, 255, 0.8);
    font-size: 0.75rem;
    font-weight: 600;
    width: 2.2rem;
    line-height: 1.8rem;
    text-transform: uppercase;
    letter-spacing: 0.05em;
  }

  .react-datepicker__month {
    margin: 0;
    padding: 0.75rem;
    background: white;
  }

  .react-datepicker__week {
    display: flex;
    justify-content: space-around;
    margin-bottom: 0.25rem;
  }

  .react-datepicker__day {
    width: 2.2rem;
    height: 2.2rem;
    line-height: 2.2rem;
    border-radius: 50%;
    font-size: 0.875rem;
    font-weight: 500;
    font-family: 'Inter', sans-serif;
    color: ${theme.text};
    transition: all 0.2s ease;
    position: relative;
    margin: 0.1rem;
    display: inline-flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;

    &:hover {
      background: ${theme.peach};
      border-radius: 50%;
      color: ${theme.primary};
    }
  }

  .react-datepicker__day--selected {
    background: linear-gradient(135deg, ${theme.primary} 0%, ${theme.primaryDark} 100%) !important;
    color: white !important;
    border-radius: 50% !important;
    font-weight: 700 !important;
    box-shadow: 0 4px 12px rgba(165, 61, 30, 0.4) !important;

    &:hover {
      background: ${theme.primaryDark} !important;
    }
  }

  .react-datepicker__day--today {
    font-weight: 700;
    border: 2px solid ${theme.primary};
    border-radius: 50%;
    color: ${theme.primary};
  }

  .react-datepicker__day--disabled {
    color: #ccc !important;
    cursor: not-allowed !important;

    &:hover {
      background: transparent !important;
      color: #ccc !important;
    }
  }

  .react-datepicker__day--keyboard-selected {
    background: ${theme.peach};
    border-radius: 50%;
    color: ${theme.primary};
  }
`;

const DayWithDot = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 100%;
  height: 100%;
  gap: 1px;
`;

const DayNumber = styled.span`
  line-height: 1;
  font-size: 0.875rem;
`;

const DayDot = styled.span`
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: ${props => props.available ? '#4CAF50' : '#EF5350'};
  display: block;
  flex-shrink: 0;
`;

// ============================================
// STYLED COMPONENTS - PAGE LAYOUT
// ============================================
const PageContainer = styled.div`
  min-height: 100vh;
  background: linear-gradient(135deg, ${theme.cream} 0%, ${theme.white} 50%, ${theme.peach} 100%);
  padding: 0;
`;

const TopBar = styled.div`
  background: linear-gradient(135deg, ${theme.secondary} 0%, #455A64 100%);
  padding: 1rem 2rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  position: sticky;
  top: 0;
  z-index: 100;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.15);

  &::after {
    content: '';
    position: absolute;
    bottom: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, ${theme.primary}, ${theme.accent});
  }

  @media (max-width: 480px) {
    padding: 0.85rem 1rem;
  }
`;

const BackButton = styled.button`
  background: rgba(255, 255, 255, 0.15);
  border: 2px solid rgba(255, 255, 255, 0.3);
  cursor: pointer;
  font-size: 1.2rem;
  color: ${theme.white};
  width: 44px;
  height: 44px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);

  &:hover {
    background: ${theme.primary};
    border-color: ${theme.primary};
    transform: scale(1.1);
    box-shadow: 0 8px 25px rgba(255, 112, 67, 0.4);
  }
`;

const PageTitle = styled.h1`
  margin: 0;
  font-size: 1.6rem;
  font-weight: 700;
  color: ${theme.white};
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  letter-spacing: -0.025em;

  span {
    background: linear-gradient(135deg, ${theme.primaryLight} 0%, ${theme.accent} 100%);
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }

  @media (max-width: 480px) {
    font-size: 1.3rem;
  }
`;

const ContentContainer = styled.div`
  max-width: 900px;
  margin: 0 auto;
  padding: 2rem;
  animation: ${fadeIn} 0.5s ease-out;

  @media (max-width: 768px) {
    padding: 1.25rem;
  }

  @media (max-width: 480px) {
    padding: 1rem;
  }
`;

// ============================================
// ALL YOUR EXISTING STYLED COMPONENTS (from BookingModal)
// ============================================

const StepIndicator = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 2rem;
  animation: ${fadeIn} 0.6s ease-out 0.1s both;
`;

const Step = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  font-weight: 600;
  color: ${props => props.active ? theme.primary : theme.darkGray};
`;

const StepNumber = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: ${props => props.active 
    ? `linear-gradient(135deg, ${theme.primary} 0%, ${theme.primaryDark} 100%)` 
    : props.completed 
      ? `linear-gradient(135deg, ${theme.success} 0%, #43A047 100%)`
      : theme.lightGray};
  color: ${props => (props.active || props.completed) ? 'white' : theme.darkGray};
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.85rem;
  transition: all 0.3s ease;
  box-shadow: ${props => props.active ? '0 4px 12px rgba(255, 112, 67, 0.35)' : 'none'};
`;

const StepConnector = styled.div`
  width: 40px;
  height: 2px;
  background: ${props => props.completed 
    ? `linear-gradient(90deg, ${theme.success}, #43A047)` 
    : theme.mediumGray};
  transition: all 0.3s ease;
`;

const Form = styled.form`
  display: flex;
  flex-direction: column;
  gap: 1.75rem;
  animation: ${fadeIn} 0.6s ease-out 0.3s both;
`;

const FormGroup = styled.div`
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  position: relative;
`;

const Label = styled.label`
  font-weight: 600;
  font-size: 0.95rem;
  color: ${theme.secondary};
  display: flex;
  align-items: center;
  gap: 0.6rem;
  svg { color: ${theme.primary}; font-size: 1rem; }
`;

const Input = styled.input`
  padding: 0.9rem 1.1rem;
  border: 2px solid ${theme.mediumGray};
  border-radius: 10px;
  font-size: 0.95rem;
  font-weight: 500;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  outline: none;
  background: ${theme.white};
  color: ${theme.text};
  &::placeholder { color: #9E9E9E; font-weight: 400; }
  &:focus {
    border-color: ${theme.primary};
    box-shadow: 0 0 0 3px rgba(255, 112, 67, 0.12), 0 2px 8px rgba(255, 112, 67, 0.15);
  }
  &:hover:not(:focus):not(:disabled) { border-color: ${theme.primaryLight}; }
  &:disabled { background: ${theme.lightGray}; color: ${theme.darkGray}; }
`;

const Textarea = styled(Input).attrs({ as: 'textarea' })`
  resize: vertical;
  min-height: 100px;
`;

const FirstRow = styled.div`
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 1.5rem;
  margin-bottom: 1rem;
  animation: ${slideInFromLeft} 0.6s ease-out;
  align-items: start;

  @media (max-width: 768px) {
    grid-template-columns: 1fr;
    gap: 1.25rem;
  }
`;

const TrekImageContainer = styled.div`
  position: relative;
  border-radius: 16px;
  overflow: hidden;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  align-self: start;

  &::after {
    content: '';
    position: absolute;
    bottom: 0; left: 0; right: 0;
    height: 60%;
    background: linear-gradient(to top, rgba(0,0,0,0.6), transparent);
    pointer-events: none;
  }
`;

const TrekImageLarge = styled.img`
  width: 100%;
  height: 220px;
  object-fit: cover;
  transition: transform 0.4s ease;
  ${TrekImageContainer}:hover & { transform: scale(1.05); }
  @media (max-width: 768px) { height: 180px; }
`;

const TrekImageOverlay = styled.div`
  position: absolute;
  bottom: 0; left: 0; right: 0;
  padding: 1rem;
  z-index: 2;
  color: white;
  h3 { margin: 0 0 0.25rem 0; font-size: 1.1rem; font-weight: 700; }
  p { margin: 0; font-size: 0.85rem; opacity: 0.9; display: flex; align-items: center; gap: 0.3rem; }
`;

const RightColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

const InteractiveCard = styled.div`
  background: ${props => props.isOpen 
    ? `linear-gradient(135deg, ${theme.white} 0%, ${theme.peach} 100%)`
    : `linear-gradient(135deg, ${theme.white} 0%, ${theme.cream} 100%)`};
  padding: 1.25rem;
  border-radius: 14px;
  border: 2px solid ${props => props.isOpen ? theme.primary : theme.peach};
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  box-shadow: ${props => props.isOpen 
    ? `0 8px 25px rgba(255, 112, 67, 0.2)` 
    : `0 2px 8px rgba(0, 0, 0, 0.06)`};

  &:hover {
    border-color: ${theme.primary};
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(255, 112, 67, 0.15);
  }
`;

const CardHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
`;

const CardLabel = styled.div`
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 0.85rem;
  font-weight: 600;
  color: ${theme.darkGray};
  text-transform: uppercase;
  letter-spacing: 0.05em;
  svg { color: ${theme.primary}; font-size: 1rem; }
`;

const CardValue = styled.div`
  font-size: 1.15rem;
  font-weight: 700;
  color: ${theme.text};
  margin-top: 0.5rem;
  display: flex;
  align-items: center;
  justify-content: space-between;
`;

const CardArrow = styled.div`
  color: ${theme.primary};
  font-size: 1.2rem;
  transition: transform 0.3s ease;
  transform: ${props => props.isOpen ? 'rotate(180deg)' : 'rotate(0deg)'};
`;

const CardDropdown = styled.div`
  max-height: ${props => props.isOpen ? '400px' : '0'};
  opacity: ${props => props.isOpen ? '1' : '0'};
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  margin-top: ${props => props.isOpen ? '1rem' : '0'};
  padding-top: ${props => props.isOpen ? '1rem' : '0'};
  border-top: ${props => props.isOpen ? `1px solid ${theme.peach}` : 'none'};
`;

const ParticipantGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(5, 1fr);
  gap: 0.5rem;
`;

const ParticipantOption = styled.button`
  padding: 0.75rem 0.5rem;
  background: ${props => props.selected 
    ? `linear-gradient(135deg, ${theme.primary} 0%, ${theme.primaryDark} 100%)` 
    : theme.white};
  color: ${props => props.selected ? 'white' : theme.text};
  border: 2px solid ${props => props.selected ? theme.primary : theme.mediumGray};
  border-radius: 10px;
  font-size: 1rem;
  font-weight: 700;
  cursor: pointer;
  transition: all 0.2s ease;

  &:hover {
    background: ${props => props.selected 
      ? `linear-gradient(135deg, ${theme.primaryDark} 0%, #E64A19 100%)` 
      : theme.peach};
    border-color: ${theme.primary};
    transform: scale(1.05);
  }
`;

const SelectedBadge = styled.span`
  background: linear-gradient(135deg, ${theme.primary}, ${theme.accent});
  color: white;
  padding: 0.25rem 0.6rem;
  border-radius: 20px;
  font-size: 0.7rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.03em;
`;

const DetailBox = styled.div`
  background: ${props => props.isExpanded 
    ? `linear-gradient(135deg, ${theme.peach} 0%, ${theme.white} 100%)`
    : theme.white};
  padding: ${props => props.isExpanded ? '1.5rem' : '1.25rem'};
  border-radius: 14px;
  border: 2px solid ${props => props.isExpanded ? theme.primary : theme.mediumGray};
  margin-bottom: 0.75rem;
  cursor: ${props => props.isExpanded ? 'default' : 'pointer'};
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  box-shadow: ${props => props.isExpanded 
    ? `0 10px 30px rgba(255, 112, 67, 0.15)` 
    : `0 2px 6px rgba(0, 0, 0, 0.04)`};

  ${props => props.isExpanded && css`
    &::before {
      content: '';
      position: absolute;
      top: 0; left: 0; right: 0;
      height: 3px;
      background: linear-gradient(90deg, ${theme.primary}, ${theme.accent});
      border-radius: 14px 14px 0 0;
    }
  `}

  &:hover:not([data-expanded="true"]) {
    border-color: ${theme.primaryLight};
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(255, 112, 67, 0.12);
  }

  ${props => props.isDisabled && css`
    opacity: 0.5;
    pointer-events: none;
  `}
`;

const DetailBoxHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${props => props.isExpanded ? '1.25rem' : '0'};
`;

const DetailBoxTitle = styled.h3`
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: ${theme.text};
  display: flex;
  align-items: center;
  gap: 0.6rem;
  svg { color: ${theme.primary}; }
`;

const StatusDot = styled.span`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${props => props.completed ? theme.success : theme.mediumGray};
  margin-left: 0.5rem;
`;

const DetailBoxContent = styled.div`
  max-height: ${props => props.isExpanded ? '800px' : '0'};
  opacity: ${props => props.isExpanded ? '1' : '0'};
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
`;

const FieldRow = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1rem;
  margin-top: 0.75rem;
  @media (max-width: 480px) {
    grid-template-columns: 1fr;
    gap: 0.75rem;
  }
`;

const DoneButton = styled.button`
  background: linear-gradient(135deg, ${theme.primary} 0%, ${theme.primaryDark} 100%);
  color: white;
  border: none;
  padding: 0.7rem 1.5rem;
  border-radius: 10px;
  font-weight: 600;
  font-size: 0.9rem;
  cursor: pointer;
  transition: all 0.3s ease;
  margin-top: 1.25rem;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  box-shadow: 0 4px 12px rgba(255, 112, 67, 0.3);

  &:hover:not(:disabled) {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(255, 112, 67, 0.4);
  }
  &:disabled {
    background: ${theme.mediumGray};
    box-shadow: none;
    cursor: not-allowed;
  }
`;

const ErrorSpan = styled.span`
  color: #E53935;
  font-size: 0.8rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.3rem;
  margin-top: 0.4rem;

  &::before {
    content: '!';
    background: #E53935;
    color: white;
    width: 14px;
    height: 14px;
    border-radius: 50%;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    font-size: 0.7rem;
    font-weight: 700;
  }
`;

// Step 2 - Payment styled components
const SecurePaymentBanner = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  padding: 0.75rem;
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.06) 0%, rgba(5, 150, 105, 0.04) 100%);
  border: 1px solid rgba(16, 185, 129, 0.15);
  border-radius: 12px;
  font-size: 0.85rem;
  font-weight: 600;
  color: #059669;
  margin-bottom: 1rem;
  animation: ${fadeIn} 0.5s ease-out;
  svg { font-size: 1rem; }
`;

const BookingSummaryCard = styled.div`
  background: linear-gradient(135deg, hsla(0, 0%, 98%, 0.04) 0%, rgba(194, 27, 21, 0.04) 100%);
  padding: 1.5rem;
  border-radius: 16px;
  border: 2px solid rgba(9, 10, 10, 0.12);
  margin-bottom: 1rem;
`;

const SummaryHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid #383a3ccb;
`;

const SectionIcon = styled.div`
  width: 40px;
  height: 40px;
  border-radius: 12px;
  background: ${props => props.variant === 'green' 
    ? 'linear-gradient(135deg, #4CAF50 0%, #388E3C 100%)' 
    : props.variant === 'black'
      ? `linear-gradient(135deg, ${theme.secondary} 0%, ${theme.darkGray} 100%)`
      : `linear-gradient(135deg, ${theme.primary} 0%, ${theme.primaryDark} 100%)`};
  display: flex;
  align-items: center;
  justify-content: center;
  color: white;
  font-size: 1.1rem;
  flex-shrink: 0;
`;

const SummaryTitle = styled.h3`
  margin: 0;
  font-size: 1.1rem;
  font-weight: 700;
  color: #0d0d0e;
`;

const SummaryGrid = styled.div`
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 0.75rem;
  @media (max-width: 480px) { grid-template-columns: 1fr; }
`;

const SummaryItem = styled.div`
  font-size: 0.9rem;
  color: #475569;
  font-weight: 500;
  strong { color: #070707; font-weight: 600; }
`;

const ParticipantChip = styled.div`
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.35rem 0.75rem;
  background: ${props => props.isPrimary 
    ? 'linear-gradient(135deg, rgba(192, 110, 104, 0.1), rgba(179, 131, 89, 0.1))' 
    : '#f1f5f9'};
  border-radius: 20px;
  font-size: 0.8rem;
  font-weight: 600;
  color: ${props => props.isPrimary ? '#000000' : '#475569'};
  border: 1px solid ${props => props.isPrimary 
    ? 'rgba(51, 153, 204, 0.2)' 
    : 'rgba(226, 232, 240, 0.8)'};
  margin: 0.25rem 0.25rem 0.25rem 0;
`;

const PriceSummary = styled.div`
  margin-top: 1.5rem;
  background: linear-gradient(135deg, rgba(0, 0, 0, 0.05) 0%, rgba(0, 180, 219, 0.05) 100%);
  padding: 1.75rem;
  border-radius: 16px;
  border: 2px solid rgba(51, 153, 204, 0.15);
  position: relative;
  overflow: hidden;
  animation: ${fadeIn} 0.6s ease-out 0.4s both;

  &::before {
    content: '';
    position: absolute;
    top: 0; left: 0; right: 0;
    height: 3px;
    background: linear-gradient(90deg, #3399cc, #00b4db, #3399cc);
    background-size: 200% 100%;
    animation: ${shimmer} 2s infinite linear;
  }
`;

const PriceItem = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.75rem 0;
  font-size: 1.1rem;
  font-weight: 500;
  color: #060606;
  &:not(:last-child) { border-bottom: 1px solid rgba(51, 153, 204, 0.1); }
`;

const PriceTotal = styled(PriceItem)`
  margin-top: 0.75rem;
  padding-top: 1.25rem;
  border-top: 2px solid rgba(241, 8, 8, 0.2);
  font-weight: 700;
  font-size: 1.4rem;
  color: #09090a;
  background: linear-gradient(135deg, rgba(207, 152, 57, 0.08) 0%, rgba(208, 104, 78, 0.08) 100%);
  margin: 0.75rem -1.75rem -1.75rem;
  padding: 1.25rem 1.75rem;
  border-radius: 0 0 14px 14px;

  span:last-child {
    background: linear-gradient(135deg, #d6410b 0%, #ac452f 100%);
    background-clip: text;
    -webkit-background-clip: text;
    -webkit-text-fill-color: transparent;
  }
`;
// ADD THESE styled components with your others:

const ParticipantCounterWrapper = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0;
  background: ${theme.white};
  border: 2px solid ${theme.mediumGray};
  border-radius: 14px;
  overflow: hidden;
  margin-top: 0.5rem;
  box-shadow: 0 2px 8px rgba(0,0,0,0.06);
`;

const CounterButton = styled.button`
  width: 52px;
  height: 54px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: ${props => props.disabled
    ? theme.lightGray
    : `linear-gradient(135deg, ${theme.primary} 0%, ${theme.primaryDark} 100%)`};
  border: none;
  cursor: ${props => props.disabled ? 'not-allowed' : 'pointer'};
  transition: all 0.2s ease;
  font-size: 1.5rem;
  font-weight: 500;
  color: ${props => props.disabled ? theme.darkGray : 'white'};
  flex-shrink: 0;
  line-height: 1;
  border-radius:50%;

  &:hover:not(:disabled) {
    background: linear-gradient(135deg, ${theme.primaryDark} 0%, #E64A19 100%);
    transform: scale(1.05);
  }

  &:active:not(:disabled) {
    transform: scale(0.97);
  }
`;

const CounterDisplay = styled.div`
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0.5rem 1rem;
  min-width: 80px;
`;

const CounterNumber = styled.span`
  font-size: 1.8rem;
  font-weight: 700;
  color: ${theme.text};
  line-height: 1;
`;

const CounterLabel = styled.span`
  font-size: 0.75rem;
  color: ${theme.darkGray};
  font-weight: 500;
  margin-top: 2px;
`;

const CounterInfoRow = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 0.75rem;
  padding: 0.5rem 0.75rem;
  background: ${theme.cream};
  border-radius: 8px;
  font-size: 0.8rem;
  color: ${theme.darkGray};
  font-weight: 500;

  span {
    color: ${theme.primary};
    font-weight: 700;
  }
`;   


const ErrorMessage = styled.div`
  color: #dc2626;
  background: linear-gradient(135deg, rgba(239, 68, 68, 0.1) 0%, rgba(220, 38, 38, 0.05) 100%);
  border: 2px solid rgba(239, 68, 68, 0.2);
  padding: 1.25rem;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 1rem;
  animation: ${bounceIn} 0.5s ease-out;
  svg { color: #dc2626; font-size: 1.25rem; flex-shrink: 0; }
`;

const SuccessMessage = styled.div`
  color: #059669;
  background: linear-gradient(135deg, rgba(16, 185, 129, 0.1) 0%, rgba(5, 150, 105, 0.05) 100%);
  border: 2px solid rgba(16, 185, 129, 0.2);
  padding: 1.25rem;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 500;
  display: flex;
  align-items: flex-start;
  gap: 1rem;
  animation: ${bounceIn} 0.5s ease-out;
  svg { color: #059669; font-size: 1.25rem; flex-shrink: 0; margin-top: 2px; }
`;

// Footer buttons
const FooterContainer = styled.div`
  max-width: 900px;
  margin: 0 auto;
  padding: 1.5rem 2rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
  background: ${theme.white};
  border-top: 2px solid ${theme.peach};
  position: sticky;
  bottom: 0;
  z-index: 50;

  @media (max-width: 480px) {
    flex-direction: column-reverse;
    padding: 1.25rem;
    gap: 0.75rem;
  }
`;

const Button = styled.button`
  padding: 1rem 2rem;
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.75rem;
  position: relative;
  overflow: hidden;

  &::before {
    content: '';
    position: absolute;
    top: 0; left: -100%;
    width: 100%; height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    transition: left 0.5s ease;
  }
  &:hover::before { left: 100%; }
  @media (max-width: 480px) { width: 100%; }
`;

const CancelButton = styled(Button)`
  background: ${theme.white};
  border: 2px solid ${theme.mediumGray};
  color: ${theme.darkGray};
  min-width: 120px;
  &:hover { background: ${theme.lightGray}; border-color: ${theme.darkGray}; color: ${theme.text}; }
`;

const ProceedButton = styled(Button)`
  background: linear-gradient(135deg, ${theme.primary} 0%, ${theme.primaryDark} 100%);
  border: none;
  color: white;
  min-width: 180px;
  box-shadow: 0 4px 15px rgba(255, 112, 67, 0.35);
  &:hover {
    background: linear-gradient(135deg, ${theme.primaryDark} 0%, #E64A19 100%);
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(255, 112, 67, 0.45);
  }
  &:disabled { background: ${theme.mediumGray}; box-shadow: none; }
`;

const PaymentButton = styled(ProceedButton)`
  background: linear-gradient(135deg, #db392d 0%, #3b443b 100%);
  box-shadow: 0 4px 15px rgba(76, 175, 80, 0.4);
  &:hover {
    background: linear-gradient(135deg, #388E3C 0%, #2E7D32 100%);
    box-shadow: 0 8px 25px rgba(76, 175, 80, 0.6);
  }
`;

const LoadingIndicator = styled.div`
  display: inline-block;
  width: 1.25rem;
  height: 1.25rem;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: #ffffff;
  animation: ${spin} 1s linear infinite;
`;

// Overlays
const ProcessingOverlay = styled.div`
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: linear-gradient(135deg, 
    rgba(51, 153, 204, 0.95) 0%, 
    rgba(0, 180, 219, 0.95) 50%,
    rgba(76, 175, 80, 0.95) 100%);
  background-size: 400% 400%;
  animation: ${gradientShift} 3s ease infinite;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  color: white;
`;

const ProcessingContent = styled.div`
  text-align: center;
  animation: ${slideInUp} 0.8s ease-out;
`;

const ProcessingSpinner = styled.div`
  width: 80px;
  height: 80px;
  border: 6px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top: 6px solid #ffffff;
  animation: ${spin} 1s linear infinite;
  margin: 0 auto 2rem;
`;

const ProcessingTitle = styled.h2`
  font-size: 2rem;
  font-weight: 700;
  margin: 0 0 1rem 0;
  animation: ${pulse} 2s ease-in-out infinite;
`;

const ProcessingSubtitle = styled.p`
  font-size: 1.1rem;
  opacity: 0.9;
  margin: 0;
`;

const EnhancedSuccessMessage = styled.div`
  background: linear-gradient(135deg, #4caf50 0%, #81c784 100%);
  color: white;
  padding: 2rem;
  border-radius: 20px;
  text-align: center;
  position: relative;
  overflow: hidden;
  box-shadow: 0 10px 30px rgba(76, 175, 80, 0.3);
  animation: ${successPulse} 2s ease-in-out infinite;
`;

const SuccessIcon = styled.div`
  width: 80px;
  height: 80px;
  border: 4px solid white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1.5rem;
  background: rgba(255, 255, 255, 0.2);
  animation: ${bounceIn} 1s ease-out;
`;

const SuccessTitle = styled.h3`
  font-size: 1.8rem;
  font-weight: 700;
  margin: 0 0 0.5rem 0;
`;

const SuccessSubtitle = styled.p`
  font-size: 1.1rem;
  opacity: 0.9;
  margin: 0;
`;

const ConfettiContainer = styled.div`
  position: absolute;
  top: 0; left: 0; right: 0; bottom: 0;
  pointer-events: none;
  overflow: hidden;
`;

const ConfettiParticle = styled.div`
  position: absolute;
  width: 8px;
  height: 8px;
  background: ${props => props.color || '#ffeb3b'};
  border-radius: 50%;
  animation: ${confetti} 3s linear infinite;
  animation-delay: ${props => props.delay || '0s'};
  top: ${props => props.top || '50%'};
  left: ${props => props.left || '50%'};
`;

const CouponSuccessDiv = styled.div`
  margin-top: 1rem;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 10px;
  animation: ${fadeIn} 1s ease-out 1s both;
`;

// Unavailable date popup styled components
const UnavailableDateOverlay = styled.div`
  position: fixed;
  top: 0; left: 0; right: 0; bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 1rem;
  animation: ${fadeIn} 0.3s ease-out;
  @media (max-width: 480px) { padding: 0; align-items: flex-end; }
`;

const UnavailableDatePopup = styled.div`
  background: ${theme.white};
  border-radius: 20px;
  width: 100%;
  max-width: 450px;
  overflow: hidden;
  box-shadow: 0 25px 50px rgba(0, 0, 0, 0.25);
  animation: ${bounceIn} 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  @media (max-width: 480px) {
    max-width: 100%;
    border-radius: 20px 20px 0 0;
    animation: ${slideInUp} 0.4s ease-out;
  }
`;

const PopupHeader = styled.div`
  background: linear-gradient(135deg, #E53935 0%, #C62828 100%);
  padding: 1.5rem;
  text-align: center;
  position: relative;
  &::after {
    content: '';
    position: absolute;
    bottom: -10px; left: 50%;
    transform: translateX(-50%);
    width: 0; height: 0;
    border-left: 12px solid transparent;
    border-right: 12px solid transparent;
    border-top: 12px solid #C62828;
  }
`;

const PopupIconContainer = styled.div`
  width: 60px;
  height: 60px;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin: 0 auto 1rem;
  animation: ${pulse} 2s ease-in-out infinite;
  svg { font-size: 1.8rem; color: white; }
`;

const PopupTitle = styled.h3`
  margin: 0;
  color: white;
  font-size: 1.3rem;
  font-weight: 700;
`;

const PopupBody = styled.div`
  padding: 2rem 1.5rem 1.5rem;
  overflow-y: auto;
`;

const PopupDateDisplay = styled.div`
  background: linear-gradient(135deg, #FFF3E0 0%, #FFE0B2 100%);
  border: 2px solid #FF9800;
  border-radius: 12px;
  padding: 1rem;
  text-align: center;
  margin-bottom: 1.5rem;
  animation: ${bounceIn} 0.4s ease-out;
  .date-label { font-size: 0.8rem; color: #E65100; font-weight: 600; text-transform: uppercase; margin-bottom: 0.25rem; }
  .date-value { font-size: 1.1rem; color: #BF360C; font-weight: 700; }
`;

const PopupMessage = styled.p`
  color: ${theme.text};
  font-size: 1rem;
  line-height: 1.6;
  margin: 0 0 1.5rem;
  text-align: center;
`;

const AvailableDatesSection = styled.div`
  margin-top: 1rem;
`;

const AvailableDatesTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  font-weight: 700;
  color: ${theme.primary};
  margin-bottom: 1rem;
  svg { color: ${theme.success}; }
`;

const AvailableDatesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem;
  max-height: 200px;
  overflow-y: auto;
`;

const AvailableDateButton = styled.button`
  padding: 0.75rem 1rem;
  background: ${theme.white};
  border: 2px solid ${theme.mediumGray};
  border-radius: 10px;
  font-size: 0.85rem;
  font-weight: 600;
  color: ${theme.text};
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: left;
  .day { display: block; font-size: 0.95rem; font-weight: 700; color: ${theme.primary}; }
  .full-date { display: block; font-size: 0.8rem; color: ${theme.darkGray}; margin-top: 2px; }
  &:hover {
    background: linear-gradient(135deg, ${theme.primary} 0%, ${theme.primaryDark} 100%);
    border-color: ${theme.primary};
    transform: translateY(-2px);
    .day, .full-date { color: white; }
  }
`;

const AvailableMonthsSection = styled.div`
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 2px dashed ${theme.mediumGray};
`;

const AvailableMonthsTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  font-weight: 700;
  color: ${theme.secondary};
  margin-bottom: 1rem;
  svg { color: ${theme.primary}; }
`;

const MonthsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
`;

const MonthBadge = styled.div`
  padding: 0.6rem 0.75rem;
  background: ${props => props.isCurrentMonth 
    ? `linear-gradient(135deg, ${theme.primary} 0%, ${theme.primaryDark} 100%)`
    : `linear-gradient(135deg, ${theme.cream} 0%, ${theme.peach} 100%)`};
  border: 2px solid ${props => props.isCurrentMonth ? theme.primary : theme.primaryLight};
  border-radius: 10px;
  text-align: center;
  font-size: 0.85rem;
  font-weight: 600;
  color: ${props => props.isCurrentMonth ? 'white' : theme.text};
  .month-name { display: block; font-weight: 700; }
  .month-status { display: block; font-size: 0.7rem; margin-top: 2px; opacity: 0.8; }
`;

const MonthsHelpText = styled.div`
  margin-top: 1rem;
  padding: 0.75rem 1rem;
  background: linear-gradient(135deg, rgba(33, 150, 243, 0.08) 0%, rgba(33, 150, 243, 0.04) 100%);
  border: 1px solid rgba(33, 150, 243, 0.2);
  border-radius: 10px;
  font-size: 0.85rem;
  color: #1565C0;
  display: flex;
  align-items: flex-start;
  gap: 0.5rem;
  svg { flex-shrink: 0; margin-top: 2px; }
`;

const NoAvailableDatesMessage = styled.div`
  background: linear-gradient(135deg, #FFEBEE 0%, #FFCDD2 100%);
  border: 2px solid #EF5350;
  border-radius: 12px;
  padding: 1.25rem;
  text-align: center;
  color: #C62828;
  font-weight: 600;
  svg { display: block; margin: 0 auto 0.5rem; font-size: 1.5rem; }
`;

const PopupFooter = styled.div`
  padding: 1rem 1.5rem 1.5rem;
  display: flex;
  gap: 0.75rem;
  @media (max-width: 480px) { flex-direction: column-reverse; padding: 1rem; }
`;

const PopupButton = styled.button`
  flex: 1;
  padding: 0.9rem 1.25rem;
  border-radius: 10px;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
`;

const ClosePopupButton = styled(PopupButton)`
  background: ${theme.lightGray};
  border: 2px solid ${theme.mediumGray};
  color: ${theme.darkGray};
  &:hover { background: ${theme.mediumGray}; color: ${theme.text}; }
`;

const ChooseAnotherButton = styled(PopupButton)`
  background: linear-gradient(135deg, ${theme.primary} 0%, ${theme.primaryDark} 100%);
  border: none;
  color: white;
  box-shadow: 0 4px 12px rgba(255, 112, 67, 0.3);
  &:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(255, 112, 67, 0.4); }
`;

// Loading state for fetching trek
const LoadingContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  gap: 1.5rem;
`;

const LoadingSpinner = styled.div`
  width: 60px;
  height: 60px;
  border: 5px solid ${theme.peach};
  border-radius: 50%;
  border-top: 5px solid ${theme.primary};
  animation: ${spin} 1s linear infinite;
`;

const LoadingText = styled.p`
  font-size: 1.1rem;
  color: ${theme.darkGray};
  font-weight: 500;
`;

const ErrorContainer = styled.div`
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 60vh;
  gap: 1.5rem;
  text-align: center;
  padding: 2rem;
`;

const ErrorTitle = styled.h2`
  color: ${theme.text};
  font-size: 1.5rem;
`;

const ErrorText = styled.p`
  color: ${theme.darkGray};
  font-size: 1rem;
`;

const GoBackButton = styled(Button)`
  background: linear-gradient(135deg, ${theme.primary} 0%, ${theme.primaryDark} 100%);
  border: none;
  color: white;
  margin-top: 1rem;
`;

// ============================================
// MAIN COMPONENT
// ============================================
const BookingPage = () => {
  const navigate = useNavigate();
  const { id } = useParams(); // trek ID from URL
  const location = useLocation();

  // Trek data - can come from route state or fetched from Firestore
  const [trek, setTrek] = useState(location.state?.trek || null);
  const [loading, setLoading] = useState(!location.state?.trek);
  const [fetchError, setFetchError] = useState(null);
  // ✅ ADD this with your other useState declarations:
const [calendarOpenDate, setCalendarOpenDate] = useState(null);

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    startDate: '',
    totalParticipants: 1,
    specialRequests: ''
  });

  const [primaryBooker, setPrimaryBooker] = useState({
    name: '',
    email: '',
    contactNumber: ''
  });

  const [participants, setParticipants] = useState([
    {
      participantId: 'p1',
      name: '',
      email: '',
      age: '',
      emergencyContact: '',
      isPrimaryBooker: true
    }
  ]);

  const [errors, setErrors] = useState({});
  const [bookingId, setBookingId] = useState(null);
  const [paymentError, setPaymentError] = useState(null);
  const [paymentSuccess, setPaymentSuccess] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isProcessingBooking, setIsProcessingBooking] = useState(false);
  const [showSuccessAnimation, setShowSuccessAnimation] = useState(false);

  const [activeCoupon, setActiveCoupon] = useState(null);
  const [originalAmount, setOriginalAmount] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);

  const [isDateCardOpen, setIsDateCardOpen] = useState(false);
  const [isParticipantCardOpen, setIsParticipantCardOpen] = useState(false);
  const [currentExpandedBox, setCurrentExpandedBox] = useState(null);
  const [completedBoxes, setCompletedBoxes] = useState(new Set());
  const [selectedDateFormatted, setSelectedDateFormatted] = useState('');

  const [showUnavailableDatePopup, setShowUnavailableDatePopup] = useState(false);
  const [selectedUnavailableDate, setSelectedUnavailableDate] = useState(null);

  const today = new Date();

  // ============================================
  // FETCH TREK DATA if not passed via route state
  // ============================================
  useEffect(() => {
    const fetchTrek = async () => {
      if (trek) {
        setLoading(false);
        return;
      }

      try {
        setLoading(true);
        const trekDoc = await getDoc(doc(db, 'treks', id));
        if (trekDoc.exists()) {
          setTrek({ id: trekDoc.id, ...trekDoc.data() });
        } else {
          setFetchError('Trek not found');
        }
      } catch (error) {
        console.error('Error fetching trek:', error);
        setFetchError('Failed to load trek details');
      } finally {
        setLoading(false);
      }
    };

    fetchTrek();
  }, [id, trek]);

  // ============================================
  // FETCH USER DATA + LOAD RAZORPAY
  // ============================================
  useEffect(() => {
    const getCurrentUser = async () => {
      if (auth.currentUser) {
        let userProfileData = {};
        try {
          const userDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
          if (userDoc.exists()) {
            userProfileData = userDoc.data();
          }
        } catch (error) {
          console.warn('Could not fetch user profile:', error);
        }

        const bookerInfo = {
          name: auth.currentUser.displayName || userProfileData.name || userProfileData.firstName || '',
          email: auth.currentUser.email || userProfileData.email || '',
          contactNumber: userProfileData.phone || userProfileData.phoneNumber || userProfileData.contactNumber || auth.currentUser.phoneNumber || '',
        };

        setPrimaryBooker(bookerInfo);
        setParticipants([
          {
            participantId: 'p1',
            name: bookerInfo.name,
            email: bookerInfo.email,
            age: userProfileData.age || '',
            emergencyContact: bookerInfo.contactNumber,
            isPrimaryBooker: true
          }
        ]);
      } else {
        // If user is not logged in, redirect to login
        navigate('/login', { state: { redirectTo: `/booking/${id}` } });
      }
    };

    if (trek) {
      getCurrentUser();

      setActiveCoupon(null);
      setDiscountAmount(0);

      const basePrice = trek?.numericPrice || parseInt(trek?.price?.replace(/[^0-9]/g, '')) || 0;
      setOriginalAmount(basePrice);

      loadRazorpayScript().catch(err => {
        console.error("Failed to load Razorpay script:", err);
        setPaymentError("Failed to load payment gateway. Please try again.");
      });
    }
  }, [trek, id, navigate]);

  // ============================================
  // HELPER FUNCTIONS (same as BookingModal)
  // ============================================

  // ✅ ADD this new helper function with your other helpers:
const getFirstAvailableDate = useCallback(() => {
  const todayDate = new Date();
  todayDate.setHours(0, 0, 0, 0);

  // If trek has specific available dates
  if (
    trek?.availableDates &&
    Array.isArray(trek.availableDates) &&
    trek.availableDates.length > 0
  ) {
    const futureDates = trek.availableDates
      .filter(dateStr => {
        const d = new Date(dateStr);
        d.setHours(0, 0, 0, 0);
        return d >= todayDate;
      })
      .sort((a, b) => new Date(a) - new Date(b));

    if (futureDates.length > 0) {
      return new Date(futureDates[0]); // return Date object
    }
  }

  // If trek has available months
  if (
    trek?.availableMonths &&
    Array.isArray(trek.availableMonths) &&
    trek.availableMonths.length > 0
  ) {
    const currentMonth = todayDate.getMonth();
    const currentYear = todayDate.getFullYear();

    // Find the next available month
    const sortedMonths = [...trek.availableMonths].sort((a, b) => a - b);

    // Check if any available month is current or future this year
    const nextMonth = sortedMonths.find(m => m >= currentMonth);

    if (nextMonth !== undefined) {
      // Return first day of that month
      const targetDate = new Date(currentYear, nextMonth, 1);
      // If it's the current month, return today
      if (nextMonth === currentMonth) return todayDate;
      return targetDate;
    } else {
      // All months are in the past this year, go to next year
      const firstMonth = sortedMonths[0];
      return new Date(currentYear + 1, firstMonth, 1);
    }
  }

  // Default: return today
  return todayDate;
}, [trek]);






  const isDateAvailable = useCallback((dateString) => {
    const date = new Date(dateString);
    if (date < today) return false;

    if (trek?.availableDates && Array.isArray(trek.availableDates) && trek.availableDates.length > 0) {
      const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      return trek.availableDates.includes(formattedDate);
    }

    if (trek?.availableMonths && Array.isArray(trek.availableMonths) && trek.availableMonths.length > 0) {
      return trek.availableMonths.includes(date.getMonth());
    }

    return true;
  }, [today, trek]);

  const formatDateForDisplay = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  };

  const formatDateForPopup = (dateStr) => {
    const date = new Date(dateStr);
    return {
      day: date.toLocaleDateString('en-US', { weekday: 'short' }),
      full: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
    };
  };

  const getFutureAvailableDates = () => {
    if (!trek?.availableDates || !Array.isArray(trek.availableDates)) return [];
    const todayDate = new Date();
    todayDate.setHours(0, 0, 0, 0);
    return trek.availableDates
      .filter(dateStr => new Date(dateStr) >= todayDate)
      .sort((a, b) => new Date(a) - new Date(b))
      .slice(0, 6);
  };

  const getAvailableMonths = () => {
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
      'July', 'August', 'September', 'October', 'November', 'December'];

    if (trek?.availableMonths && Array.isArray(trek.availableMonths) && trek.availableMonths.length > 0) {
      const currentMonth = new Date().getMonth();
      return trek.availableMonths
        .sort((a, b) => a - b)
        .map(monthIndex => ({
          index: monthIndex,
          name: monthNames[monthIndex],
          shortName: monthNames[monthIndex].substring(0, 3),
          isCurrentMonth: monthIndex === currentMonth,
          isFutureMonth: monthIndex >= currentMonth
        }));
    }
    return [];
  };

  const getNextAvailableMonth = () => {
    const months = getAvailableMonths();
    const currentMonth = new Date().getMonth();
    const futureMonth = months.find(m => m.index >= currentMonth);
    if (futureMonth) return futureMonth.name;
    if (months.length > 0) return `${months[0].name} (next year)`;
    return null;
  };

  // ============================================
  // HANDLERS
  // ============================================
// ✅ REPLACE WITH:
const handleDateCardToggle = (e) => {
  e.stopPropagation();

  const opening = !isDateCardOpen;
  setIsDateCardOpen(opening);
  setIsParticipantCardOpen(false);

  // When opening the calendar, jump to first available date
  if (opening) {
    const firstAvailable = getFirstAvailableDate();
    setCalendarOpenDate(firstAvailable);
  }
};

  const handleParticipantCardToggle = (e) => {
    e.stopPropagation();
    setIsParticipantCardOpen(!isParticipantCardOpen);
    setIsDateCardOpen(false);
  };

  const handleDateSelect = (date) => {
    if (!date) return;
    const dateStr = date instanceof Date
      ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
      : date;

    if (!isDateAvailable(dateStr)) {
      setSelectedUnavailableDate(date);
      setShowUnavailableDatePopup(true);
      return;
    }

    setFormData(prev => ({ ...prev, startDate: dateStr }));
    setSelectedDateFormatted(formatDateForDisplay(dateStr));
    setIsDateCardOpen(false);
    if (errors.startDate) setErrors(prev => ({ ...prev, startDate: undefined }));
  };

  const handleSelectAvailableDate = (dateStr) => {
    setFormData(prev => ({ ...prev, startDate: dateStr }));
    setSelectedDateFormatted(formatDateForDisplay(dateStr));
    setShowUnavailableDatePopup(false);
    setSelectedUnavailableDate(null);
    setIsDateCardOpen(false);
    if (errors.startDate) setErrors(prev => ({ ...prev, startDate: undefined }));
  };

  const handleChooseAnotherDate = () => {
    setShowUnavailableDatePopup(false);
    setSelectedUnavailableDate(null);
    setIsDateCardOpen(true);
  };

  const handleCloseUnavailablePopup = () => {
    setShowUnavailableDatePopup(false);
    setSelectedUnavailableDate(null);
  };

  const handleParticipantSelect = (count) => {
    const currentParticipants = [...participants];
    if (count > currentParticipants.length) {
      const newParticipants = [];
      for (let i = currentParticipants.length; i < count; i++) {
        newParticipants.push({
          participantId: `p${i + 1}`,
          name: '', email: '', age: '', emergencyContact: '',
          isPrimaryBooker: false
        });
      }
      setParticipants([...currentParticipants, ...newParticipants]);
    } else if (count < currentParticipants.length) {
      setParticipants(currentParticipants.slice(0, count));
    }
    setFormData(prev => ({ ...prev, totalParticipants: count }));
    setIsParticipantCardOpen(false);
  };

  const handleBoxClick = (boxId) => {
    if (currentExpandedBox === boxId) return;
    setCurrentExpandedBox(boxId);
  };

  const handleDoneClick = (boxId) => {
    setCompletedBoxes(prev => new Set([...prev, boxId]));
    if (boxId === 'primary') {
      setCurrentExpandedBox('participant-0');
    } else {
      const currentIndex = parseInt(boxId.split('-')[1]);
      if (currentIndex < participants.length - 1) {
        setCurrentExpandedBox(`participant-${currentIndex + 1}`);
      } else {
        setCurrentExpandedBox(null);
      }
    }
  };

  const handlePreviousBox = () => {
    if (!currentExpandedBox || currentExpandedBox === 'primary') return;
    if (currentExpandedBox === 'participant-0') {
      setCurrentExpandedBox('primary');
    } else {
      const currentIndex = parseInt(currentExpandedBox.split('-')[1]);
      setCurrentExpandedBox(`participant-${currentIndex - 1}`);
    }
  };

  const isBoxValid = (boxId) => {
  if (boxId === 'primary') {
    return (
      primaryBooker.name &&
      primaryBooker.email &&
      /^\d{10}$/.test(primaryBooker.contactNumber) // ✅ must be exactly 10 digits
    );
  }
  const index = parseInt(boxId.split('-')[1]);
  return participants[index]?.name?.trim() !== '';
};

  const handlePrimaryBookerChange = (field, value) => {
    setPrimaryBooker(prev => ({ ...prev, [field]: value }));
    if (participants[0]?.isPrimaryBooker) {
      const updatedParticipants = [...participants];
      updatedParticipants[0] = { ...updatedParticipants[0], [field]: value };
      setParticipants(updatedParticipants);
    }
    if (errors[`primaryBooker_${field}`]) {
      setErrors(prev => ({ ...prev, [`primaryBooker_${field}`]: undefined }));
    }
  };

  const handleParticipantChange = (index, field, value) => {
    const updatedParticipants = [...participants];
    updatedParticipants[index] = { ...updatedParticipants[index], [field]: value };
    setParticipants(updatedParticipants);
    if (errors[`participant_${index}_${field}`]) {
      setErrors(prev => ({ ...prev, [`participant_${index}_${field}`]: undefined }));
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) setErrors(prev => ({ ...prev, [name]: undefined }));
  };

  // ============================================
  // VALIDATION
  // ============================================
  const validateForm = () => {
    const newErrors = {};

    if (!formData.startDate) {
      newErrors.startDate = "Start date is required";
    } else if (!isDateAvailable(formData.startDate)) {
      newErrors.startDate = "Selected date is not available for booking.";
    }

    if (!primaryBooker.name) newErrors.primaryBooker_name = "Your name is required";
    if (!primaryBooker.email) {
      newErrors.primaryBooker_email = "Your email is required";
    } else if (!/\S+@\S+\.\S+/.test(primaryBooker.email)) {
      newErrors.primaryBooker_email = "Email is invalid";
    }
    if (!primaryBooker.contactNumber) {
      newErrors.primaryBooker_contactNumber = "Contact number is required";
    } else if (!/^\d{10}$/.test(primaryBooker.contactNumber)) {
      newErrors.primaryBooker_contactNumber = "Contact number must be 10 digits";
    }

    participants.forEach((participant, index) => {
      if (!participant.name || participant.name.trim() === '') {
        newErrors[`participant_${index}_name`] = `Participant ${index + 1} name is required`;
      }
      if (participant.email && !/\S+@\S+\.\S+/.test(participant.email)) {
        newErrors[`participant_${index}_email`] = `Invalid email for Participant ${index + 1}`;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (validateForm()) setStep(2);
  };

  // ============================================
  // PRICING
  // ============================================
  const calculateTotalPrice = useCallback(() => {
    const basePrice = trek?.numericPrice || parseInt(trek?.price?.replace(/[^0-9]/g, '')) || 0;
    const subtotal = basePrice * formData.totalParticipants;
    if (activeCoupon) return Math.max(subtotal - discountAmount, 0);
    return subtotal;
  }, [trek, formData.totalParticipants, activeCoupon, discountAmount]);

  const handleApplyCoupon = (coupon) => {
    if (coupon) {
      setActiveCoupon(coupon);
      setDiscountAmount(coupon.calculatedDiscount);
      setPaymentError(null);
    } else {
      setActiveCoupon(null);
      setDiscountAmount(0);
    }
  };

  // ============================================
  // PAYMENT PROCESSING (same as BookingModal)
  // ============================================
  const handlePaymentProcess = async () => {
    try {
      setIsProcessingPayment(true);
      setPaymentError(null);

      const total = calculateTotalPrice();
      const baseAmount = trek?.numericPrice * formData.totalParticipants || total;

      const bookingData = {
        primaryBooker: { uid: auth.currentUser?.uid || null, ...primaryBooker },
        participants,
        trekId: trek.id,
        trekName: trek.name,
        startDate: formData.startDate,
        pricePerPerson: trek?.numericPrice,
        totalParticipants: formData.totalParticipants,
        subtotal: baseAmount,
        discount: discountAmount,
        totalAmount: total,
        coupon: activeCoupon ? {
          id: activeCoupon.id,
          code: activeCoupon.code,
          discount: discountAmount,
          discountType: activeCoupon.discountType,
          originalAmount: baseAmount,
          finalAmount: total
        } : null,
        specialRequests: formData.specialRequests || '',
        createdAt: new Date().toISOString()
      };

      const paymentResult = await processBookingPayment(trek, bookingData);

      if (paymentResult.success) {
        const orderId = paymentResult.orderId || `order_${Date.now()}`;
        setBookingId(orderId);
        window.lastRazorpayBookingId = orderId;
      } else {
        setPaymentError(paymentResult.error || "Payment processing failed");
      }
    } catch (error) {
      console.error("Payment error:", error);
      setPaymentError(error.message || "Failed to process payment");
    } finally {
      setIsProcessingPayment(false);
    }
  };

  const handlePaymentSuccess = useCallback(async (response) => {
    try {
      setIsProcessingPayment(false);
      setIsProcessingBooking(true);

      const paymentResponse = {
        ...response,
        bookingId: bookingId || response.bookingId || response.razorpay_order_id,
        orderId: bookingId || response.razorpay_order_id,
        verifiedBookingId: bookingId,
        notes: {
          ...(response.notes || {}),
          bookingId: bookingId || response.notes?.bookingId,
          backupId: bookingId
        }
      };

      window.lastRazorpayBookingId = bookingId || response.bookingId || response.razorpay_order_id;

      let effectiveBookingId = bookingId ||
        paymentResponse.bookingId ||
        paymentResponse.razorpay_order_id ||
        window.lastRazorpayBookingId;

      if (!effectiveBookingId) {
        effectiveBookingId = `fallback_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
        paymentResponse.bookingId = effectiveBookingId;
      }

      const completedBooking = await completeBookingPayment(effectiveBookingId, paymentResponse);

      // Send email
      try {
        const bookingRef = doc(db, 'bookings', effectiveBookingId);
        const bookingSnap = await getDoc(bookingRef);
        let completeBookingData = bookingSnap.exists()
          ? { id: bookingSnap.id, ...bookingSnap.data() }
          : completedBooking || formData;

        const emailBookingData = {
          id: effectiveBookingId,
          bookingId: effectiveBookingId,
          name: completeBookingData.name || primaryBooker.name || 'Customer',
          email: completeBookingData.email || primaryBooker.email,
          contactNumber: completeBookingData.contactNumber || primaryBooker.contactNumber,
          startDate: completeBookingData.startDate || formData.startDate,
          participants: completeBookingData.participants || formData.totalParticipants,
          totalAmount: completeBookingData.totalAmount || calculateTotalPrice(),
          paymentId: paymentResponse.razorpay_payment_id,
          status: 'confirmed',
          paymentStatus: 'completed',
          specialRequests: completeBookingData.specialRequests || formData.specialRequests || 'None',
          discountAmount,
          createdAt: completeBookingData.createdAt || new Date().toISOString()
        };

        if (emailBookingData.email) {
          await emailService.sendConfirmationEmail(emailBookingData, trek);
        }
      } catch (emailError) {
        console.error('Email error:', emailError);
      }

      setIsProcessingBooking(false);
      setPaymentSuccess(true);
      setShowSuccessAnimation(true);

      setTimeout(() => {
        navigate(`/booking-confirmation/${effectiveBookingId}`);
      }, 3000);
    } catch (error) {
      console.error("Payment verification error:", error);
      setPaymentError(error.message || "Failed to verify payment");
      setIsProcessingBooking(false);
    } finally {
      setIsProcessingPayment(false);
    }
  }, [bookingId, navigate, formData, primaryBooker, trek, calculateTotalPrice, discountAmount]);

  const handlePaymentFailure = useCallback(async (error) => {
    try {
      if (bookingId) await handleBookingPaymentFailure(bookingId, error);
      setPaymentError(error.description || error.message || "Payment failed");
    } catch (err) {
      console.error("Error handling payment failure:", err);
      setPaymentError("Payment failed: " + (error.description || "Unknown error"));
    }
  }, [bookingId]);

  // Global Razorpay handlers
  useEffect(() => {
    const currentBookingId = bookingId;
    if (currentBookingId) window.lastRazorpayBookingId = currentBookingId;

    window.onRazorpaySuccess = function (response) {
      const enhancedResponse = {
        ...response,
        bookingId: currentBookingId || response.bookingId || response.razorpay_order_id,
        verifiedBookingId: currentBookingId,
        orderId: currentBookingId || response.razorpay_order_id,
        notes: { ...(response.notes || {}), bookingId: currentBookingId, backupId: currentBookingId }
      };
      handlePaymentSuccess(enhancedResponse);
    };

    window.onRazorpayFailure = function (response) {
      handlePaymentFailure(response);
    };

    return () => {
      window.onRazorpaySuccess = null;
      window.onRazorpayFailure = null;
    };
  }, [bookingId, handlePaymentSuccess, handlePaymentFailure]);

  // ============================================
  // RENDER - Loading/Error states
  // ============================================
  if (loading) {
    return (
      <PageContainer>
        <TopBar>
          <BackButton onClick={() => navigate(-1)}>
            <FiArrowLeft />
          </BackButton>
          <PageTitle>Loading...</PageTitle>
        </TopBar>
        <LoadingContainer>
          <LoadingSpinner />
          <LoadingText>Loading trek details...</LoadingText>
        </LoadingContainer>
      </PageContainer>
    );
  }

  if (fetchError || !trek) {
    return (
      <PageContainer>
        <TopBar>
          <BackButton onClick={() => navigate(-1)}>
            <FiArrowLeft />
          </BackButton>
          <PageTitle>Error</PageTitle>
        </TopBar>
        <ErrorContainer>
          <FiAlertCircle size={48} color={theme.primary} />
          <ErrorTitle>{fetchError || 'Trek not found'}</ErrorTitle>
          <ErrorText>We couldn't find the trek you're looking for.</ErrorText>
          <GoBackButton onClick={() => navigate('/explore')}>
            <FiArrowLeft />
            Browse Treks
          </GoBackButton>
        </ErrorContainer>
      </PageContainer>
    );
  }

  // ============================================
  // MAIN RENDER
  // ============================================
  return (
    <PageContainer>
      {/* Processing Overlay */}
      {isProcessingBooking && (
        <ProcessingOverlay>
          <ProcessingContent>
            <ProcessingSpinner />
            <ProcessingTitle>Processing Your Booking</ProcessingTitle>
            <ProcessingSubtitle>
              Please wait while we confirm your payment...
            </ProcessingSubtitle>
          </ProcessingContent>
        </ProcessingOverlay>
      )}

      {/* Success Animation */}
      {showSuccessAnimation && (
        <ProcessingOverlay>
          <ProcessingContent>
            <EnhancedSuccessMessage>
              <ConfettiContainer>
                {Array.from({ length: 15 }).map((_, i) => (
                  <ConfettiParticle
                    key={i}
                    color={['#ffeb3b', '#4caf50', '#2196f3', '#ff9800', '#e91e63'][i % 5]}
                    delay={`${i * 0.2}s`}
                    top={`${Math.random() * 100}%`}
                    left={`${Math.random() * 100}%`}
                  />
                ))}
              </ConfettiContainer>
              <SuccessIcon><FiCheck size={40} /></SuccessIcon>
              <SuccessTitle>🎉 Booking Confirmed!</SuccessTitle>
              <SuccessSubtitle>Your adventure awaits!</SuccessSubtitle>
              {activeCoupon && (
                <CouponSuccessDiv>
                  <strong>Coupon: {activeCoupon.code}</strong><br />
                  You saved ₹{discountAmount.toFixed(2)}!
                </CouponSuccessDiv>
              )}
            </EnhancedSuccessMessage>
          </ProcessingContent>
        </ProcessingOverlay>
      )}

      {/* Unavailable Date Popup */}
      {showUnavailableDatePopup && (
        <UnavailableDateOverlay onClick={handleCloseUnavailablePopup}>
          <UnavailableDatePopup onClick={(e) => e.stopPropagation()}>
            <PopupHeader>
              <PopupIconContainer><FiCalendar /></PopupIconContainer>
              <PopupTitle>Date Not Available</PopupTitle>
            </PopupHeader>
            <PopupBody>
              {selectedUnavailableDate && (
                <PopupDateDisplay>
                  <div className="date-label">You selected</div>
                  <div className="date-value">
                    {selectedUnavailableDate instanceof Date
                      ? selectedUnavailableDate.toLocaleDateString('en-US', {
                          weekday: 'long', year: 'numeric', month: 'long', day: 'numeric'
                        })
                      : formatDateForDisplay(selectedUnavailableDate)
                    }
                  </div>
                </PopupDateDisplay>
              )}
              <PopupMessage>
                Sorry, this date is not available for <strong>{trek?.name}</strong>.
                {getFutureAvailableDates().length > 0
                  ? ' Please choose from the available dates below.'
                  : getAvailableMonths().length > 0
                    ? ' This trek is only available during specific months.'
                    : ' Please contact us for availability.'
                }
              </PopupMessage>

              {getFutureAvailableDates().length > 0 && (
                <AvailableDatesSection>
                  <AvailableDatesTitle><FiCheck />Available Dates</AvailableDatesTitle>
                  <AvailableDatesGrid>
                    {getFutureAvailableDates().map((dateStr) => {
                      const formatted = formatDateForPopup(dateStr);
                      return (
                        <AvailableDateButton key={dateStr} onClick={() => handleSelectAvailableDate(dateStr)}>
                          <span className="day">{formatted.day}</span>
                          <span className="full-date">{formatted.full}</span>
                        </AvailableDateButton>
                      );
                    })}
                  </AvailableDatesGrid>
                </AvailableDatesSection>
              )}

              {getFutureAvailableDates().length === 0 && getAvailableMonths().length > 0 && (
                <AvailableMonthsSection>
                  <AvailableMonthsTitle><FiCalendar />Available Months</AvailableMonthsTitle>
                  <MonthsGrid>
                    {getAvailableMonths().map((month) => (
                      <MonthBadge key={month.index} isCurrentMonth={month.isCurrentMonth}>
                        <span className="month-name">{month.shortName}</span>
                        <span className="month-status">
                          {month.isCurrentMonth ? '● Now' : month.isFutureMonth ? 'Available' : 'Next Year'}
                        </span>
                      </MonthBadge>
                    ))}
                  </MonthsGrid>
                  <MonthsHelpText>
                    <FiInfo />
                    <span>Specific dates will be announced soon.
                      {getNextAvailableMonth() && <> Next: <strong>{getNextAvailableMonth()}</strong></>}
                    </span>
                  </MonthsHelpText>
                </AvailableMonthsSection>
              )}

              {getFutureAvailableDates().length === 0 && getAvailableMonths().length === 0 && (
                <NoAvailableDatesMessage>
                  <FiAlertCircle />
                  <div>
                    <strong>No availability information</strong>
                    <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem', fontWeight: 'normal' }}>
                      Please contact us for available dates.
                    </p>
                  </div>
                </NoAvailableDatesMessage>
              )}
            </PopupBody>
            <PopupFooter>
              <ClosePopupButton onClick={handleCloseUnavailablePopup}>Cancel</ClosePopupButton>
              <ChooseAnotherButton onClick={handleChooseAnotherDate}>
                <FiCalendar />Choose Another Date
              </ChooseAnotherButton>
            </PopupFooter>
          </UnavailableDatePopup>
        </UnavailableDateOverlay>
      )}

      {/* TOP BAR */}
      <TopBar>
        <BackButton onClick={() => step === 2 ? setStep(1) : navigate(-1)}>
          <FiArrowLeft />
        </BackButton>
        <PageTitle>
          {step === 1 ? 'Book Your ' : 'Payment '}
          <span>{step === 1 ? 'Adventure' : 'Details'}</span>
        </PageTitle>
      </TopBar>

      {/* CONTENT */}
      <ContentContainer>
        {/* Step Indicator */}
        <StepIndicator>
          <Step active={step === 1}>
            <StepNumber active={step === 1} completed={step > 1}>
              {step > 1 ? <FiCheck /> : '1'}
            </StepNumber>
            <span>Booking Details</span>
          </Step>
          <StepConnector completed={step > 1} />
          <Step active={step === 2}>
            <StepNumber active={step === 2}>2</StepNumber>
            <span>Payment</span>
          </Step>
        </StepIndicator>

        {/* ============ STEP 1 ============ */}
        {step === 1 && (
          <Form onSubmit={handleSubmit}>
            <FirstRow>
              <TrekImageContainer>
                <TrekImageLarge src={trek?.image} alt={trek?.name} />
                <TrekImageOverlay>
                  <h3>{trek?.name}</h3>
                  <p>📍 {trek?.location}</p>
                </TrekImageOverlay>
              </TrekImageContainer>

              <RightColumn>
                {/* Date Card */}
                <InteractiveCard isOpen={isDateCardOpen} onClick={handleDateCardToggle}>
                  <CardHeader>
                    <CardLabel><FiCalendar />Trek Date</CardLabel>
                    {formData.startDate && <SelectedBadge>Selected</SelectedBadge>}
                  </CardHeader>
                  <CardValue>
                    {formData.startDate ? formatDateForDisplay(formData.startDate) : 'Click to select date'}
                    <CardArrow isOpen={isDateCardOpen} />
                  </CardValue>
                  {/* ✅ REPLACE the old CardDropdown with this */}
<CardDropdown isOpen={isDateCardOpen} onClick={e => e.stopPropagation()}>

<CalendarWrapper>
  <DatePicker
    selected={formData.startDate ? new Date(formData.startDate) : null}
    onChange={(date) => handleDateSelect(date)}
    inline
    minDate={new Date()}
    
    openToDate={calendarOpenDate || getFirstAvailableDate()}
    renderDayContents={(day, date) => {
      if (!date) return <DayNumber>{day}</DayNumber>;

      const dateStr = `${date.getFullYear()}-${String(
        date.getMonth() + 1
      ).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

      const isPast =
        date < new Date(new Date().setHours(0, 0, 0, 0));

      // No dot for past dates
      if (isPast) {
        return <DayNumber>{day}</DayNumber>;
      }

      const available = isDateAvailable(dateStr);

      return (
        <DayWithDot>
          <DayNumber>{day}</DayNumber>
          <DayDot available={available} />
        </DayWithDot>
      );
    }}
  />
</CalendarWrapper>
</CardDropdown>

                </InteractiveCard>

                {errors.startDate && (
                  <ErrorSpan style={{ marginTop: '-0.5rem' }}>{errors.startDate}</ErrorSpan>
                )}

                {/* Participants Card */}
                <InteractiveCard isOpen={isParticipantCardOpen} onClick={handleParticipantCardToggle}>
                  <CardHeader>
                    <CardLabel><FiUser />Participants</CardLabel>
                    <SelectedBadge>{formData.totalParticipants} Selected</SelectedBadge>
                  </CardHeader>
                  <CardValue>
                    {formData.totalParticipants} {formData.totalParticipants === 1 ? 'Person' : 'People'}
                    <CardArrow isOpen={isParticipantCardOpen} />
                  </CardValue>
                 <CardDropdown isOpen={isParticipantCardOpen} onClick={e => e.stopPropagation()}>
  <ParticipantCounterWrapper>
    <CounterButton
      type="button"
      disabled={formData.totalParticipants <= 1}
      onClick={(e) => {
        e.stopPropagation();
        if (formData.totalParticipants > 1) {
          handleParticipantSelect(formData.totalParticipants - 1);
          // keep card open for further edits
          setIsParticipantCardOpen(true);
        }
      }}
    >
      −
    </CounterButton>

    <CounterDisplay>
      <CounterNumber>{formData.totalParticipants}</CounterNumber>
      <CounterLabel>
        {formData.totalParticipants === 1 ? 'Person' : 'People'}
      </CounterLabel>
    </CounterDisplay>

    <CounterButton 
      type="button"
      disabled={formData.totalParticipants >= 10}
      onClick={(e) => {
        e.stopPropagation();
        if (formData.totalParticipants < 10) {
          handleParticipantSelect(formData.totalParticipants + 1);
          // keep card open for further edits
          setIsParticipantCardOpen(true);
        }
      }}
    >
      +
    </CounterButton>
  </ParticipantCounterWrapper>

  <CounterInfoRow>
    <span>Min: 1</span>
    <span>
      Total: ₹{(
        (trek?.numericPrice || 0) * formData.totalParticipants
      ).toLocaleString('en-IN')}
    </span>
    <span>Max: 10</span>
  </CounterInfoRow>
</CardDropdown>
                </InteractiveCard>
              </RightColumn>
            </FirstRow>

            {/* Primary Booker Box */}
            <DetailBox
              isExpanded={currentExpandedBox === 'primary'}
              data-expanded={currentExpandedBox === 'primary'}
              onClick={() => currentExpandedBox !== 'primary' && handleBoxClick('primary')}
            >
              <DetailBoxHeader isExpanded={currentExpandedBox === 'primary'}>
                <DetailBoxTitle>
                  <FiUser />Your Details (Primary Booker)
                  <StatusDot completed={completedBoxes.has('primary')} />
                </DetailBoxTitle>
                {currentExpandedBox !== 'primary' && (
                  <span style={{ fontSize: '0.85rem', color: theme.darkGray }}>
                    {completedBoxes.has('primary') ? '✓ Completed' : 'Click to fill'}
                  </span>
                )}
              </DetailBoxHeader>

              <DetailBoxContent isExpanded={currentExpandedBox === 'primary'}>
                <FormGroup style={{ marginTop: 0 }}>
                  <Label>Full Name *</Label>
                  <Input
                    type="text"
                    value={primaryBooker.name}
                    onChange={(e) => handlePrimaryBookerChange('name', e.target.value)}
                    placeholder="Enter your full name"
                    onClick={(e) => e.stopPropagation()}
                  />
                  {errors.primaryBooker_name && <ErrorSpan>{errors.primaryBooker_name}</ErrorSpan>}
                </FormGroup>

                <FieldRow>
                  <FormGroup>
                    <Label>Email *</Label>
                    <Input
                      type="email"
                      value={primaryBooker.email}
                      onChange={(e) => handlePrimaryBookerChange('email', e.target.value)}
                      placeholder="your.email@example.com"
                      onClick={(e) => e.stopPropagation()}
                    />
                    {errors.primaryBooker_email && <ErrorSpan>{errors.primaryBooker_email}</ErrorSpan>}
                  </FormGroup>
                  
<FormGroup>
  <Label>Contact Number *</Label>
  <Input
    type="tel"
    value={primaryBooker.contactNumber}
    onChange={(e) => {
      const value = e.target.value.replace(/\D/g, '').slice(0, 10); // only digits, max 10
      handlePrimaryBookerChange('contactNumber', value);
    }}
    placeholder="10-digit number"
    onClick={(e) => e.stopPropagation()}
    maxLength={10}
    style={{
      borderColor: primaryBooker.contactNumber.length > 0 && primaryBooker.contactNumber.length !== 10
        ? '#EF5350'
        : primaryBooker.contactNumber.length === 10
          ? '#4CAF50'
          : undefined
    }}
  />
  {/* Show error ONLY when length is wrong and not empty */}
  {primaryBooker.contactNumber.length > 0 && primaryBooker.contactNumber.length !== 10 && (
    <ErrorSpan>
      {primaryBooker.contactNumber.length < 10
        ? `${10 - primaryBooker.contactNumber.length} more digit(s) needed`
        : 'Contact number must be exactly 10 digits'
      }
    </ErrorSpan>
  )}
  {/* Show server/submit errors */}
  {errors.primaryBooker_contactNumber && primaryBooker.contactNumber.length === 0 && (
    <ErrorSpan>{errors.primaryBooker_contactNumber}</ErrorSpan>
  )}
</FormGroup>
                </FieldRow>

                <DoneButton
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (isBoxValid('primary')) handleDoneClick('primary');
                  }}
                  disabled={!isBoxValid('primary')}
                >
                  <FiCheck />Done - Continue
                </DoneButton>
              </DetailBoxContent>
            </DetailBox>

            {/* Participant Boxes */}
            {participants.map((participant, index) => (
              <DetailBox
                key={participant.participantId}
                isExpanded={currentExpandedBox === `participant-${index}`}
                data-expanded={currentExpandedBox === `participant-${index}`}
                isDisabled={!completedBoxes.has('primary')}
                onClick={() => {
                  if (completedBoxes.has('primary') && currentExpandedBox !== `participant-${index}`) {
                    handleBoxClick(`participant-${index}`);
                  }
                }}
              >
                <DetailBoxHeader isExpanded={currentExpandedBox === `participant-${index}`}>
                  <DetailBoxTitle>
                    <FiUser />Participant {index + 1} {participant.isPrimaryBooker && '(You)'}
                    <StatusDot completed={completedBoxes.has(`participant-${index}`)} />
                  </DetailBoxTitle>
                  {currentExpandedBox !== `participant-${index}` && (
                    <span style={{ fontSize: '0.85rem', color: theme.darkGray }}>
                      {completedBoxes.has(`participant-${index}`) ? '✓ Completed' : 'Click to fill'}
                    </span>
                  )}
                </DetailBoxHeader>

                <DetailBoxContent isExpanded={currentExpandedBox === `participant-${index}`}>
                  <FieldRow style={{ marginTop: 0 }}>
                    <FormGroup>
                      <Label>Full Name *</Label>
                      <Input
                        type="text"
                        value={participant.name}
                        onChange={(e) => handleParticipantChange(index, 'name', e.target.value)}
                        placeholder="Full name"
                        disabled={participant.isPrimaryBooker}
                        onClick={(e) => e.stopPropagation()}
                      />
                      {errors[`participant_${index}_name`] && <ErrorSpan>{errors[`participant_${index}_name`]}</ErrorSpan>}
                    </FormGroup>
                    <FormGroup>
                      <Label>Email {!participant.isPrimaryBooker && '(Optional)'}</Label>
                      <Input
                        type="email"
                        value={participant.email}
                        onChange={(e) => handleParticipantChange(index, 'email', e.target.value)}
                        placeholder="Email"
                        disabled={participant.isPrimaryBooker}
                        onClick={(e) => e.stopPropagation()}
                      />
                    </FormGroup>
                  </FieldRow>

                  <FieldRow>
                    <FormGroup>
                      <Label>Age (Optional)</Label>
                      <Input
                        type="number"
                        value={participant.age}
                        onChange={(e) => handleParticipantChange(index, 'age', e.target.value)}
                        placeholder="Age"
                        min="1" max="100"
                        onClick={(e) => e.stopPropagation()}
                      />
                    </FormGroup>
                    
<FormGroup>
  <Label>Emergency Contact (Optional)</Label>
  <Input
    type="tel"
    value={participant.emergencyContact}
    onChange={(e) => {
      const value = e.target.value.replace(/\D/g, '').slice(0, 10);
      handleParticipantChange(index, 'emergencyContact', value);
    }}
    placeholder="10-digit number"
    onClick={(e) => e.stopPropagation()}
    maxLength={10}
    style={{
      borderColor:
        participant.emergencyContact?.length > 0 &&
        participant.emergencyContact?.length !== 10
          ? '#EF5350'
          : participant.emergencyContact?.length === 10
            ? '#4CAF50'
            : undefined
    }}
  />
  {/* Real-time digit count error */}
  {participant.emergencyContact?.length > 0 &&
    participant.emergencyContact?.length !== 10 && (
      <ErrorSpan>
        {participant.emergencyContact.length < 10
          ? `${10 - participant.emergencyContact.length} more digit(s) needed`
          : 'Must be exactly 10 digits'
        }
      </ErrorSpan>
    )}
</FormGroup>
                  </FieldRow>

                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
                    {index > 0 && (
                      <DoneButton
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handlePreviousBox(); }}
                        style={{
                          background: 'transparent',
                          color: theme.primary,
                          border: `2px solid ${theme.primary}`,
                          boxShadow: 'none'
                        }}
                      >
                        ← Previous
                      </DoneButton>
                    )}
                    <DoneButton
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        if (isBoxValid(`participant-${index}`)) handleDoneClick(`participant-${index}`);
                      }}
                      disabled={!isBoxValid(`participant-${index}`)}
                    >
                      <FiCheck />
                      {index === participants.length - 1 ? 'Done' : 'Next Participant'}
                    </DoneButton>
                  </div>
                </DetailBoxContent>
              </DetailBox>
            ))}

            {/* Special Requests */}
            <FormGroup>
              <Label><FiMessageSquare />Special Requests (Optional)</Label>
              <Textarea
                name="specialRequests"
                value={formData.specialRequests}
                onChange={handleChange}
                placeholder="Any dietary requirements, accessibility needs, or other requests..."
                style={{ minHeight: '80px' }}
              />
            </FormGroup>
          </Form>
        )}

        {/* ============ STEP 2 ============ */}
        {step === 2 && (
          <>
            

            <BookingSummaryCard>
              <SummaryHeader>
                <SectionIcon><FiInfo /></SectionIcon>
                <SummaryTitle>Booking Summary</SummaryTitle>
              </SummaryHeader>
              <SummaryGrid>
                <SummaryItem><strong>Trek:</strong> {trek?.name}</SummaryItem>
                <SummaryItem><strong>Date:</strong> {formatDateForDisplay(formData.startDate)}</SummaryItem>
                <SummaryItem><strong>Participants:</strong> {formData.totalParticipants} person(s)</SummaryItem>
                <SummaryItem><strong>Price/Person:</strong> ₹{trek?.numericPrice}</SummaryItem>
              </SummaryGrid>
              <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(51, 153, 204, 0.1)' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#020202', marginBottom: '0.5rem' }}>
                  Participants:
                </div>
                <div style={{ display: 'flex', flexWrap: 'wrap' }}>
                  {participants.map((p, i) => (
                    <ParticipantChip key={i} isPrimary={p.isPrimaryBooker}>
                      {p.name || `Participant ${i + 1}`}
                      {p.isPrimaryBooker && ' ✓'}
                    </ParticipantChip>
                  ))}
                </div>
              </div>
            </BookingSummaryCard>

            <CouponSection
              orderTotal={trek?.numericPrice * formData.totalParticipants}
              onApplyCoupon={handleApplyCoupon}
              theme={{
                mainColor: theme.primary,
                hoverColor: theme.primaryDark,
                gradientLight: `linear-gradient(135deg, ${theme.peach}, ${theme.cream})`,
                textColor: '#212223',
                inputBackground: theme.white,
                inputBorder: theme.mediumGray,
                inputText: '#111827',
                placeholderColor: '#4a4949'
              }}
            />

            <PriceSummary style={{
              background: `linear-gradient(135deg, rgba(255, 87, 34, 0.06), rgba(255, 152, 0, 0.04))`,
              borderColor: theme.primary,
              padding: '1.5rem',
              borderRadius: '16px',
              marginTop: '1rem',
              minHeight: '325px'
            }}>
              <PriceItem>
                <span>Trek Fee (per person)</span>
                <span>₹{trek?.numericPrice}</span>
              </PriceItem>
              <PriceItem>
                <span>Number of Participants</span>
                <span>× {formData.totalParticipants}</span>
              </PriceItem>
              <PriceItem>
                <span>Subtotal</span>
                <span>₹{(trek?.numericPrice * formData.totalParticipants).toFixed(2)}</span>
              </PriceItem>
              {activeCoupon && (
                <PriceItem style={{ color: '#059669' }}>
                  <span>Discount ({activeCoupon.code})</span>
                  <span>-₹{discountAmount.toFixed(2)}</span>
                </PriceItem>
              )}
              <PriceTotal>
                <span>Total</span>
                <span>₹{calculateTotalPrice()}</span>
              </PriceTotal>
            </PriceSummary>

            {paymentError && (
              <ErrorMessage><FiAlertCircle size={20} />{paymentError}</ErrorMessage>
            )}
            {paymentSuccess && (
              <SuccessMessage>
                <FiCheck size={20} />
                <div>
                  Payment successful! Your booking is confirmed.
                  {activeCoupon && (
                    <div style={{ marginTop: '10px' }}>
                      Coupon: {activeCoupon.code} (Saved: ₹{discountAmount.toFixed(2)})
                    </div>
                  )}
                </div>
              </SuccessMessage>
            )}
          </>
        )}
      </ContentContainer>
       <SecurePaymentBanner>
              <FiCheck /> Secure Payment powered by Razorpay
            </SecurePaymentBanner>
      {/* STICKY FOOTER */}
      <FooterContainer>
        {step === 1 ? (
          <>
            <CancelButton type="button" onClick={() => navigate(-1)}>
              Cancel
            </CancelButton>
            <ProceedButton type="button" onClick={handleSubmit}>
              Continue to Payment
            </ProceedButton>
          </>
        ) : (
          <>
            <CancelButton type="button" onClick={() => setStep(1)}>
              Back
            </CancelButton>
            <PaymentButton
              type="button"
              onClick={handlePaymentProcess}
              disabled={isProcessingPayment || paymentSuccess}
            >
              {isProcessingPayment ? (
                <LoadingIndicator />
              ) : paymentSuccess ? (
                <><FiCheck />Paid</>
              ) : (
                <><FiCreditCard />Pay Now</>
              )}
            </PaymentButton>
          </>
        )}
      </FooterContainer>
    </PageContainer>
  );
};

export default BookingPage;