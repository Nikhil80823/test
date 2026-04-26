import React, { useState, useEffect, useCallback, useRef } from 'react';
import styled, { keyframes, css } from 'styled-components';
import { useNavigate } from 'react-router-dom';
import { FiX, FiCalendar, FiUser, FiPhone, FiMessageSquare, FiCreditCard, FiCheck, FiAlertCircle, FiInfo } from 'react-icons/fi';
import { processBookingPayment, completeBookingPayment, handleBookingPaymentFailure } from '../utils/bookingService';
import { loadRazorpayScript } from '../services/payment/razorpay';
import { auth, db } from '../firebase';
import { doc, getDoc} from 'firebase/firestore';
import CouponSection from './CouponSection';
import emailService from '../services/emailService';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const emailRegex = /^\S+@\S+\.\S+$/;
const digitsOnly = (value) => String(value ?? '').replace(/\D/g, '');
const isValidIndianMobile = (value) => digitsOnly(value).length === 10;
const isValidAge = (value) => {
  if (value === '' || value === null || value === undefined) return true; // optional
  const n = Number(value);
  if (!Number.isInteger(n)) return false;
  return n >= 1 && n <= 100;
};

// Animations
const fadeIn = keyframes`
  from {
    opacity: 0;
    transform: translateY(30px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const scaleIn = keyframes`
  from {
    opacity: 0;
    transform: scale(0.8) translateY(40px);
  }
  to {
    opacity: 1;
    transform: scale(1) translateY(0);
  }
`;

const slideInFromLeft = keyframes`
  from {
    opacity: 0;
    transform: translateX(-30px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
`;

const slideInFromRight = keyframes`
  from {
    opacity: 0;
    transform: translateX(30px);
  }
  to {
    opacity: 1;
    transform: translateX(0);
  }
`;

const shimmer = keyframes`
  0% { background-position: -200px 0; }
  100% { background-position: calc(200px + 100%) 0; }
`;

const stepSwap = keyframes`
  from {
    opacity: 0;
    transform: translateY(10px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const pulse = keyframes`
  0%, 100% { transform: scale(1); }
  50% { transform: scale(1.02); }
`;

const bounceIn = keyframes`
  0% {
    opacity: 0;
    transform: scale(0.3);
  }
  50% {
    opacity: 1;
    transform: scale(1.05);
  }
  70% {
    transform: scale(0.9);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
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
  0% {
    stroke-dashoffset: 100;
  }
  100% {
    stroke-dashoffset: 0;
  }
`;

const confetti = keyframes`
  0% {
    transform: translateY(0px) rotate(0deg);
    opacity: 1;
  }
  100% {
    transform: translateY(-100px) rotate(720deg);
    opacity: 0;
  }
`;

const slideInUp = keyframes`
  from {
    opacity: 0;
    transform: translateY(50px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
`;

const gradientShift = keyframes`
  0%, 100% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
`;

// NEW LIGHTER COLOR THEME (Replace the previous theme constant)
const theme = {
  primary: '#a53d1e', // Lighter coral-orange
  primaryDark: '#ed4c1b',
  primaryLight: '#FFAB91',
  secondary: '#12182f', // Dark gray instead of pure black
  accent: '#ff6b4d', // Warm amber
  success: '#4eab53',
  white: '#FFFFFF',
  cream: '#FFF8F0', // Light cream background
  peach: '#FFE4D6', // Light peach
  lightGray: '#F5F5F5',
  mediumGray: '#E0E0E0',
  darkGray: '#546E7A',
  text: '#263238',
};

// UPDATED ANIMATIONS - Add the new expand animation
const expandBox = keyframes`
  from {
    transform: scale(1);
    z-index: 1;
  }
  to {
    transform: scale(1.05);
    z-index: 10;
    box-shadow: 0 20px 60px rgba(255, 87, 34, 0.4);
  }
`;

// REPLACE ModalOverlay - Lighter overlay
const ModalOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(135deg, rgba(38, 50, 56, 0.85) 0%, rgba(255, 112, 67, 0.15) 100%);
  backdrop-filter: blur(8px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 1rem;
  overflow-y: auto;
  animation: ${fadeIn} 0.4s cubic-bezier(0.4, 0, 0.2, 1);
`;

// REPLACE ModalContainer - Lighter background
const ModalContainer = styled.div`
  background: linear-gradient(135deg, ${theme.white} 0%, ${theme.cream} 100%);
  border-radius: 24px;
  width: 100%;
  max-width: 900px;
  max-height: 95vh;
  overflow: hidden;
  box-shadow: 
    0 25px 50px -12px rgba(0, 0, 0, 0.25),
    0 0 0 1px rgba(255, 112, 67, 0.3),
    inset 0 1px 0 rgba(255, 255, 255, 0.9);
  animation: ${scaleIn} 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275);
  display: flex;
  flex-direction: column;
  position: relative;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 4px;
    background: linear-gradient(90deg, ${theme.primary}, ${theme.accent}, ${theme.primary});
    background-size: 200% 100%;
    animation: ${shimmer} 2s infinite linear;
  }
`;

// REPLACE ModalHeader - Softer header
const ModalHeader = styled.div`
  padding: 1.75rem 2rem 1.25rem;
  background: linear-gradient(135deg, ${theme.secondary} 0%, #455A64 100%);
  display: flex;
  justify-content: space-between;
  align-items: center;
  position: relative;
  
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
    padding: 1.5rem 1.25rem 1rem;
  }
`;

// REPLACE ModalTitle
const ModalTitle = styled.h2`
  margin: 0;
  font-size: 1.6rem;
  font-weight: 700;
  color: ${theme.white};
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  letter-spacing: -0.025em;
  animation: ${slideInFromLeft} 0.6s ease-out;
  
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




// REPLACE CloseButton
const CloseButton = styled.button`
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
  animation: ${slideInFromRight} 0.6s ease-out;

  &:hover {
    background: ${theme.primary};
    border-color: ${theme.primary};
    transform: scale(1.1) rotate(90deg);
    box-shadow: 0 8px 25px rgba(255, 112, 67, 0.4);
  }
  
  &:active {
    transform: scale(0.95);
  }
`;

// REPLACE ModalBody
const ModalBody = styled.div`
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 1.75rem;
  overflow-y: auto;
  flex: 1;
  background: linear-gradient(180deg, ${theme.cream} 0%, ${theme.white} 100%);
  
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: ${theme.peach};
    border-radius: 3px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: linear-gradient(135deg, ${theme.primary}, ${theme.accent});
    border-radius: 3px;
  }

  @media (max-width: 480px) {
    padding: 1.25rem;
    gap: 1.5rem;
    /* Make room for sticky mobile CTA (incl. safe area). */
    padding-bottom: calc(1.25rem + 76px + env(safe-area-inset-bottom, 0px));
  }
`;
const TrekInfo = styled.div`
  display: flex;
  align-items: center;
  gap: 1.5rem;
  background: linear-gradient(135deg, rgba(51, 153, 204, 0.05) 0%, rgba(0, 180, 219, 0.05) 100%);
  padding: 1.5rem;
  border-radius: 16px;
  border: 2px solid rgba(51, 153, 204, 0.1);
  position: relative;
  overflow: hidden;
  animation: ${fadeIn} 0.6s ease-out 0.2s both;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    animation: ${shimmer} 2s infinite;
  }

  @media (max-width: 480px) {
    flex-direction: column;
    align-items: flex-start;
    text-align: left;
    gap: 1rem;
  }
`;

const TrekImage = styled.img`
  width: 100px;
  height: 80px;
  border-radius: 12px;
  object-fit: cover;
  box-shadow: 0 8px 25px rgba(0, 0, 0, 0.15);
  transition: transform 0.3s ease;
  
  &:hover {
    transform: scale(1.05);
  }

  @media (max-width: 480px) {
    width: 100%;
    height: 150px; /* Make image the hero on mobile */
  }
`;


// Add this with your other styled components
// Place it AFTER the existing SelectedDateDisplay component

const PopupDateDisplay = styled.div`
  background: linear-gradient(135deg, #FFF3E0 0%, #FFE0B2 100%);
  border: 2px solid #FF9800;
  border-radius: 12px;
  padding: 1rem;
  text-align: center;
  margin-bottom: 1.5rem;
  animation: ${bounceIn} 0.4s ease-out;
  
  .date-label {
    font-size: 0.8rem;
    color: #E65100;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 0.25rem;
  }
  
  .date-value {
    font-size: 1.1rem;
    color: #BF360C;
    font-weight: 700;
  }

   @media (max-width: 480px) {
    padding: 0.85rem;
    margin-bottom: 1rem;
    
    .date-label {
      font-size: 0.7rem;
    }
    
    .date-value {
      font-size: 0.95rem;
    }
  }
`;

// Add these styled components with your other styled components

const UnavailableDateOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(4px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 2000;
  padding: 1rem;
  animation: ${fadeIn} 0.3s ease-out;

  @media (max-width: 480px) {
    padding: 0;
    align-items: flex-end;
  }
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
    max-height: 85vh;
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
    bottom: -10px;
    left: 50%;
    transform: translateX(-50%);
    width: 0;
    height: 0;
    border-left: 12px solid transparent;
    border-right: 12px solid transparent;
    border-top: 12px solid #C62828;
  }

   @media (max-width: 480px) {
    padding: 1.25rem 1rem;
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
  
  svg {
    font-size: 1.8rem;
    color: white;
  }

  @media (max-width: 480px) {
    width: 50px;
    height: 50px;
    margin-bottom: 0.75rem;
    
    svg {
      font-size: 1.4rem;
    }
  }
`;

const PopupTitle = styled.h3`
  margin: 0;
  color: white;
  font-size: 1.3rem;
  font-weight: 700;

    @media (max-width: 480px) {
    font-size: 1.1rem;
  }
`;

const PopupBody = styled.div`
  padding: 2rem 1.5rem 1.5rem;

  overflow-y: auto;
  flex: 1;
  
  @media (max-width: 480px) {
    padding: 1.25rem 1rem;
  }
`;

const SelectedDateDisplay = styled.div`
  background: linear-gradient(135deg, #FFF3E0 0%, #FFE0B2 100%);
  border: 2px solid #FF9800;
  border-radius: 12px;
  padding: 1rem;
  text-align: center;
  margin-bottom: 1.5rem;
  
  .date-label {
    font-size: 0.8rem;
    color: #E65100;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 0.25rem;
  }
  
  .date-value {
    font-size: 1.1rem;
    color: #BF360C;
    font-weight: 700;
  }
`;

const PopupMessage = styled.p`
  color: ${theme.text};
  font-size: 1rem;
  line-height: 1.6;
  margin: 0 0 1.5rem;
  text-align: center;

  @media (max-width: 480px) {
    font-size: 0.9rem;
    margin-bottom: 1rem;
  }
`;

const AvailableDatesSection = styled.div`
  margin-top: 1rem;

   @media (max-width: 480px) {
    margin-top: 0.75rem;
  }
`;

const AvailableDatesTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  font-weight: 700;
  color: ${theme.primary};
  margin-bottom: 1rem;
  
  svg {
    color: ${theme.success};
  }

  @media (max-width: 480px) {
    font-size: 0.85rem;
    margin-bottom: 0.75rem;
  }
`;

const AvailableDatesGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem;
  max-height: 200px;
  overflow-y: auto;
  padding-right: 0.5rem;
  
  &::-webkit-scrollbar {
    width: 4px;
  }
  
  &::-webkit-scrollbar-track {
    background: ${theme.cream};
    border-radius: 2px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${theme.primaryLight};
    border-radius: 2px;
  }

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
    gap: 0.4rem;
    max-height: 150px;
  }
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
  
  .day {
    display: block;
    font-size: 0.95rem;
    font-weight: 700;
    color: ${theme.primary};
  }
  
  .full-date {
    display: block;
    font-size: 0.8rem;
    color: ${theme.darkGray};
    margin-top: 2px;
  }
  
  &:hover {
    background: linear-gradient(135deg, ${theme.primary} 0%, ${theme.primaryDark} 100%);
    border-color: ${theme.primary};
    transform: translateY(-2px);
    box-shadow: 0 4px 12px rgba(255, 112, 67, 0.3);
    
    .day, .full-date {
      color: white;
    }
  }
  
  &:active {
    transform: translateY(0);
  }
      @media (max-width: 480px) {
    padding: 0.65rem 0.85rem;
    display: flex;
    justify-content: space-between;
    align-items: center;
    
    .day {
      font-size: 0.9rem;
    }
    
    .full-date {
      margin-top: 0;
      font-size: 0.8rem;
    }
  }
`;

const PopupFooter = styled.div`
  padding: 1rem 1.5rem 1.5rem;
  display: flex;
  gap: 0.75rem;
  
   @media (max-width: 480px) {
    flex-direction: column-reverse;
    padding: 1rem;
    gap: 0.5rem;
    padding-bottom: calc(1rem + env(safe-area-inset-bottom, 0px));
  }
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

  @media (max-width: 480px) {
    padding: 0.85rem 1rem;
    font-size: 0.9rem;
    width: 100%;
  }
`;

const ClosePopupButton = styled(PopupButton)`
  background: ${theme.lightGray};
  border: 2px solid ${theme.mediumGray};
  color: ${theme.darkGray};
  
  &:hover {
    background: ${theme.mediumGray};
    color: ${theme.text};
  }
`;

const ChooseAnotherButton = styled(PopupButton)`
  background: linear-gradient(135deg, ${theme.primary} 0%, ${theme.primaryDark} 100%);
  border: none;
  color: white;
  box-shadow: 0 4px 12px rgba(255, 112, 67, 0.3);
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(255, 112, 67, 0.4);
  }
`;

const NoAvailableDatesMessage = styled.div`
  background: linear-gradient(135deg, #FFEBEE 0%, #FFCDD2 100%);
  border: 2px solid #EF5350;
  border-radius: 12px;
  padding: 1.25rem;
  text-align: center;
  color: #C62828;
  font-weight: 600;
  
  svg {
    display: block;
    margin: 0 auto 0.5rem;
    font-size: 1.5rem;
  }
     @media (max-width: 480px) {
    padding: 1rem;
    font-size: 0.9rem;
    
    svg {
      font-size: 1.25rem;
    }
  }
`;

const TrekDetails = styled.div`
  flex: 1;
`;

const TrekName = styled.h3`
  margin: 0 0 0.5rem;
  font-size: 1.4rem;
  font-weight: 700;
  background: linear-gradient(135deg, #2c5aa0 0%, #3399cc 100%);
  background-clip: text;
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
`;

const TrekLocation = styled.p`
  margin: 0;
  color: #64748b;
  font-size: 1rem;
  font-weight: 500;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  
  &::before {
    content: '📍';
    font-size: 0.9rem;
  }
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
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;

  svg {
    color: ${theme.primary};
    font-size: 1rem;
  }
`;

// REPLACE Input
const Input = styled.input`
  padding: 0.9rem 1.1rem;
  border: 2px solid ${props => (props.$invalid ? '#ef4444' : theme.mediumGray)};
  border-radius: 10px;
  font-size: 0.95rem;
  font-weight: 500;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  outline: none;
  background: ${theme.white};
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  color: ${theme.text};
  
  &::placeholder {
    color: #9E9E9E;
    font-weight: 400;
  }

  &:focus {
    border-color: ${props => (props.$invalid ? '#ef4444' : theme.primary)};
    box-shadow: 
      0 0 0 3px ${props => (props.$invalid ? 'rgba(239, 68, 68, 0.14)' : 'rgba(255, 112, 67, 0.12)')},
      0 2px 8px ${props => (props.$invalid ? 'rgba(239, 68, 68, 0.12)' : 'rgba(255, 112, 67, 0.15)')};
  }
  
  &:hover:not(:focus):not(:disabled) {
    border-color: ${props => (props.$invalid ? '#ef4444' : theme.primaryLight)};
  }
  
  &:disabled {
    background: ${theme.lightGray};
    color: ${theme.darkGray};
  }
`;

// Apply same styling to Select, DateInput, and Textarea
// REPLACE Select
const Select = styled.select`
  padding: 0.9rem 1.1rem;
  border: 2px solid ${props => (props.$invalid ? '#ef4444' : theme.mediumGray)};
  border-radius: 10px;
  font-size: 0.95rem;
  font-weight: 500;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  outline: none;
  background: ${theme.white};
  cursor: pointer;
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  color: ${theme.text};

  &:focus {
    border-color: ${props => (props.$invalid ? '#ef4444' : theme.primary)};
    box-shadow: 
      0 0 0 3px ${props => (props.$invalid ? 'rgba(239, 68, 68, 0.14)' : 'rgba(255, 112, 67, 0.12)')},
      0 2px 8px ${props => (props.$invalid ? 'rgba(239, 68, 68, 0.12)' : 'rgba(255, 112, 67, 0.15)')};
  }
`;
const DateInput = styled(Input).attrs({ type: 'date' })``;
const Textarea = styled(Input).attrs({ as: 'textarea' })`
  resize: vertical;
  min-height: 100px;
`;

const StepContent = styled.div`
  animation: ${stepSwap} 220ms ease-out;
`;

const FieldHelpText = styled.div`
  font-size: 0.9rem;
  color: #2c5aa0;
  margin-top: 8px;
  display: flex;
  align-items: center;
  background: linear-gradient(135deg, rgba(51, 153, 204, 0.08) 0%, rgba(0, 180, 219, 0.08) 100%);
  padding: 12px 16px;
  border-radius: 12px;
  border-left: 4px solid #3399cc;
  font-weight: 500;
  animation: ${fadeIn} 0.5s ease-out;
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
    animation: ${shimmer} 3s infinite;
  }
  
  svg {
    color: #3399cc;
    margin-right: 8px;
    font-size: 1rem;
  }
`;

const CustomDatePickerContainer = styled.div`
  position: relative;
  width: 100%;
`;

const DatePickerInput = styled.div`
  padding: 1rem 1.25rem;
  border: 2px solid rgba(51, 153, 204, 0.2);
  border-radius: 12px;
  font-size: 1rem;
  font-weight: 500;
  background: linear-gradient(135deg, #ffffff 0%, #f8fafc 100%);
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  display: flex;
  justify-content: space-between;
  align-items: center;
  min-height: 24px;
  
  &:hover {
    border-color: rgba(51, 153, 204, 0.4);
    transform: translateY(-1px);
  }
  
  &.focused {
    border-color: #3399cc;
    background: #ffffff;
    box-shadow: 
      0 0 0 4px rgba(51, 153, 204, 0.1),
      0 4px 12px rgba(51, 153, 204, 0.15);
    transform: translateY(-2px);
  }
`;

const DatePickerPlaceholder = styled.span`
  color: ${props => props.hasValue ? '#2c5aa0' : '#94a3b8'};
  font-weight: ${props => props.hasValue ? '600' : '400'};
`;

const CalendarIcon = styled(FiCalendar)`
  color: #3399cc;
  font-size: 1.1rem;
`;

const DatePickerDropdown = styled.div`
  position: absolute;
  top: 100%;
  left: 0;
  right: 0;
  background: #ffffff;
  border: 2px solid rgba(51, 153, 204, 0.2);
  border-radius: 16px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
  z-index: 1000;
  margin-top: 8px;
  max-height: 400px;
  overflow-y: auto;
  animation: ${fadeIn} 0.3s ease-out;
  
  /* Custom scrollbar */
  &::-webkit-scrollbar {
    width: 6px;
  }
  
  &::-webkit-scrollbar-track {
    background: rgba(51, 153, 204, 0.1);
    border-radius: 3px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: linear-gradient(135deg, #3399cc, #00b4db);
    border-radius: 3px;
  }
`;

const DatePickerHeader = styled.div`
  padding: 1.25rem 1.5rem 1rem;
  border-bottom: 2px solid rgba(51, 153, 204, 0.1);
  background: linear-gradient(135deg, rgba(51, 153, 204, 0.05) 0%, rgba(0, 180, 219, 0.05) 100%);
  border-radius: 14px 14px 0 0;
`;

const DatePickerTitle = styled.div`
  font-weight: 700;
  color: #2c5aa0;
  font-size: 1.1rem;
  margin-bottom: 0.5rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
`;

const DatePickerSubtitle = styled.div`
  font-size: 0.9rem;
  color: #64748b;
  font-weight: 500;
`;

const DateGrid = styled.div`
  padding: 1.5rem;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(140px, 1fr));
  gap: 12px;
  max-height: 280px;
  overflow-y: auto;

  @media (max-width: 480px) {
    grid-template-columns: 1fr; /* 1 column of dates on mobile for easier tapping */
  }
`;

const DateOption = styled.button`
  padding: 12px 16px;
  background: ${props => props.selected 
    ? 'linear-gradient(135deg, #3399cc 0%, #00b4db 100%)' 
    : 'linear-gradient(135deg, #f8fafc 0%, #ffffff 100%)'
  };
  color: ${props => props.selected ? 'white' : '#2c5aa0'};
  border: 2px solid ${props => props.selected ? '#3399cc' : 'rgba(51, 153, 204, 0.2)'};
  border-radius: 12px;
  font-size: 0.9rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  text-align: left;
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-height: 60px;
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    transition: left 0.5s ease;
  }
  
  &:hover {
    background: ${props => props.selected 
      ? 'linear-gradient(135deg, #2388bb 0%, #0095b6 100%)' 
      : 'linear-gradient(135deg, #3399cc 0%, #00b4db 100%)'
    };
    color: white;
    border-color: #3399cc;
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(51, 153, 204, 0.25);
    
    &::before {
      left: 100%;
    }
  }
  
  &:active {
    transform: translateY(0);
  }
`;

const DateOptionMain = styled.div`
  font-size: 0.95rem;
  font-weight: 700;
`;

const DateOptionSub = styled.div`
  font-size: 0.8rem;
  opacity: 0.8;
  font-weight: 500;
`;

const NoAvailableDates = styled.div`
  padding: 2rem;
  text-align: center;
  color: #64748b;
  font-style: italic;
`;

// const SelectedDateDisplay = styled.div`
//   margin-top: 12px;
//   padding: 12px 16px;
//   background: linear-gradient(135deg, rgba(51, 153, 204, 0.08) 0%, rgba(0, 180, 219, 0.08) 100%);
//   border: 2px solid rgba(51, 153, 204, 0.2);
//   border-radius: 12px;
//   font-size: 0.9rem;
//   font-weight: 600;
//   color: #2c5aa0;
//   display: flex;
//   align-items: center;
//   gap: 8px;
//   animation: ${bounceIn} 0.5s ease-out;
  
//   svg {
//     color: #3399cc;
//   }
// `;

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
    top: 0;
    left: 0;
    right: 0;
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
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  
  &:not(:last-child) {
    border-bottom: 1px solid rgba(51, 153, 204, 0.1);
  }
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

// REPLACE ModalFooter
const ModalFooter = styled.div`
  padding: 1.5rem 2rem;
  background: ${theme.white};
  border-top: 2px solid ${theme.peach};
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;

  @media (max-width: 480px) {
    flex-direction: column-reverse;
    padding: 1.25rem;
    gap: 0.75rem;
    position: sticky;
    bottom: 0;
    z-index: 5;
    padding-bottom: calc(1.25rem + env(safe-area-inset-bottom, 0px));
    box-shadow: 0 -10px 30px rgba(2, 6, 23, 0.12);
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
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  letter-spacing: -0.01em;
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.2), transparent);
    transition: left 0.5s ease;
  }
  
  &:hover::before {
    left: 100%;
  }

  @media (max-width: 480px) {
    width: 100%; /* Make buttons full width on mobile */
    min-width: 0;
  }
`;

// REPLACE CancelButton
const CancelButton = styled(Button)`
  background: ${theme.white};
  border: 2px solid ${theme.mediumGray};
  color: ${theme.darkGray};
  min-width: 120px;

  &:hover {
    background: ${theme.lightGray};
    border-color: ${theme.darkGray};
    color: ${theme.text};
  }

  @media (max-width: 480px) {
    width: 100%;
  }
`;

// REPLACE ProceedButton
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

  &:disabled {
    background: ${theme.mediumGray};
    box-shadow: none;
  }

  @media (max-width: 480px) {
    width: 100%;
  }
`;
// REPLACE PaymentButton
const PaymentButton = styled(ProceedButton)`
  background: linear-gradient(135deg, #db392d 0%, #3b443b 100%);
  border-color: #d9550e;
  box-shadow: 0 4px 15px rgba(76, 175, 80, 0.4);

  &:hover {
    background: linear-gradient(135deg, #388E3C 0%, #2E7D32 100%);
    box-shadow: 0 8px 25px rgba(76, 175, 80, 0.6);
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
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  
  svg {
    color: #dc2626;
    font-size: 1.25rem;
    flex-shrink: 0;
  }
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
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  position: relative;
  overflow: hidden;
  
  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: -100%;
    width: 100%;
    height: 100%;
    background: linear-gradient(90deg, transparent, rgba(255, 255, 255, 0.3), transparent);
    animation: ${shimmer} 2s infinite;
  }
  
  svg {
    color: #059669;
    font-size: 1.25rem;
    flex-shrink: 0;
    margin-top: 2px;
  }
  
  div {
    line-height: 1.5;
  }
`;

const StepIndicator = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-bottom: 1rem;
  animation: ${fadeIn} 0.6s ease-out 0.1s both;

  @media (max-width: 640px) {
    justify-content: space-between;
    gap: 0.75rem;
  }
`;

const Step = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  font-weight: 600;
  color: ${props => props.active ? theme.primary : theme.darkGray};
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;

  span {
    white-space: nowrap;
  }

  @media (max-width: 640px) {
    font-size: 0.85rem;
    gap: 0.4rem;
  }
`;

// Step indicator updates
const StepNumber = styled.div`
  width: 32px;
  height: 32px;
  border-radius: 50%;
  background: ${props => props.active 
    ? `linear-gradient(135deg, ${theme.primary} 0%, ${theme.primaryDark} 100%)` 
    : props.completed 
      ? `linear-gradient(135deg, ${theme.success} 0%, #43A047 100%)`
      : theme.lightGray
  };
  color: ${props => (props.active || props.completed) ? 'white' : theme.darkGray};
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.85rem;
  transition: all 0.3s ease;
  box-shadow: ${props => props.active 
    ? '0 4px 12px rgba(255, 112, 67, 0.35)' 
    : 'none'
  };
`;
const StepConnector = styled.div`
  width: 40px;
  height: 2px;
  background: ${props => props.completed 
    ? `linear-gradient(90deg, ${theme.success}, #43A047)` 
    : theme.mediumGray
  };
  transition: all 0.3s ease;

  @media (max-width: 640px) {
    width: 100%;
    flex: 1;
  }
`;

const PaymentStepLayout = styled.div`
  display: grid;
  grid-template-columns: minmax(0, 1fr) 360px;
  gap: 1.25rem;
  align-items: start;

  @media (max-width: 900px) {
    grid-template-columns: 1fr;
  }
`;

const PaymentSidebar = styled.div`
  position: sticky;
  top: 0.75rem;
  align-self: start;

  @media (max-width: 900px) {
    position: static;
  }
`;

const LoadingIndicator = styled.div`
  display: inline-block;
  width: 1.25rem;
  height: 1.25rem;
  border: 3px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  border-top-color: #ffffff;
  animation: spin 1s linear infinite;
`;

// Enhanced loading overlay for post-payment processing
const ProcessingOverlay = styled.div`
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
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
  backdrop-filter: blur(10px);
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
  animation: ${fadeIn} 1s ease-out 0.5s both;
`;

// Enhanced success message with confetti effect
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
  
  &::before {
    content: '';
    position: absolute;
    top: -50%;
    left: -50%;
    width: 200%;
    height: 200%;
    background: repeating-linear-gradient(
      45deg,
      transparent,
      transparent 10px,
      rgba(255, 255, 255, 0.1) 10px,
      rgba(255, 255, 255, 0.1) 20px
    );
    animation: ${shimmer} 3s linear infinite;
  }
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
  
  svg {
    width: 40px;
    height: 40px;
    stroke-dasharray: 100;
    stroke-dashoffset: 100;
    animation: ${checkDraw} 1s ease-out 0.5s both;
  }
`;

const SuccessTitle = styled.h3`
  font-size: 1.8rem;
  font-weight: 700;
  margin: 0 0 0.5rem 0;
  animation: ${slideInFromLeft} 0.8s ease-out 0.3s both;
`;

const SuccessSubtitle = styled.p`
  font-size: 1.1rem;
  opacity: 0.9;
  margin: 0;
  animation: ${slideInFromRight} 0.8s ease-out 0.6s both;
`;

// Confetti particles
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

const ConfettiContainer = styled.div`
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  pointer-events: none;
  overflow: hidden;
`;

// ✅ NEW: Professional styled components for participant sections
const PrimaryBookerSection = styled.div`
  background: linear-gradient(135deg, rgba(255, 87, 34, 0.08) 0%, rgba(255, 152, 0, 0.05) 100%);
  padding: 1.75rem;
  border-radius: 20px;
  border: 2px solid ${theme.primary};
  margin-top: 0.5rem;
  position: relative;
  overflow: hidden;
  animation: ${fadeIn} 0.5s ease-out;

  &::before {
    content: '';
    position: absolute;
    top: 0;
    left: 0;
    right: 0;
    height: 3px;
    background: linear-gradient(90deg, ${theme.primary}, ${theme.accent}, ${theme.primary});
    background-size: 200% 100%;
    animation: ${shimmer} 2s infinite linear;
  }

  @media (max-width: 480px) {
    padding: 1.25rem;
  }
`;

const SectionHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1.25rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgba(51, 153, 204, 0.1);
`;

// REPLACE SectionIcon
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
  box-shadow: ${props => props.variant === 'green'
    ? '0 4px 12px rgba(76, 175, 80, 0.3)'
    : props.variant === 'black'
      ? '0 4px 12px rgba(0, 0, 0, 0.3)'
      : '0 4px 12px rgba(255, 87, 34, 0.4)'};
`;

const SectionTitle = styled.div`
  flex: 1;
`;

const SectionTitleText = styled.h3`
  margin: 0;
  font-size: 1.15rem;
  font-weight: 700;
  color: ${props => props.color || '#2c5aa0'};
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
  letter-spacing: -0.01em;
`;

const SectionSubtitle = styled.p`
  margin: 0.25rem 0 0;
  font-size: 0.85rem;
  color: #94a3b8;
  font-weight: 500;
`;

const ParticipantsSection = styled(PrimaryBookerSection)`
  background: linear-gradient(135deg, rgba(0, 0, 0, 0.05) 0%, rgba(66, 66, 66, 0.03) 100%);
  border-color: ${theme.secondary};
  
  &::before {
    background: linear-gradient(90deg, ${theme.secondary}, ${theme.darkGray}, ${theme.secondary});
  }
`;

const ParticipantCard = styled.div`
  background: white;
  padding: 1.5rem;
  border-radius: 16px;
  margin-bottom: ${props => props.isLast ? '0' : '1rem'};
  border: 2px solid ${props => props.isPrimary 
    ? 'rgba(51, 153, 204, 0.2)' 
    : 'rgba(226, 232, 240, 0.8)'};
  position: relative;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  animation: ${fadeIn} 0.4s ease-out ${props => props.delay || '0s'} both;

  ${props => props.isPrimary && css`
    box-shadow: 0 4px 15px rgba(51, 153, 204, 0.1);
    
    &::before {
      content: '';
      position: absolute;
      top: 0;
      left: 0;
      right: 0;
      height: 2px;
      background: linear-gradient(90deg, #3399cc, #00b4db);
    }
  `}

  &:hover {
    border-color: ${props => props.isPrimary 
      ? 'rgba(51, 153, 204, 0.35)' 
      : 'rgba(51, 153, 204, 0.2)'};
    transform: translateY(-2px);
    box-shadow: 0 8px 25px rgba(0, 0, 0, 0.08);
  }

  @media (max-width: 480px) {
    padding: 1.25rem;
  }
`;

const ParticipantHeader = styled.div`
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1.25rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid #f1f5f9;
`;

const ParticipantNumber = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
`;

const ParticipantAvatar = styled.div`
  width: 36px;
  height: 36px;
  border-radius: 10px;
  background: ${props => props.isPrimary 
    ? 'linear-gradient(135deg, #3399cc 0%, #00b4db 100%)' 
    : 'linear-gradient(135deg, #e2e8f0 0%, #cbd5e1 100%)'};
  color: ${props => props.isPrimary ? 'white' : '#64748b'};
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: 700;
  font-size: 0.9rem;
  flex-shrink: 0;
`;

const ParticipantLabel = styled.span`
  font-size: 1rem;
  font-weight: 600;
  color: #334155;
`;

const PrimaryBadge = styled.span`
  font-size: 0.7rem;
  background: linear-gradient(135deg, #3399cc, #00b4db);
  color: white;
  padding: 0.3rem 0.85rem;
  border-radius: 20px;
  font-weight: 700;
  letter-spacing: 0.03em;
  text-transform: uppercase;
  box-shadow: 0 2px 8px rgba(51, 153, 204, 0.3);
`;
// REPLACE FieldRow
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

const TrustBadges = styled.div`
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1.5rem;
  padding: 1rem 0;
  margin-top: 0.5rem;
  flex-wrap: wrap;

  @media (max-width: 480px) {
    gap: 1rem;
  }
`;

const TrustBadge = styled.div`
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8rem;
  color: #64748b;
  font-weight: 500;

  svg {
    color: #10b981;
    font-size: 0.9rem;
  }
`;

// Add these styled components with your other popup components

const AvailableMonthsSection = styled.div`
  margin-top: 1.5rem;
  padding-top: 1.5rem;
  border-top: 2px dashed ${theme.mediumGray};

  @media (max-width: 480px) {
    margin-top: 1rem;
    padding-top: 1rem;
  }
`;

const AvailableMonthsTitle = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.9rem;
  font-weight: 700;
  color: ${theme.secondary};
  margin-bottom: 1rem;
  
  svg {
    color: ${theme.primary};
  }
    @media (max-width: 480px) {
    font-size: 0.85rem;
    margin-bottom: 0.75rem;
  }
`;

const MonthsGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 0.5rem;
  
  @media (max-width: 400px) {
    grid-template-columns: repeat(2, 1fr);
  }
    @media (max-width: 350px) {
    grid-template-columns: repeat(2, 1fr);
  }
`;

const MonthBadge = styled.div`
  padding: 0.6rem 0.75rem;
  background: ${props => props.isCurrentMonth 
    ? `linear-gradient(135deg, ${theme.primary} 0%, ${theme.primaryDark} 100%)`
    : `linear-gradient(135deg, ${theme.cream} 0%, ${theme.peach} 100%)`
  };
  border: 2px solid ${props => props.isCurrentMonth ? theme.primary : theme.primaryLight};
  border-radius: 10px;
  text-align: center;
  font-size: 0.85rem;
  font-weight: 600;
  color: ${props => props.isCurrentMonth ? 'white' : theme.text};
  transition: all 0.2s ease;
  
  ${props => props.isCurrentMonth && `
    box-shadow: 0 4px 12px rgba(255, 112, 67, 0.3);
  `}
  
  .month-name {
    display: block;
    font-weight: 700;
  }
  
  .month-status {
    display: block;
    font-size: 0.7rem;
    margin-top: 2px;
    opacity: 0.8;
  }
     @media (max-width: 480px) {
    padding: 0.5rem 0.4rem;
    
    .month-name {
      font-size: 0.8rem;
    }
    
    .month-status {
      font-size: 0.6rem;
    }
  }

  
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
  
  svg {
    flex-shrink: 0;
    margin-top: 2px;
  }
    @media (max-width: 480px) {
    padding: 0.65rem 0.85rem;
    font-size: 0.8rem;
    margin-top: 0.75rem;
  }
`;

const ContactUsButton = styled.button`
  margin-top: 1rem;
  width: 100%;
  padding: 0.9rem 1.25rem;
  background: linear-gradient(135deg, #1976D2 0%, #1565C0 100%);
  border: none;
  border-radius: 10px;
  color: white;
  font-size: 0.95rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s ease;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
  
  &:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(25, 118, 210, 0.4);
  }

  @media (max-width: 480px) {
    padding: 0.8rem 1rem;
    font-size: 0.85rem;
    margin-top: 0.75rem;
  }
`;

const ParticipantCounter = styled.div`
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: #64748b;
  font-weight: 500;
  background: rgba(16, 185, 129, 0.08);
  padding: 0.4rem 0.85rem;
  border-radius: 20px;
  border: 1px solid rgba(16, 185, 129, 0.15);
`;

// REPLACE ErrorSpan
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

const BookingSummaryCard = styled.div`
  background: linear-gradient(135deg, hsla(0, 0%, 98%, 0.04) 0%, rgba(194, 27, 21, 0.04) 100%);
  padding: 1.5rem;
  border-radius: 16px;
  border: 2px solid rgba(9, 10, 10, 0.12);
  margin-bottom: 1rem;

  @media (min-width: 900px) {
    position: sticky;
    top: 0.75rem;
    align-self: flex-start;
    z-index: 1;
  }
`;

const SummaryHeader = styled.div`
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 1rem;
  padding-bottom: 0.75rem;
  border-bottom: 1px solid #383a3ccb;
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

  @media (max-width: 480px) {
    grid-template-columns: 1fr;
  }
`;

const SummaryItem = styled.div`
  font-size: 0.9rem;
  color: #475569;
  font-weight: 500;

  strong {
    color: #070707;
    font-weight: 600;
  }
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

const CouponSuccessDiv = styled.div`
  margin-top: 1rem;
  padding: 1rem;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 10px;
  animation: ${fadeIn} 1s ease-out 1s both;
`;

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

  svg {
    font-size: 1rem;
  }
`;
// NEW: First Row Layout (Image + Date/Participants)
const FirstRow = styled.div`
  display: grid;
  grid-template-columns: 280px 1fr;
  gap: 1.5rem;
  margin-bottom: 1rem;
  animation: ${slideInFromLeft} 0.6s ease-out;
  align-items: start;   /* 🔥 IMPORTANT FIX */
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
    bottom: 0;
    left: 0;
    right: 0;
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
  
  ${TrekImageContainer}:hover & {
    transform: scale(1.05);
  }

  @media (max-width: 768px) {
    height: 180px;
  }
`;


const TrekImageOverlay = styled.div`
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  padding: 1rem;
  z-index: 2;
  color: white;
  
  h3 {
    margin: 0 0 0.25rem 0;
    font-size: 1.1rem;
    font-weight: 700;
  }
  
  p {
    margin: 0;
    font-size: 0.85rem;
    opacity: 0.9;
    display: flex;
    align-items: center;
    gap: 0.3rem;
  }
`;

const RightColumn = styled.div`
  display: flex;
  flex-direction: column;
  gap: 1rem;
`;

// NEW: Interactive Info Card with built-in dropdown
const InteractiveCard = styled.div`
  background: ${props => props.isOpen 
    ? `linear-gradient(135deg, ${theme.white} 0%, ${theme.peach} 100%)`
    : `linear-gradient(135deg, ${theme.white} 0%, ${theme.cream} 100%)`};
  padding: 1.25rem;
  border-radius: 14px;
  border: 2px solid ${props => props.$invalid ? '#ef4444' : (props.isOpen ? theme.primary : theme.peach)};
  cursor: pointer;
  transition: all 0.3s cubic-bezier(0.4, 0, 0.2, 1);
  position: relative;
  box-shadow: ${props => props.isOpen 
    ? `0 8px 25px rgba(255, 112, 67, 0.2)` 
    : `0 2px 8px rgba(0, 0, 0, 0.06)`};
  
  &:hover {
    border-color: ${props => props.$invalid ? '#ef4444' : theme.primary};
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
  
  svg {
    color: ${theme.primary};
    font-size: 1rem;
  }
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

// Dropdown that appears inside the card
const CardDropdown = styled.div`
  max-height: ${props => props.isOpen ? '400px' : '0'};
  opacity: ${props => props.isOpen ? '1' : '0'};
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
  margin-top: ${props => props.isOpen ? '1rem' : '0'};
  padding-top: ${props => props.isOpen ? '1rem' : '0'};
  border-top: ${props => props.isOpen ? `1px solid ${theme.peach}` : 'none'};
`;

// Date Grid inside card
const MiniDateGrid = styled.div`
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem;
  max-height: 200px;
  overflow-y: auto;
  padding-right: 0.5rem;
  
  &::-webkit-scrollbar {
    width: 4px;
  }
  
  &::-webkit-scrollbar-track {
    background: ${theme.cream};
    border-radius: 2px;
  }
  
  &::-webkit-scrollbar-thumb {
    background: ${theme.primaryLight};
    border-radius: 2px;
  }
`;

const MiniDateOption = styled.button`
  padding: 0.75rem;
  background: ${props => props.selected 
    ? `linear-gradient(135deg, ${theme.primary} 0%, ${theme.primaryDark} 100%)` 
    : theme.white};
  color: ${props => props.selected ? 'white' : theme.text};
  border: 2px solid ${props => props.selected ? theme.primary : theme.mediumGray};
  border-radius: 10px;
  font-size: 0.85rem;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.2s ease;
  text-align: center;
  
  &:hover {
    background: ${props => props.selected 
      ? `linear-gradient(135deg, ${theme.primaryDark} 0%, #E64A19 100%)` 
      : theme.peach};
    border-color: ${theme.primary};
    transform: scale(1.02);
  }
  
  span {
    display: block;
    font-size: 0.75rem;
    font-weight: 500;
    opacity: 0.8;
    margin-top: 2px;
  }
`;

// Participant count options
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

// Status badge for selected items
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

const DateParticipantBox = styled.div`
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 1.5rem;
`;

const InfoCard = styled.div`
  background: linear-gradient(135deg, ${theme.secondary} 0%, #2a2a2a 100%);
  padding: 1.5rem;
  border-radius: 16px;
  border: 2px solid ${theme.primary};
  color: ${theme.white};
  box-shadow: 0 8px 20px rgba(255, 87, 34, 0.3);
  
  h3 {
    margin: 0 0 0.75rem 0;
    font-size: 1.1rem;
    color: ${theme.accent};
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  
  p {
    margin: 0;
    font-size: 1.3rem;
    font-weight: 700;
    color: ${theme.white};
  }
`;


// REPLACE DetailBox - Lighter version
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
      top: 0;
      left: 0;
      right: 0;
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

// REPLACE DetailBoxHeader
const DetailBoxHeader = styled.div`
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: ${props => props.isExpanded ? '1.25rem' : '0'};
`;

// REPLACE DetailBoxTitle
const DetailBoxTitle = styled.h3`
  margin: 0;
  font-size: 1rem;
  font-weight: 700;
  color: ${theme.text};
  display: flex;
  align-items: center;
  gap: 0.6rem;
  
  svg {
    color: ${theme.primary};
  }
`;

// Status indicator
const StatusDot = styled.span`
  width: 8px;
  height: 8px;
  border-radius: 50%;
  background: ${props => props.completed ? theme.success : theme.mediumGray};
  margin-left: 0.5rem;
`;


// REPLACE DetailBoxContent
const DetailBoxContent = styled.div`
  max-height: ${props => props.isExpanded ? '800px' : '0'};
  opacity: ${props => props.isExpanded ? '1' : '0'};
  overflow: hidden;
  transition: all 0.4s cubic-bezier(0.4, 0, 0.2, 1);
`;

// REPLACE DoneButton - Softer style
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

const NavigationButtons = styled.div`
  display: flex;
  gap: 1rem;
  margin-top: 2rem;
`;

const PreviousButton = styled(Button)`
  background: transparent;
  border: 2px solid ${theme.primary};
  color: ${theme.primary};
  
  &:hover {
    background: ${theme.primary};
    color: ${theme.white};
  }
  
  &:disabled {
    opacity: 0.5;
    cursor: not-allowed;
  }
`;

// Main Component
const BookingModal = ({ isOpen, onClose, trek, onBookingSuccess }) => {
  const navigate = useNavigate();
  const modalBodyRef = useRef(null);
  const [step, setStep] = useState(1);
 // ✅ NEW: Separate form data from participant data
const [formData, setFormData] = useState({
  startDate: '',
  totalParticipants: 1,  // ✅ CHANGED from 'participants'
  specialRequests: ''
});

// ✅ NEW: Primary booker info (auto-filled from Firebase Auth)
const [primaryBooker, setPrimaryBooker] = useState({
  name: '',
  email: '',
  contactNumber: ''
});

// ✅ NEW: Array of participants
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
  
  // Coupon related states
  const [activeCoupon, setActiveCoupon] = useState(null);
  const [originalAmount, setOriginalAmount] = useState(0);
  const [discountAmount, setDiscountAmount] = useState(0);
  
  // Custom date picker states
  const [isDatePickerOpen, setIsDatePickerOpen] = useState(false);
  const [selectedDateFormatted, setSelectedDateFormatted] = useState('');
  

  // Add these state variables after your existing useState declarations
const [showUnavailableDatePopup, setShowUnavailableDatePopup] = useState(false);
const [selectedUnavailableDate, setSelectedUnavailableDate] = useState(null);

// ADD these new state variables (after existing useState declarations)
const [isDateCardOpen, setIsDateCardOpen] = useState(false);
const [isParticipantCardOpen, setIsParticipantCardOpen] = useState(false);
const [currentExpandedBox, setCurrentExpandedBox] = useState(null);
const [completedBoxes, setCompletedBoxes] = useState(new Set());

// ADD helper functions
const handleDateCardToggle = (e) => {
  e.stopPropagation();
  setIsDateCardOpen(!isDateCardOpen);
  setIsParticipantCardOpen(false); // Close other card
};

const handleParticipantCardToggle = (e) => {
  e.stopPropagation();
  setIsParticipantCardOpen(!isParticipantCardOpen);
  setIsDateCardOpen(false); // Close other card
};

// Replace your existing handleDateSelect function with this:

const handleDateSelect = (date) => {
  if (!date) return;
  
  // Convert Date object to YYYY-MM-DD string
  const dateStr = date instanceof Date 
    ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
    : date;
  
  // Check if date is available
  if (!isDateAvailable(dateStr)) {
    // Show unavailable date popup
    setSelectedUnavailableDate(date);
    setShowUnavailableDatePopup(true);
    return;
  }
  
  // Date is available - proceed normally
  setFormData(prev => ({ ...prev, startDate: dateStr }));
  setSelectedDateFormatted(formatDateForDisplay(dateStr));
  setIsDateCardOpen(false);
  
  if (errors.startDate) {
    setErrors(prev => ({ ...prev, startDate: undefined }));
  }
};

// Handler for selecting an available date from the popup
const handleSelectAvailableDate = (dateStr) => {
  setFormData(prev => ({ ...prev, startDate: dateStr }));
  setSelectedDateFormatted(formatDateForDisplay(dateStr));
  setShowUnavailableDatePopup(false);
  setSelectedUnavailableDate(null);
  setIsDateCardOpen(false);
  
  if (errors.startDate) {
    setErrors(prev => ({ ...prev, startDate: undefined }));
  }
};

// Handler to close popup and re-open date picker
const handleChooseAnotherDate = () => {
  setShowUnavailableDatePopup(false);
  setSelectedUnavailableDate(null);
  setIsDateCardOpen(true);
};

// Handler to just close the popup
const handleCloseUnavailablePopup = () => {
  setShowUnavailableDatePopup(false);
  setSelectedUnavailableDate(null);
};

// Get future available dates for the popup
const getFutureAvailableDates = () => {
  if (!trek.availableDates || !Array.isArray(trek.availableDates)) {
    return [];
  }
  
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  return trek.availableDates
    .filter(dateStr => {
      const date = new Date(dateStr);
      return date >= today;
    })
    .sort((a, b) => new Date(a) - new Date(b))
    .slice(0, 6); // Show max 6 dates in popup
};

// Format date for popup display
const formatDateForPopup = (dateStr) => {
  const date = new Date(dateStr);
  return {
    day: date.toLocaleDateString('en-US', { weekday: 'short' }),
    full: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  };
};

const handleParticipantSelect = (count) => {
  const currentParticipants = [...participants];
  const clampedCount = Math.max(1, Math.min(10, Number(count) || 1));
  
  if (clampedCount > currentParticipants.length) {
    const newParticipants = [];
    for (let i = currentParticipants.length; i < clampedCount; i++) {
      newParticipants.push({
        participantId: `p${i + 1}`,
        name: '',
        email: '',
        age: '',
        emergencyContact: '',
        isPrimaryBooker: false
      });
    }
    setParticipants([...currentParticipants, ...newParticipants]);
  } else if (clampedCount < currentParticipants.length) {
    setParticipants(currentParticipants.slice(0, clampedCount));
  }
  
  setFormData(prev => ({ ...prev, totalParticipants: clampedCount }));
  setIsParticipantCardOpen(false);

  // Keep expanded state + completed state consistent when shrinking
  if (clampedCount < currentParticipants.length) {
    setCompletedBoxes(prev => {
      const next = new Set();
      prev.forEach((id) => {
        if (id === 'primary') next.add(id);
        if (id.startsWith('participant-')) {
          const idx = Number(id.split('-')[1]);
          if (Number.isFinite(idx) && idx < clampedCount) next.add(id);
        }
      });
      return next;
    });

    setCurrentExpandedBox(prev => {
      if (!prev) return prev;
      if (prev === 'primary') return prev;
      if (prev.startsWith('participant-')) {
        const idx = Number(prev.split('-')[1]);
        if (Number.isFinite(idx) && idx >= clampedCount) return null;
      }
      return prev;
    });

    // Clear any errors for removed participants
    setErrors(prev => {
      const next = { ...(prev || {}) };
      Object.keys(next).forEach((k) => {
        const m = /^participant_(\d+)_/.exec(k);
        if (m) {
          const idx = Number(m[1]);
          if (Number.isFinite(idx) && idx >= clampedCount) {
            delete next[k];
          }
        }
      });
      return next;
    });
  }
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
      primaryBooker.name?.trim() &&
      primaryBooker.email?.trim() &&
      emailRegex.test(primaryBooker.email) &&
      primaryBooker.contactNumber?.trim() &&
      isValidIndianMobile(primaryBooker.contactNumber)
    );
  }
  const index = parseInt(boxId.split('-')[1]);
  const p = participants[index];
  if (!p) return false;
  const nameOk = p.name?.trim() !== '';
  const emailOk = !p.email?.trim() || emailRegex.test(p.email);
  const ageOk = isValidAge(p.age);
  const emergencyOk = !p.emergencyContact?.trim() || isValidIndianMobile(p.emergencyContact);
  return nameOk && emailOk && ageOk && emergencyOk;
};






  // Format date for display
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

  // Handle custom date picker selection
  const handleCustomDateSelect = (dateString) => {
    setFormData(prevData => ({
      ...prevData,
      startDate: dateString
    }));
    setSelectedDateFormatted(formatDateForDisplay(dateString));
    setIsDatePickerOpen(false);
    
    // Clear date error if it exists
    if (errors.startDate) {
      setErrors(prevErrors => ({
        ...prevErrors,
        startDate: undefined
      }));
    }
  };

  // Get available dates for the calendar
  const getAvailableDatesForCalendar = () => {
    if (trek.availableDates && Array.isArray(trek.availableDates) && trek.availableDates.length > 0) {
      // Filter to only future dates and return them
      return trek.availableDates.filter(dateStr => {
        const date = new Date(dateStr);
        return date >= today;
      }).sort();
    }
    return [];
  };








  // Get the number of days from the start of the current month to create a minimum date
  const today = new Date();
  const minBookingDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  const availableDatesForCalendar = getAvailableDatesForCalendar();
  
  // Create a function to check if a date is available for booking
  const isDateAvailable = useCallback((dateString) => {
    const date = new Date(dateString);
    
    // Check if the date is in the past
    if (date < today) {
      return false;
    }
    
    // If specific available dates are defined by admin, ONLY allow those dates
    if (trek.availableDates && Array.isArray(trek.availableDates) && trek.availableDates.length > 0) {
      const formattedDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
      console.log("Checking if date", formattedDate, "is in available dates:", trek.availableDates);
      return trek.availableDates.includes(formattedDate);
    }
    
    // Fallback to available months check if no specific dates are set
    if (trek.availableMonths && Array.isArray(trek.availableMonths) && trek.availableMonths.length > 0) {
      const month = date.getMonth(); // 0-indexed (January is 0)
      return trek.availableMonths.includes(month);
    }
    
    // If neither availableDates nor availableMonths are defined, allow all future dates
    return true;
  }, [today, trek]);
  
  // Function to get availability display text
  const getAvailabilityDisplay = () => {
    // If specific dates are available, show date count
    if (trek.availableDates && trek.availableDates.length > 0) {
      const futureDates = trek.availableDates.filter(dateStr => {
        const date = new Date(dateStr);
        return date >= today;
      });
      
      if (futureDates.length === 0) {
        return 'No dates currently available';
      }
      
      if (futureDates.length <= 5) {
        // Show actual dates if there are 5 or fewer
        return futureDates.map(dateStr => {
          const date = new Date(dateStr);
          return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
          });
        }).join(', ');
      } else {
        return `${futureDates.length} specific dates available`;
      }
    }
    
    // Fallback to available months
    if (trek.availableMonths && trek.availableMonths.length > 0) {
      const monthNames = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
      ];
      
      return trek.availableMonths
        .sort((a, b) => a - b)
        .map(monthIndex => monthNames[monthIndex])
        .join(', ');
    }
    
    return 'All year';
  };
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
      
      // ✅ NEW: Set primary booker info
      const bookerInfo = {
        name: auth.currentUser.displayName || userProfileData.name || userProfileData.firstName || '',
        email: auth.currentUser.email || userProfileData.email || '',
        contactNumber: userProfileData.phone || userProfileData.phoneNumber || userProfileData.contactNumber || auth.currentUser.phoneNumber || '',
      };
      
      setPrimaryBooker(bookerInfo);
      
      // ✅ NEW: Set first participant as primary booker
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
    }
  };
  
  if (isOpen) {
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
}, [isOpen, trek]);

  // Additional useEffect to handle date input restrictions and click outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Close date picker if clicking outside
      if (isDatePickerOpen && !event.target.closest('.date-picker-container')) {
        setIsDatePickerOpen(false);
      }
    };

    if (isDatePickerOpen) {
      document.addEventListener('click', handleClickOutside);
      return () => {
        document.removeEventListener('click', handleClickOutside);
      };
    }
  }, [isDatePickerOpen]);

  // Additional useEffect to handle date input restrictions
  useEffect(() => {
    if (isOpen && availableDatesForCalendar.length > 0) {
      // Add custom validation for the date input
      const dateInput = document.querySelector('input[name="startDate"]');
      if (dateInput) {
        const handleDateChange = (e) => {
          const selectedDate = e.target.value;
          if (selectedDate && !isDateAvailable(selectedDate)) {
            e.target.setCustomValidity('Please select from the available dates only');
            e.target.reportValidity();
          } else {
            e.target.setCustomValidity('');
          }
        };

        dateInput.addEventListener('change', handleDateChange);
        
        // Cleanup
        return () => {
          dateInput.removeEventListener('change', handleDateChange);
        };
      }
    }
  }, [isOpen, availableDatesForCalendar, isDateAvailable]);
  const validateStep1 = ({ set = true } = {}) => {
    const newErrors = {};

    if (!formData.startDate) {
      newErrors.startDate = "Start date is required";
    } else if (!isDateAvailable(formData.startDate)) {
      if (trek.availableDates && Array.isArray(trek.availableDates) && trek.availableDates.length > 0) {
        const futureDates = trek.availableDates.filter(dateStr => {
          const date = new Date(dateStr);
          return date >= today;
        });
        
        if (futureDates.length === 0) {
          newErrors.startDate = "No dates are currently available for this trek.";
        } else {
          newErrors.startDate = "This date is not available for booking. Please select from the available dates.";
        }
      } else {
        newErrors.startDate = "Selected date is not available for booking.";
      }
    }
    
    if (!primaryBooker.name?.trim()) {
      newErrors.primaryBooker_name = "Your name is required";
    }
    
    if (!primaryBooker.email?.trim()) {
      newErrors.primaryBooker_email = "Your email is required";
    } else if (!emailRegex.test(primaryBooker.email)) {
      newErrors.primaryBooker_email = "Email is invalid";
    }
    
    if (!primaryBooker.contactNumber?.trim()) {
      newErrors.primaryBooker_contactNumber = "Contact number is required";
    } else if (!isValidIndianMobile(primaryBooker.contactNumber)) {
      newErrors.primaryBooker_contactNumber = "Contact number must be 10 digits";
    }
    
    participants.forEach((participant, index) => {
      if (!participant.name || participant.name.trim() === '') {
        newErrors[`participant_${index}_name`] = `Participant ${index + 1} name is required`;
      }
      
      if (participant.email && participant.email.trim() && !emailRegex.test(participant.email)) {
        newErrors[`participant_${index}_email`] = `Invalid email for Participant ${index + 1}`;
      }

      if (!isValidAge(participant.age)) {
        newErrors[`participant_${index}_age`] = `Age must be between 1 and 100`;
      }
      
      if (participant.emergencyContact && participant.emergencyContact.trim() && !isValidIndianMobile(participant.emergencyContact)) {
        newErrors[`participant_${index}_emergencyContact`] = `Emergency contact must be 10 digits`;
      }
    });
    
    if (set) setErrors(newErrors);
    return { isValid: Object.keys(newErrors).length === 0, newErrors };
  };

  const focusFirstInvalidField = useCallback((newErrors) => {
    const container = modalBodyRef.current;
    if (!container) return;

    const errorKeys = Object.keys(newErrors || {});
    if (errorKeys.length === 0) return;

    // Deterministic priority order (primary booker first, then participants).
    const order = [
      'startDate',
      'primaryBooker_name',
      'primaryBooker_email',
      'primaryBooker_contactNumber',
      ...errorKeys.filter(k => k.startsWith('participant_')),
      ...errorKeys
    ];

    const key = order.find(k => newErrors?.[k]) || errorKeys[0];

    // Try to locate by explicit data-field, otherwise fallback to aria-invalid.
    const byKey = container.querySelector(`[data-field="${CSS.escape(key)}"]`);
    const el = byKey || container.querySelector('[aria-invalid="true"]');
    if (!el) return;

    // Smooth scroll inside the modal body.
    try {
      el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
    } catch {
      // ignore
    }

    // Focus after scroll begins; avoid blocking on mobile.
    window.setTimeout(() => {
      if (typeof el.focus === 'function') {
        el.focus({ preventScroll: true });
      }
    }, 250);
  }, []);

  const handleChange = (e) => {
    const { name, value } = e.target;
    
    // Special handling for date input to provide immediate feedback
    if (name === 'startDate' && value) {
      const isValidDate = isDateAvailable(value);
      if (!isValidDate) {
        // Set a temporary error to provide immediate feedback
        if (trek.availableDates && Array.isArray(trek.availableDates) && trek.availableDates.length > 0) {
          const futureDates = trek.availableDates.filter(dateStr => {
            const date = new Date(dateStr);
            return date >= today;
          });
          
          setErrors(prevErrors => ({
            ...prevErrors,
            startDate: futureDates.length === 0 
              ? "No dates are currently available for this trek."
              : "This date is not available for booking. Please select from the available dates shown below."
          }));
        } else {
          setErrors(prevErrors => ({
            ...prevErrors,
            startDate: `This trek is only available during: ${getAvailabilityDisplay()}`
          }));
        }
      } else {
        // Clear the error if the date is valid
        setErrors(prevErrors => ({
          ...prevErrors,
          startDate: undefined
        }));
      }
    }
    
    setFormData(prevData => ({
      ...prevData,
      [name]: value
    }));
    
    // Clear error when field is edited (except for the special date handling above)
    if (errors[name] && name !== 'startDate') {
      setErrors(prevErrors => ({
        ...prevErrors,
        [name]: undefined
      }));
    }
  };



  // Add these helper functions with your other functions

// Get available months for display
const getAvailableMonths = () => {
  const monthNames = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
  ];
  
  if (trek.availableMonths && Array.isArray(trek.availableMonths) && trek.availableMonths.length > 0) {
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

// Check if trek has any availability info
const hasAvailabilityInfo = () => {
  const hasDates = trek.availableDates && Array.isArray(trek.availableDates) && trek.availableDates.length > 0;
  const hasMonths = trek.availableMonths && Array.isArray(trek.availableMonths) && trek.availableMonths.length > 0;
  return hasDates || hasMonths;
};

// Get next available month name
const getNextAvailableMonth = () => {
  const months = getAvailableMonths();
  const currentMonth = new Date().getMonth();
  
  // Find next future month
  const futureMonth = months.find(m => m.index >= currentMonth);
  if (futureMonth) {
    return futureMonth.name;
  }
  
  // If no future month this year, return first month (next year)
  if (months.length > 0) {
    return `${months[0].name} (next year)`;
  }
  
  return null;
};






  // ✅ NEW: Handle total participants change
const handleParticipantCountChange = (e) => {
  const count = parseInt(e.target.value);
  setFormData(prev => ({ ...prev, totalParticipants: count }));
  
  const currentParticipants = [...participants];
  
  if (count > currentParticipants.length) {
    const newParticipants = [];
    for (let i = currentParticipants.length; i < count; i++) {
      newParticipants.push({
        participantId: `p${i + 1}`,
        name: '',
        email: '',
        age: '',
        emergencyContact: '',
        isPrimaryBooker: false
      });
    }
    setParticipants([...currentParticipants, ...newParticipants]);
  } else if (count < currentParticipants.length) {
    setParticipants(currentParticipants.slice(0, count));
  }
};

// ✅ NEW: Handle individual participant field change
const handleParticipantChange = (index, field, value) => {
  const updatedParticipants = [...participants];
  updatedParticipants[index] = {
    ...updatedParticipants[index],
    [field]: value
  };
  setParticipants(updatedParticipants);
  
  if (errors[`participant_${index}_${field}`]) {
    setErrors(prev => ({
      ...prev,
      [`participant_${index}_${field}`]: undefined
    }));
  }
};

// ✅ NEW: Handle primary booker info change
const handlePrimaryBookerChange = (field, value) => {
  const errorKey =
    field === 'name'
      ? 'primaryBooker_name'
      : field === 'email'
        ? 'primaryBooker_email'
        : field === 'contactNumber'
          ? 'primaryBooker_contactNumber'
          : field;

  setPrimaryBooker(prev => ({
    ...prev,
    [field]: value
  }));
  
  if (participants[0]?.isPrimaryBooker) {
    const updatedParticipants = [...participants];
    updatedParticipants[0] = {
      ...updatedParticipants[0],
      ...(field === 'contactNumber'
        ? { emergencyContact: value }
        : { [field]: value })
    };
    setParticipants(updatedParticipants);
  }
  
  if (errors[errorKey]) {
    setErrors(prev => ({
      ...prev,
      [errorKey]: undefined
    }));
  }
};

  const handleSubmit = (e) => {
    e.preventDefault();
    
    const { isValid, newErrors } = validateStep1({ set: true });
    if (isValid) {
      setStep(2);
    } else {
      requestAnimationFrame(() => focusFirstInvalidField(newErrors));
    }
  };
  const calculateTotalPrice = useCallback(() => {
  const basePrice = trek?.numericPrice || parseInt(trek?.price?.replace(/[^0-9]/g, '')) || 0;
  const subtotal = basePrice * formData.totalParticipants;  // ✅ CHANGED
  
  if (activeCoupon) {
    return Math.max(subtotal - discountAmount, 0);
  }
  return subtotal;
}, [trek, formData.totalParticipants, activeCoupon, discountAmount]);  // ✅ CHANGED dependency
  
  // Handle coupon application
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
   const handlePaymentProcess = async () => {
  try {
    const { isValid, newErrors } = validateStep1({ set: true });
    if (!isValid) {
      setStep(1);
      setPaymentError('Please fix the highlighted fields before proceeding to payment.');
      requestAnimationFrame(() => focusFirstInvalidField(newErrors));
      return;
    }

    setIsProcessingPayment(true);
    setPaymentError(null);
    
    const total = calculateTotalPrice();
    const baseAmount = trek?.numericPrice * formData.totalParticipants || total;  // ✅ CHANGED
    
    // ✅ NEW: Prepare complete booking data
    const bookingData = {
      // Primary booker info
      primaryBooker: {
        uid: auth.currentUser?.uid || null,
        ...primaryBooker
      },
      
      // All participants
      participants: participants,
      
      // Trek details
      trekId: trek.id,
      trekName: trek.name,
      startDate: formData.startDate,
      
      // Pricing
      pricePerPerson: trek?.numericPrice,
      totalParticipants: formData.totalParticipants,
      subtotal: baseAmount,
      discount: discountAmount,
      totalAmount: total,
      
      // Coupon info
      coupon: activeCoupon ? {
        id: activeCoupon.id,
        code: activeCoupon.code,
        discount: discountAmount,
        discountType: activeCoupon.discountType,
        originalAmount: baseAmount,
        finalAmount: total
      } : null,
      
      // Additional info
      specialRequests: formData.specialRequests || '',
      createdAt: new Date().toISOString()
    };
    
    console.log('🔍 Booking data being sent:', bookingData);
    console.log('👥 Participants:', participants);
    
    const paymentResult = await processBookingPayment(trek, bookingData);  // ✅ CHANGED
      
      if (paymentResult.success) {
        // Store bookingId in component state
        const orderId = paymentResult.orderId || `order_${Date.now()}`;
        setBookingId(orderId);
        
        // Also store it in global variable for redundancy/recovery
        window.lastRazorpayBookingId = orderId;
        
        console.log('Payment initiated with booking ID:', orderId);
        
        // Log all places where the bookingId is stored
        console.log('BookingID stored in: 1) Component state:', orderId, 
                   '2) Global variable:', window.lastRazorpayBookingId);
        
        // Razorpay will open its payment window automatically
        // We'll handle success in a callback from Razorpay
      } else {
        setPaymentError(paymentResult.error || "Payment processing failed");
      }
    } catch (error) {
      console.error("Payment error:", error);
      setPaymentError(error.message || "Failed to process payment");
    } finally {
      setIsProcessingPayment(false);
    }
  };  // Define handlePaymentSuccess as a useCallback to fix the dependency warning
  const handlePaymentSuccess = useCallback(async (response) => {
    try {
      setIsProcessingPayment(false);
      setIsProcessingBooking(true); // Show post-payment processing
      
      if (!bookingId) {
        console.warn('⚠️ No bookingId set in component state before payment success');
      }
      
      // Make sure we're sending the bookingId through ALL possible paths for maximum redundancy
      const paymentResponse = {
        ...response,
        bookingId: bookingId || response.bookingId || response.razorpay_order_id,
        orderId: bookingId || response.razorpay_order_id, 
        verifiedBookingId: bookingId, // Add a dedicated field that won't be accidentally overwritten
        // Store in notes as well for triple redundancy
        notes: {
          ...(response.notes || {}),
          bookingId: bookingId || response.notes?.bookingId,
          backupId: bookingId // Another backup path
        }
      };
      
      // Also set the global backup variable for extra redundancy
      window.lastRazorpayBookingId = bookingId || 
                                     response.bookingId || 
                                     response.razorpay_order_id || 
                                     response.notes?.bookingId;
      
      console.log('Processing payment success with bookingId:', bookingId, 'and response:', paymentResponse);
      
      // Double-check that we have a valid ID to use (any of these should work)
      let effectiveBookingId = bookingId || 
                              paymentResponse.bookingId || 
                              paymentResponse.razorpay_order_id ||
                              paymentResponse.notes?.bookingId || 
                              paymentResponse.notes?.backupId ||
                              window.lastRazorpayBookingId;
                              
      // Always ensure we have SOME bookingId, even if we need to generate one
      if (!effectiveBookingId) {
        const fallbackId = `fallback_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
        console.warn(`⚠️ No bookingId found in any path, using fallback: ${fallbackId}`);
        effectiveBookingId = fallbackId;
        
        // Update the response object with the fallback ID
        paymentResponse.bookingId = fallbackId;
        paymentResponse.fallbackIdGenerated = true;
      }
      
      console.log('✅ Final booking ID for payment verification:', effectiveBookingId);
      
      // Verify and complete the payment - pass both parameters
      const completedBooking = await completeBookingPayment(effectiveBookingId, paymentResponse);
      
      // Send confirmation email
      try {
        console.log('📧 Sending booking confirmation email...');
        console.log('🔍 Current formData:', formData);
        console.log('🔍 Completed booking data:', completedBooking);
        
        // Fetch the complete booking data directly from Firestore to ensure we have all fields
        console.log('🔄 Fetching complete booking data from Firestore...');
        const bookingRef = doc(db, 'bookings', effectiveBookingId);
        const bookingSnap = await getDoc(bookingRef);
        
        let completeBookingData = null;
        if (bookingSnap.exists()) {
          completeBookingData = { id: bookingSnap.id, ...bookingSnap.data() };
          console.log('✅ Retrieved complete booking data from Firestore:', completeBookingData);
        } else {
          console.warn('⚠️ Booking not found in Firestore, using available data');
          completeBookingData = completedBooking || formData;
        }
        
        // Prepare booking data for email with multiple fallbacks
        const emailBookingData = {
          id: effectiveBookingId,
          bookingId: effectiveBookingId,
          name: completeBookingData.name || 
                completeBookingData.userName || 
                completedBooking?.name || 
                formData.name || 
                'Customer',
          email: completeBookingData.email || 
                 completeBookingData.userEmail || 
                 completedBooking?.email || 
                 formData.email,
          contactNumber: completeBookingData.contactNumber || 
                        completeBookingData.phoneNumber || 
                        completedBooking?.contactNumber || 
                        formData.contactNumber || 
                        'Not provided',
          startDate: completeBookingData.startDate || 
                     completeBookingData.trekDate || 
                     completedBooking?.startDate || 
                     formData.startDate || 
                     'Date not specified',
          participants: completeBookingData.participants || 
                       completeBookingData.numberOfParticipants || 
                       completedBooking?.participants || 
                       formData.participants || 
                       1,
          totalAmount: completeBookingData.totalAmount || 
                      completeBookingData.amount || 
                      calculateTotalPrice(),
          paymentId: paymentResponse.razorpay_payment_id,
          status: 'confirmed',
          paymentStatus: 'completed',
          specialRequests: completeBookingData.specialRequests || 
                          completeBookingData.notes || 
                          completedBooking?.specialRequests || 
                          formData.specialRequests || 
                          'None',
          discountAmount: discountAmount,
          createdAt: completeBookingData.createdAt || new Date().toISOString()
        };
        
        console.log('📤 Email booking data prepared with fallbacks:', emailBookingData);
        
        // Validate that we have the minimum required data for email
        if (!emailBookingData.email) {
          console.error('❌ Cannot send email: No email address available');
          console.warn('⚠️ Email sending skipped due to missing email address');
          return;
        }
        
        // Send the email
        const emailSent = await emailService.sendConfirmationEmail(emailBookingData, trek);
        
        if (emailSent) {
          console.log('✅ Booking confirmation email sent successfully');
        } else {
          console.warn('⚠️ Failed to send confirmation email, but booking was successful');
        }
      } catch (emailError) {
        console.error('❌ Error sending confirmation email:', emailError);
        // Don't fail the booking process if email fails
      }
      
      // Show success message and animation
      setIsProcessingBooking(false);
      setPaymentSuccess(true);
      setShowSuccessAnimation(true);
      
      // Notify parent component
      if (onBookingSuccess) {
        onBookingSuccess(effectiveBookingId || bookingId);
      }
      
      // Wait for success animation to complete before navigation
      setTimeout(() => {
        // Navigate to booking confirmation page
        navigate(`/booking-confirmation/${effectiveBookingId}`);
        
        // Close modal after navigation
        setTimeout(() => {
          onClose();
          // Reset form state
          setStep(1);
          setFormData({
  startDate: '',
  totalParticipants: 1,
  specialRequests: ''
});
setPrimaryBooker({
  name: '',
  email: '',
  contactNumber: ''
});
setParticipants([
  {
    participantId: 'p1',
    name: '',
    email: '',
    age: '',
    emergencyContact: '',
    isPrimaryBooker: true
  }
]);
          setPaymentSuccess(false);
          setShowSuccessAnimation(false);
          setBookingId(null);
          setActiveCoupon(null);
          setDiscountAmount(0);
        }, 500);
      }, 3000); // Show success animation for 3 seconds
    } catch (error) {
      console.error("Payment verification error:", error);
      setPaymentError(error.message || "Failed to verify payment");
      setIsProcessingBooking(false);
    } finally {
      setIsProcessingPayment(false);
    }
  }, [bookingId, onBookingSuccess, onClose, navigate]); // Added navigate to dependencies

  // Define handlePaymentFailure as a useCallback to fix the dependency warning
  const handlePaymentFailure = useCallback(async (error) => {
    try {
      if (bookingId) {
        await handleBookingPaymentFailure(bookingId, error);
      }
      
      // Send payment failure email if we have user email
      if (formData.email && formData.name) {
        try {
          console.log('📧 Sending payment failure email...');
          
          const emailBookingData = {
            id: bookingId || 'unknown',
            name: formData.name,
            email: formData.email,
            contactNumber: formData.contactNumber,
            startDate: formData.startDate,
            participants: formData.participants,
            totalAmount: calculateTotalPrice(),
            errorMessage: error.description || error.message || "Payment processing failed"
          };
          
          await emailService.sendPaymentFailureEmail(emailBookingData, trek, error.description || error.message || "Payment failed");
          console.log('✅ Payment failure email sent successfully');
        } catch (emailError) {
          console.error('❌ Error sending payment failure email:', emailError);
          // Don't fail the error handling if email fails
        }
      }
      
      setPaymentError(error.description || error.message || "Payment failed");
    } catch (err) {
      console.error("Error handling payment failure:", err);
      setPaymentError("Payment failed: " + (error.description || error.message || "Unknown error"));
    }
  }, [bookingId, formData, trek, calculateTotalPrice, discountAmount]); // Added dependencies for email functionality
  // Set up global handlers for Razorpay response
  useEffect(() => {
    // Capture the current bookingId in closure for use in handlers
    const currentBookingId = bookingId;
    
    // Store it globally as early as possible, even before payment starts
    if (currentBookingId) {
      console.log('🔑 Pre-storing bookingId in global storage:', currentBookingId);
      window.lastRazorpayBookingId = currentBookingId;
    }
    
    // Setting up global handlers for Razorpay
    window.onRazorpaySuccess = function(response) {
      console.log('👋 Razorpay success callback triggered with response:', response);
      console.log('👋 Current component bookingId:', currentBookingId);
      
      // Add the bookingId to the response through multiple reliable paths for maximum redundancy
      const enhancedResponse = {
        ...response,
        // Critical ID fields
        bookingId: currentBookingId || response.bookingId || response.razorpay_order_id,
        verifiedBookingId: currentBookingId, // Add an explicit verified field
        orderId: currentBookingId || response.razorpay_order_id,
        // Backup in notes object too
        notes: {
          ...(response.notes || {}),
          bookingId: currentBookingId || response.notes?.bookingId,
          backupId: currentBookingId, // Another backup path
          timestamp: Date.now()
        }
      };
      
      console.log('✅ Enhanced Razorpay response with bookingId:', enhancedResponse);
      
      // Always store in global variable for redundancy
      window.lastRazorpayBookingId = currentBookingId || 
                                     response.bookingId || 
                                     response.razorpay_order_id || 
                                     response.notes?.bookingId;
      
      // Use our handler with the enhanced response                               
      handlePaymentSuccess(enhancedResponse);
    };

    window.onRazorpayFailure = function(response) {
      handlePaymentFailure(response);
    };
    
    // Always store current booking ID in global context for backup access
    if (currentBookingId) {
      window.lastRazorpayBookingId = currentBookingId;
    }
    
    // Cleanup function to remove handlers when component unmounts
    return () => {
      window.onRazorpaySuccess = null;
      window.onRazorpayFailure = null;
      // Don't clear window.lastRazorpayBookingId as it might be needed for recovery
    };
  }, [bookingId, handlePaymentSuccess, handlePaymentFailure]);

  const canProceedToPayment = React.useMemo(() => {
    return validateStep1({ set: false }).isValid;
  }, [
    formData.startDate,
    formData.totalParticipants,
    primaryBooker.name,
    primaryBooker.email,
    primaryBooker.contactNumber,
    participants,
    trek,
    isDateAvailable,
  ]);
  const isPaymentButtonDisabled = !canProceedToPayment || isProcessingPayment || paymentSuccess;

  if (!isOpen) return null;

  return (
    <>
      {/* Processing Overlay - shown after payment success */}
      {isProcessingBooking && (
        <ProcessingOverlay>
          <ProcessingContent>
            <ProcessingSpinner />
            <ProcessingTitle>Processing Your Booking</ProcessingTitle>
            <ProcessingSubtitle>
              Please wait while we confirm your payment and prepare your booking details...
            </ProcessingSubtitle>
          </ProcessingContent>
        </ProcessingOverlay>
      )}
      
      {/* Success Animation Overlay */}
      {showSuccessAnimation && (
        <ProcessingOverlay>
          <ProcessingContent>
            <EnhancedSuccessMessage>
              <ConfettiContainer>
                {/* Confetti particles */}
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
              
              <SuccessIcon>
                <FiCheck size={40} />
              </SuccessIcon>
              
              <SuccessTitle>🎉 Booking Confirmed!</SuccessTitle>
              <SuccessSubtitle>
                Your adventure awaits! We're preparing your booking details...
              </SuccessSubtitle>
              
                            {activeCoupon && (
                <CouponSuccessDiv>
                  <strong>Coupon Applied: {activeCoupon.code}</strong>
                  <br />
                  You saved ₹{discountAmount.toFixed(2)}!
                </CouponSuccessDiv>
              )}
            </EnhancedSuccessMessage>
          </ProcessingContent>
        </ProcessingOverlay>
      )}
        {/* Processing Overlay - existing code */}
    {isProcessingBooking && (
      <ProcessingOverlay>
        {/* ... existing code ... */}
      </ProcessingOverlay>
    )}
    
    {/* Success Animation Overlay - existing code */}
    {showSuccessAnimation && (
      <ProcessingOverlay>
        {/* ... existing code ... */}
      </ProcessingOverlay>
    )}
    
    {/* 🆕 UNAVAILABLE DATE POPUP */}
{showUnavailableDatePopup && (
  <UnavailableDateOverlay onClick={handleCloseUnavailablePopup}>
    <UnavailableDatePopup onClick={(e) => e.stopPropagation()}>
      <PopupHeader>
        <PopupIconContainer>
          <FiCalendar />
        </PopupIconContainer>
        <PopupTitle>Date Not Available</PopupTitle>
      </PopupHeader>
      
      <PopupBody>
        {selectedUnavailableDate && (
          <PopupDateDisplay>
            <div className="date-label">You selected</div>
            <div className="date-value">
              {selectedUnavailableDate instanceof Date 
                ? selectedUnavailableDate.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
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
        
        {/* AVAILABLE DATES SECTION */}
        {getFutureAvailableDates().length > 0 && (
          <AvailableDatesSection>
            <AvailableDatesTitle>
              <FiCheck />
              Available Dates
            </AvailableDatesTitle>
            
            <AvailableDatesGrid>
              {getFutureAvailableDates().map((dateStr) => {
                const formatted = formatDateForPopup(dateStr);
                return (
                  <AvailableDateButton
                    key={dateStr}
                    onClick={() => handleSelectAvailableDate(dateStr)}
                  >
                    <span className="day">{formatted.day}</span>
                    <span className="full-date">{formatted.full}</span>
                  </AvailableDateButton>
                );
              })}
            </AvailableDatesGrid>
          </AvailableDatesSection>
        )}
        
        {/* AVAILABLE MONTHS SECTION - Shows when no specific dates */}
        {getFutureAvailableDates().length === 0 && getAvailableMonths().length > 0 && (
          <AvailableMonthsSection>
            <AvailableMonthsTitle>
              <FiCalendar />
              Available Months for This Trek
            </AvailableMonthsTitle>
            
            <MonthsGrid>
              {getAvailableMonths().map((month) => (
                <MonthBadge 
                  key={month.index} 
                  isCurrentMonth={month.isCurrentMonth}
                >
                  <span className="month-name">{month.shortName}</span>
                  <span className="month-status">
                    {month.isCurrentMonth 
                      ? '● Now' 
                      : month.isFutureMonth 
                        ? 'Available' 
                        : 'Next Year'
                    }
                  </span>
                </MonthBadge>
              ))}
            </MonthsGrid>
            
            <MonthsHelpText>
              <FiInfo />
              <span>
                Specific dates for these months will be announced soon. 
                {getNextAvailableMonth() && (
                  <> Next availability: <strong>{getNextAvailableMonth()}</strong></>
                )}
              </span>
            </MonthsHelpText>
            
            
          </AvailableMonthsSection>
        )}
        
        {/* NO AVAILABILITY AT ALL */}
        {getFutureAvailableDates().length === 0 && getAvailableMonths().length === 0 && (
          <NoAvailableDatesMessage>
            <FiAlertCircle />
            <div>
              <strong>No availability information</strong>
              <p style={{ margin: '0.5rem 0 0', fontSize: '0.85rem', fontWeight: 'normal' }}>
                Please contact us to inquire about available dates for this trek.
              </p>
            </div>
          </NoAvailableDatesMessage>
        )}
      </PopupBody>
      
      <PopupFooter>
        <ClosePopupButton onClick={handleCloseUnavailablePopup}>
          Cancel
        </ClosePopupButton>
        <ChooseAnotherButton onClick={handleChooseAnotherDate}>
          <FiCalendar />
          Choose Another Date
        </ChooseAnotherButton>
      </PopupFooter>
    </UnavailableDatePopup>
  </UnavailableDateOverlay>
)}
    
      
      <ModalOverlay>
        <ModalContainer>
          <ModalHeader>
            <ModalTitle>{step === 1 ? 'Book Your Trek' : 'Payment Details'}</ModalTitle>
            <CloseButton onClick={onClose}>
              <FiX />
            </CloseButton>
          </ModalHeader>
        
        <ModalBody ref={modalBodyRef}>
          {/* Step Indicator */}
          <StepIndicator>
            <Step active={step === 1}>
              <StepNumber active={step === 1} completed={step > 1 || (step === 2 && canProceedToPayment)}>
                {(step > 1 || (step === 2 && canProceedToPayment)) ? <FiCheck /> : '1'}
              </StepNumber>
              <span>Booking Details</span>
            </Step>
            <StepConnector completed={step > 1} />
            <Step active={step === 2}>
              <StepNumber active={step === 2} completed={paymentSuccess}>
                {paymentSuccess ? <FiCheck /> : '2'}
              </StepNumber>
              <span>Payment</span>
            </Step>
          </StepIndicator>

          {/* Trek Information */}
          {/* <TrekInfo>
            <TrekImage src={trek?.image} alt={trek?.name} />
            <TrekDetails>
              <TrekName>{trek?.name}</TrekName>
              <TrekLocation>{trek?.location}</TrekLocation>
            </TrekDetails>
          </TrekInfo>
           */}
 {/* Booking Form - Step 1 */}

{step === 1 && (
  <StepContent>
    <Form onSubmit={handleSubmit}>
    {/* FIRST ROW: Image + Date/Participants Cards */}
    <FirstRow>
      {/* Left: Trek Image */}
      <TrekImageContainer>
        <TrekImageLarge src={trek?.image} alt={trek?.name} />
        <TrekImageOverlay>
          <h3>{trek?.name}</h3>
          <p>📍 {trek?.location}</p>
        </TrekImageOverlay>
      </TrekImageContainer>
      
      {/* Right: Date and Participant Cards */}
      <RightColumn>
        {/* Date Selection Card */}
        <InteractiveCard 
          isOpen={isDateCardOpen} 
          onClick={handleDateCardToggle}
          data-field="startDate"
          aria-invalid={Boolean(errors.startDate)}
          $invalid={Boolean(errors.startDate)}
        >
          <CardHeader>
            <CardLabel>
              <FiCalendar />
              Trek Date
            </CardLabel>
            {formData.startDate && <SelectedBadge>Selected</SelectedBadge>}
          </CardHeader>
          <CardValue>
            {formData.startDate 
              ? formatDateForDisplay(formData.startDate)
              : 'Click to select date'
            }
            <CardArrow isOpen={isDateCardOpen}></CardArrow>
          </CardValue>
          
          <CardDropdown isOpen={isDateCardOpen} onClick={e => e.stopPropagation()}>
  <DatePicker
    selected={formData.startDate ? new Date(formData.startDate) : null}
    onChange={(date) => handleDateSelect(date)}
    inline
    minDate={new Date()} // Prevent past dates
  />
</CardDropdown>
        </InteractiveCard>
        
        {errors.startDate && (
          <ErrorSpan style={{ marginTop: '-0.5rem', marginBottom: '0.5rem' }}>
            {errors.startDate}
          </ErrorSpan>
        )}
        
        {/* Participants Selection Card */}
        <InteractiveCard 
          isOpen={isParticipantCardOpen} 
          onClick={handleParticipantCardToggle}
        >
          <CardHeader>
            <CardLabel>
              <FiUser />
              Participants
            </CardLabel>
            <SelectedBadge>{formData.totalParticipants} Selected</SelectedBadge>
          </CardHeader>
          <CardValue>
            {formData.totalParticipants} {formData.totalParticipants === 1 ? 'Person' : 'People'}
            <CardArrow isOpen={isParticipantCardOpen}></CardArrow>
          </CardValue>
          
          <CardDropdown isOpen={isParticipantCardOpen} onClick={e => e.stopPropagation()}>
            <ParticipantGrid>
              {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map(num => (
                <ParticipantOption
                  key={num}
                  type="button"
                  selected={formData.totalParticipants === num}
                  onClick={() => handleParticipantSelect(num)}
                >
                  {num}
                </ParticipantOption>
              ))}
            </ParticipantGrid>
          </CardDropdown>
        </InteractiveCard>
      </RightColumn>
    </FirstRow>

    {/* PRIMARY BOOKER BOX */}
    <DetailBox
      isExpanded={currentExpandedBox === 'primary'}
      data-expanded={currentExpandedBox === 'primary'}
      onClick={() => currentExpandedBox !== 'primary' && handleBoxClick('primary')}
    >
      <DetailBoxHeader isExpanded={currentExpandedBox === 'primary'}>
        <DetailBoxTitle>
          <FiUser />
          Your Details (Primary Booker)
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
  data-field="primaryBooker_name"
            $invalid={Boolean(errors.primaryBooker_name)}
            aria-invalid={Boolean(errors.primaryBooker_name)}
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
  data-field="primaryBooker_email"
              $invalid={Boolean(errors.primaryBooker_email)}
              aria-invalid={Boolean(errors.primaryBooker_email)}
              onClick={(e) => e.stopPropagation()}
            />
            {errors.primaryBooker_email && <ErrorSpan>{errors.primaryBooker_email}</ErrorSpan>}
          </FormGroup>
          
          <FormGroup>
            <Label>Contact Number *</Label>
            <Input 
              type="tel" 
              value={primaryBooker.contactNumber}
              onChange={(e) => handlePrimaryBookerChange('contactNumber', digitsOnly(e.target.value))}
              placeholder="10-digit number"
              inputMode="numeric"
  data-field="primaryBooker_contactNumber"
              $invalid={Boolean(errors.primaryBooker_contactNumber)}
              aria-invalid={Boolean(errors.primaryBooker_contactNumber)}
              onClick={(e) => e.stopPropagation()}
            />
            {errors.primaryBooker_contactNumber && <ErrorSpan>{errors.primaryBooker_contactNumber}</ErrorSpan>}
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
          <FiCheck />
          Done - Continue
        </DoneButton>
      </DetailBoxContent>
    </DetailBox>

    {/* PARTICIPANT BOXES */}
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
            <FiUser />
            Participant {index + 1} {participant.isPrimaryBooker && '(You)'}
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
  data-field={`participant_${index}_name`}
                $invalid={Boolean(errors[`participant_${index}_name`])}
                aria-invalid={Boolean(errors[`participant_${index}_name`])}
                onClick={(e) => e.stopPropagation()}
              />
              {errors[`participant_${index}_name`] && (
                <ErrorSpan>{errors[`participant_${index}_name`]}</ErrorSpan>
              )}
            </FormGroup>
            
            <FormGroup>
              <Label>Email {!participant.isPrimaryBooker && '(Optional)'}</Label>
              <Input 
                type="email" 
                value={participant.email}
                onChange={(e) => handleParticipantChange(index, 'email', e.target.value)}
                placeholder="Email"
                disabled={participant.isPrimaryBooker}
  data-field={`participant_${index}_email`}
                $invalid={Boolean(errors[`participant_${index}_email`])}
                aria-invalid={Boolean(errors[`participant_${index}_email`])}
                onClick={(e) => e.stopPropagation()}
              />
              {errors[`participant_${index}_email`] && (
                <ErrorSpan>{errors[`participant_${index}_email`]}</ErrorSpan>
              )}
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
                min="1"
                max="100"
  data-field={`participant_${index}_age`}
                $invalid={Boolean(errors[`participant_${index}_age`])}
                aria-invalid={Boolean(errors[`participant_${index}_age`])}
                onClick={(e) => e.stopPropagation()}
              />
              {errors[`participant_${index}_age`] && (
                <ErrorSpan>{errors[`participant_${index}_age`]}</ErrorSpan>
              )}
            </FormGroup>
            
            <FormGroup>
              <Label>Emergency Contact (Optional)</Label>
              <Input 
                type="tel" 
                value={participant.emergencyContact}
                onChange={(e) => handleParticipantChange(index, 'emergencyContact', digitsOnly(e.target.value))}
                placeholder="Phone number"
                inputMode="numeric"
  data-field={`participant_${index}_emergencyContact`}
                $invalid={Boolean(errors[`participant_${index}_emergencyContact`])}
                aria-invalid={Boolean(errors[`participant_${index}_emergencyContact`])}
                onClick={(e) => e.stopPropagation()}
              />
              {errors[`participant_${index}_emergencyContact`] && (
                <ErrorSpan>{errors[`participant_${index}_emergencyContact`]}</ErrorSpan>
              )}
            </FormGroup>
          </FieldRow>
          
          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '1.25rem' }}>
            {index > 0 && (
              <DoneButton 
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePreviousBox();
                }}
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
                if (isBoxValid(`participant-${index}`)) {
                  handleDoneClick(`participant-${index}`);
                }
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
      <Label>
        <FiMessageSquare />
        Special Requests (Optional)
      </Label>
      <Textarea 
        name="specialRequests"
        value={formData.specialRequests}
        onChange={handleChange}
        placeholder="Any dietary requirements, accessibility needs, or other requests..."
        style={{ minHeight: '80px' }}
      />
    </FormGroup>
    </Form>
  </StepContent>
)}    
                   {/* Payment Section - Step 2 */}
          {step === 2 && (
            <StepContent>
              {/* Secure Payment Banner */}
              <SecurePaymentBanner>
                <FiCheck />
                🔒 Secure Payment powered by Razorpay
              </SecurePaymentBanner>

              <PaymentStepLayout>
                <div>
                  {/* Booking Summary */}
                  <BookingSummaryCard>
                    <SummaryHeader>
                      <SectionIcon>
                        <FiInfo />
                      </SectionIcon>
                      <SummaryTitle>Booking Summary</SummaryTitle>
                    </SummaryHeader>
                    
                    <SummaryGrid>
                      <SummaryItem>
                        <strong>Trek:</strong> {trek?.name}
                      </SummaryItem>
                      <SummaryItem>
                        <strong>Date:</strong> {formatDateForDisplay(formData.startDate)}
                      </SummaryItem>
                      <SummaryItem>
                        <strong>Participants:</strong> {formData.totalParticipants} person(s)
                      </SummaryItem>
                      <SummaryItem>
                        <strong>Price/Person:</strong> ₹{trek?.numericPrice}
                      </SummaryItem>
                    </SummaryGrid>
                    
                    {/* Participant Names */}
                    <div style={{ marginTop: '1rem', paddingTop: '0.75rem', borderTop: '1px solid rgba(51, 153, 204, 0.1)' }}>
                      <div style={{ fontSize: '0.85rem', fontWeight: '600', color: '#020202', marginBottom: '0.5rem' }}>
                        Participants:
                      </div>
                      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0' }}>
                        {participants.map((p, i) => (
                          <ParticipantChip key={i} isPrimary={p.isPrimaryBooker}>
                            {p.name || `Participant ${i + 1}`}
                            {p.isPrimaryBooker && ' ✓'}
                          </ParticipantChip>
                        ))}
                      </div>
                    </div>
                  </BookingSummaryCard>

                  {/* Coupon Section */}
                  <CouponSection 
                    orderTotal={trek?.numericPrice * formData.totalParticipants}
                    onApplyCoupon={handleApplyCoupon}
                    theme={{ 
                      mainColor: theme.primary,
                      hoverColor: theme.primaryDark,
                      gradientLight: `linear-gradient(135deg, ${theme.peach}, ${theme.cream})`,
                      textColor:'#212223',
                      inputBackground: theme.white,
                      inputBorder: theme.mediumGray,
                      inputText: '#111827',
                      placeholderColor: '#4a4949'
                    }}
                  />
                </div>

                <PaymentSidebar>
                  <PriceSummary
                    style={{ 
                      background: `linear-gradient(135deg, rgba(255, 87, 34, 0.06), rgba(255, 152, 0, 0.04))`,
                      borderColor: theme.primary,
                      padding: '1.5rem',
                      borderRadius: '16px',
                      marginTop: 0
                    }}
                  >        
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
                </PaymentSidebar>
              </PaymentStepLayout>

              {paymentError && (
                <ErrorMessage>
                  <FiAlertCircle size={20} />
                  {paymentError}
                </ErrorMessage>
              )}
              
              {paymentSuccess && (
                <SuccessMessage>
                  <FiCheck size={20} />
                  <div>
                    Payment successful! Your booking is confirmed.
                    {activeCoupon && (
                      <div style={{ marginTop: '10px', fontSize: '1.9em' }}>
                        Coupon applied: {activeCoupon.code} (Saved: ₹{discountAmount.toFixed(2)})
                      </div>
                    )}
                  </div>
                </SuccessMessage>
              )}
            </StepContent>
          )}
        </ModalBody>
        
        <ModalFooter>
          {step === 1 ? (
            <>
              <CancelButton type="button" onClick={onClose}>
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
                disabled={isPaymentButtonDisabled}
              >
                {isProcessingPayment ? (
                  <LoadingIndicator />
                ) : paymentSuccess ? (
                  <>
                    <FiCheck />
                    Paid
                  </>
                ) : (
                  <>
                    <FiCreditCard />
                    Pay ₹{Number(calculateTotalPrice()).toFixed(0)}
                  </>
                )}
              </PaymentButton>
            </>
          )}
        </ModalFooter>
      </ModalContainer>
    </ModalOverlay>
    </>
  );
};

export default BookingModal;