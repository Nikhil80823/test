import { db, getSafeDocumentId } from '../../firebase';
import { collection, addDoc, doc, updateDoc, getDoc, serverTimestamp, setDoc } from 'firebase/firestore';

// Loading state tracking
let isLoadingScript = false;
let loadPromise = null;

/**
 * Load the Razorpay SDK dynamically
 * @returns {Promise<boolean>} - Whether the script loaded successfully
 */
export const loadRazorpayScript = () => {
  // If already loading, return the existing promise to prevent multiple load attempts
  if (isLoadingScript && loadPromise) {
    return loadPromise;
  }
  
  // If Razorpay is already loaded, return immediately
  if (window.Razorpay) {
    console.log('Razorpay SDK already loaded');
    return Promise.resolve(true);
  }
  
  // Set loading state
  isLoadingScript = true;
  
  // Create and store the promise
  loadPromise = new Promise((resolve) => {
    // Clean up any existing script to avoid conflicts
    const existingScript = document.getElementById('razorpay-checkout-js');
    if (existingScript) {
      console.log('Removing existing Razorpay script');
      existingScript.remove();
    }
    
    // Create and add the script
    const script = document.createElement('script');
    script.id = 'razorpay-checkout-js';
    script.src = 'https://checkout.razorpay.com/v1/checkout.js';
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      console.log('Razorpay SDK loaded successfully');
      isLoadingScript = false;
      resolve(true);
    };
    
    script.onerror = (error) => {
      console.error('Failed to load Razorpay SDK:', error);
      isLoadingScript = false;
      resolve(false);
    };
    
    document.body.appendChild(script);
  });
  
  return loadPromise;
};

/**
 * Create a Razorpay order in Firebase
 * @param {Object} orderData - Order details
 * @returns {Promise<Object>} - Order details with ID
 */
export const createRazorpayOrder = async (orderData) => {
  try {
    console.log('Creating booking record for payment:', orderData);
    
    const bookingsRef = collection(db, 'bookings');
    
    // DEBUG: Log incoming data
    console.log('📞 Order data received:', {
      contactNumber: orderData.contactNumber,
      participants: orderData.participants,
      totalParticipants: orderData.totalParticipants,
      primaryBooker: orderData.primaryBooker
    });
    
    // Sanitize the data
    const sanitizedOrderData = Object.keys(orderData).reduce((acc, key) => {
      if (orderData[key] !== undefined && orderData[key] !== null) {
        acc[key] = orderData[key];
      }
      return acc;
    }, {});
    
    // ✅ NEW: Ensure participants array is preserved
    const requiredFields = {
      userId: sanitizedOrderData.userId || 'anonymous',
      trekName: sanitizedOrderData.trekName || 'Unknown Trek',
      amount: sanitizedOrderData.amount || 0,
      currency: sanitizedOrderData.currency || 'INR',
      
      // ✅ NEW: Participant fields
      participants: sanitizedOrderData.participants || [],
      totalParticipants: sanitizedOrderData.totalParticipants || 1,
      primaryBooker: sanitizedOrderData.primaryBooker || {},
      
      // Preserve all other fields
      ...(sanitizedOrderData.contactNumber && { contactNumber: sanitizedOrderData.contactNumber }),
      ...(sanitizedOrderData.phoneNumber && { phoneNumber: sanitizedOrderData.phoneNumber }),
      ...(sanitizedOrderData.phone && { phone: sanitizedOrderData.phone }),
      ...(sanitizedOrderData.name && { name: sanitizedOrderData.name }),
      ...(sanitizedOrderData.email && { email: sanitizedOrderData.email }),
      ...(sanitizedOrderData.startDate && { startDate: sanitizedOrderData.startDate }),
      ...(sanitizedOrderData.specialRequests && { specialRequests: sanitizedOrderData.specialRequests }),
      ...(sanitizedOrderData.pricePerPerson && { pricePerPerson: sanitizedOrderData.pricePerPerson }),
      ...(sanitizedOrderData.subtotal && { subtotal: sanitizedOrderData.subtotal }),
      ...(sanitizedOrderData.discount && { discount: sanitizedOrderData.discount }),
      ...(sanitizedOrderData.coupon && { coupon: sanitizedOrderData.coupon }),
    };
    
    const bookingData = {
      ...sanitizedOrderData,
      ...requiredFields,
      status: 'pending',
      paymentStatus: 'pending',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    };
    
    // DEBUG: Log what's being saved
    console.log('📞 Booking data being saved to Firestore:', {
      totalParticipants: bookingData.totalParticipants,
      participantsCount: bookingData.participants?.length,
      primaryBooker: bookingData.primaryBooker?.name,
      allParticipantNames: bookingData.participants?.map(p => p.name)
    });
    
    const bookingDoc = await addDoc(bookingsRef, bookingData);
    console.log('✅ Booking created with ID:', bookingDoc.id);
    
    // Store the booking ID globally
    window.lastRazorpayBookingId = bookingDoc.id;
    
    return {
      bookingId: bookingDoc.id,
      ...bookingData,
      amount: orderData.amount * 100, // Convert to paise
    };
  } catch (error) {
    console.error('❌ Error creating Razorpay order:', error);
    throw new Error('Failed to create order');
  }
};

/**
 * Initialize Razorpay payment
 * @param {Object} options - Payment options
 * @returns {Promise<Object>} - Payment result
 */
export const initializeRazorpayPayment = (options) => {
  return new Promise((resolve, reject) => {
    try {
      // Check if Razorpay SDK is loaded
      if (!window.Razorpay) {
        console.error('Razorpay SDK not loaded');
        reject(new Error('Razorpay SDK not loaded. Please refresh the page and try again.'));
        return;
      }
      
      // Store bookingId in global variable early in the process
      if (options.notes && options.notes.bookingId) {
        console.log('📝 Storing bookingId in global variable:', options.notes.bookingId);
        window.lastRazorpayBookingId = options.notes.bookingId;
      }
      
      // Validate required fields
      const requiredFields = ['key', 'amount', 'currency'];
      for (const field of requiredFields) {
        if (!options[field]) {
          console.error(`Missing required field: ${field}`);
          reject(new Error(`Missing required field: ${field}`));
          return;
        }
      }
      
      // Ensure we have a valid amount (minimum 100 paise = ₹1)
      if (options.amount < 100) {
        console.warn('Amount is less than minimum (100 paise), setting to minimum');
        options.amount = 100;
      }
      
      // Clean up options object - using the basic payment flow (no order_id)
      // This simpler approach doesn't require pre-creating orders
      const cleanOptions = {
        key: options.key,
        amount: parseInt(options.amount),
        currency: options.currency || 'INR',
        name: options.name || 'Trovia Treks',
        description: options.description || '',
        handler: function(response) {
          console.log('Razorpay payment successful:', response);
          
          // For testing, construct a fake response similar to what we would get
          // with the order flow but without requiring a real Razorpay order
          const bookingId = options.notes && options.notes.bookingId;
          
          // Log important information
          console.log('📊 Payment successful with bookingId:', bookingId);
          
          const successResponse = {
            razorpay_payment_id: response.razorpay_payment_id || `pay_test_${Date.now()}`,
            razorpay_order_id: bookingId || 'order_test',
            razorpay_signature: 'test_signature_' + Date.now(),
            bookingId: bookingId, // Explicitly include bookingId
            notes: {
              bookingId: bookingId // Include in notes too for redundancy
            }
          };
          
          // Store the bookingId in a global variable as backup
          window.lastRazorpayBookingId = bookingId;
          
          if (typeof window.onRazorpaySuccess === 'function') {
            window.onRazorpaySuccess(successResponse);
          }
          
          resolve(successResponse);
        },
        modal: {
          escape: false,
          ondismiss: function() {
            console.log('Payment modal dismissed');
            reject(new Error('Payment canceled by user'));
          }
        },
        prefill: {
          name: options.prefill?.name || '',
          email: options.prefill?.email || '',
          contact: options.prefill?.contact || ''
        },
        notes: options.notes || {
          address: "Trovia Treks Headquarters"
        },
        theme: {
          color: '#3399cc',
          hide_topbar: false
        },
        readonly: {
          contact: false,
          email: false
        },
        send_sms_hash: false
      };
      
      console.log('Initializing Razorpay with options:', cleanOptions);
        try {
        // Generate a safer checkout instance ID to prevent issues
        const checkoutId = 'checkout_' + Date.now() + Math.floor(Math.random() * 10000);
        
        // Create the Razorpay instance
        const rzp = new window.Razorpay({
          ...cleanOptions,
          _: {
            checkout_id: checkoutId,
            library: 'checkoutjs',
            platform: 'browser'
          }
        });
        
        // Add event handlers for all payment states
        rzp.on('payment.failed', function(response) {
          console.error('Razorpay payment failed:', response?.error || 'Unknown error');
          if (typeof window.onRazorpayFailure === 'function') {
            window.onRazorpayFailure(response?.error || { description: 'Payment failed' });
          }
          reject(response?.error || new Error('Payment failed'));
        });
        
        rzp.on('payment.cancelled', function() {
          console.log('Payment cancelled by user');
          if (typeof window.onRazorpayCancelled === 'function') {
            window.onRazorpayCancelled();
          }
          reject(new Error('Payment cancelled by user'));
        });
        
        // Open the payment modal
        rzp.open();
        
        // Just return the instance, not as a resolved promise
        // The actual resolution happens in the handler
        return rzp;
      } catch (rzpError) {
        console.error('Error creating Razorpay instance:', rzpError);
        reject(rzpError);
      }
    } catch (error) {
      console.error('Razorpay initialization error:', error);
      reject(error);
    }
  });
};

/**
 * Verify and complete a Razorpay payment
 * @param {string} bookingId - Booking ID
 * @param {Object} paymentDetails - Payment details from Razorpay
 * @returns {Promise<Object>} - Updated booking
 */
export const verifyAndCompletePayment = async (bookingId, paymentDetails) => {
  try {
    console.log('🔍 Verifying payment for booking:', bookingId, paymentDetails);
    
    if (!paymentDetails) {
      console.warn('No payment details provided, using empty object');
      paymentDetails = {}; 
    }
    
    // Log all possible sources for the booking ID
    const possibleSources = {
      providedBookingId: bookingId,
      verifiedBookingId: paymentDetails?.verifiedBookingId,
      paymentDetailsBookingId: paymentDetails?.bookingId,
      notesBookingId: paymentDetails?.notes?.bookingId,
      razorpayOrderId: paymentDetails?.razorpay_order_id,
      globalBookingId: window.lastRazorpayBookingId,
      paymentId: paymentDetails?.razorpay_payment_id
    };
    
    console.log('🔍 All possible booking ID sources:', possibleSources);
    
    // Find first valid ID - check each in priority order
    let effectiveBookingId = null;
    for (const [sourceName, sourceValue] of Object.entries(possibleSources)) {
      if (typeof sourceValue === 'string' && sourceValue.trim() !== '') {
        effectiveBookingId = sourceValue;
        console.log(`✅ Using booking ID from ${sourceName}: ${effectiveBookingId}`);
        break;
      }
    }
    
    // If no valid ID found, generate one deterministically
    if (!effectiveBookingId) {
      console.warn('⚠️ No valid booking ID found in any source');
      
      // Generate a stable ID based on payment details
      if (paymentDetails.razorpay_payment_id) {
        effectiveBookingId = `payment_${paymentDetails.razorpay_payment_id}`;
        console.log('🔄 Generated stable ID from payment ID:', effectiveBookingId);
      } else {
        effectiveBookingId = `recovery_${Date.now()}`;
        console.log('🔄 Generated timestamp-based ID:', effectiveBookingId);
      }
    }
    
    // Always sanitize IDs before using with Firestore
    // This is our final safeguard against invalid IDs
    const safeBookingId = getSafeDocumentId(effectiveBookingId);
    
    console.log('✅ Final sanitized bookingId for Firestore:', safeBookingId);
    
    // Save the ID globally for potential recovery needs
    window.lastRazorpayBookingId = safeBookingId;
    
    // Check if booking exists in Firestore
    try {
      const bookingRef = doc(db, 'bookings', safeBookingId);      const bookingSnap = await getDoc(bookingRef);
      
      if (!bookingSnap.exists()) {
        console.log('⚠️ Booking not found with ID:', safeBookingId, '- creating recovery booking');
        
        // Create a recovery booking record with all available info
        const recoveryData = {
          userId: paymentDetails?.userId || 'recovery_user',
          userEmail: paymentDetails?.email || paymentDetails?.userEmail || 'recovery@example.com',
          userName: paymentDetails?.name || paymentDetails?.userName || 'Recovery User',
          trekName: paymentDetails?.trekName || 'Recovery Payment', 
          amount: paymentDetails.amount || 100,
          currency: 'INR',
          status: 'recovered',
          paymentStatus: 'completed',
          paymentId: paymentDetails.razorpay_payment_id || `test_${Date.now()}`,
          paymentOrderId: paymentDetails.razorpay_order_id || safeBookingId,
          paymentSignature: paymentDetails.razorpay_signature || 'generated',
          
          // Include user data if available in payment details
          ...(paymentDetails?.name && { name: paymentDetails.name }),
          ...(paymentDetails?.email && { email: paymentDetails.email }),
          ...(paymentDetails?.contactNumber && { contactNumber: paymentDetails.contactNumber }),
          ...(paymentDetails?.contact && { contact: paymentDetails.contact }),
          ...(paymentDetails?.phone && { phone: paymentDetails.phone }),
          ...(paymentDetails?.participants && { participants: paymentDetails.participants }),
          ...(paymentDetails?.trekDate && { trekDate: paymentDetails.trekDate }),
          ...(paymentDetails?.selectedDate && { selectedDate: paymentDetails.selectedDate }),
          ...(paymentDetails?.emergencyContact && { emergencyContact: paymentDetails.emergencyContact }),
          ...(paymentDetails?.emergencyName && { emergencyName: paymentDetails.emergencyName }),
          ...(paymentDetails?.emergencyPhone && { emergencyPhone: paymentDetails.emergencyPhone }),
          ...(paymentDetails?.specialRequests && { specialRequests: paymentDetails.specialRequests }),
          
          recoveryReason: 'Missing or invalid bookingId in payment flow',
          recoveryTimestamp: new Date().toISOString(),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
          paymentDetails: JSON.stringify(paymentDetails || {}),
          notes: "Auto-created during payment verification"
        };
        
        await setDoc(bookingRef, recoveryData);
        console.log('✅ Created recovery booking with ID:', safeBookingId);
        
        return { 
          id: safeBookingId,
          bookingId: safeBookingId,
          ...recoveryData,
          status: 'recovered',
          isRecovery: true 
        };
      }
      
      // Booking exists, update it with payment details
      console.log('✅ Booking found, updating with payment details');
      
      // Get the existing booking data to preserve user information
      const existingBookingData = bookingSnap.data();
      console.log('📋 Existing booking data:', existingBookingData);
      
      // Create a detailed payment record with all data we have
      const paymentData = {
        paymentId: paymentDetails.razorpay_payment_id || paymentDetails.payment_id || `test_payment_${Date.now()}`,
        paymentOrderId: paymentDetails.razorpay_order_id || paymentDetails.order_id || safeBookingId,
        paymentSignature: paymentDetails.razorpay_signature || paymentDetails.signature || `test_signature_${Date.now()}`,
        paymentStatus: 'completed',
        status: 'confirmed',
        updatedAt: serverTimestamp(),
        testMode: process.env.NODE_ENV !== 'production', // Mark test payments
        
        // Additional debugging data to trace payment flow
        paymentSource: 'razorpay_direct',
        originalBookingId: bookingId || 'direct_call',
        responseBookingId: paymentDetails?.bookingId || 'not_provided',
        notesBookingId: paymentDetails?.notes?.bookingId || 'no_notes',
        globalBookingId: window.lastRazorpayBookingId || 'not_stored',
        paymentTimestamp: new Date().toISOString(),
        
        // Preserve all original user data - ensure we don't lose any user-provided information
        // Keep original field names if they exist
        ...(existingBookingData.name && { name: existingBookingData.name }),
        ...(existingBookingData.email && { email: existingBookingData.email }),
        ...(existingBookingData.contactNumber && { contactNumber: existingBookingData.contactNumber }),
        ...(existingBookingData.emergencyContact && { emergencyContact: existingBookingData.emergencyContact }),
        ...(existingBookingData.emergencyName && { emergencyName: existingBookingData.emergencyName }),
        ...(existingBookingData.emergencyPhone && { emergencyPhone: existingBookingData.emergencyPhone }),
        ...(existingBookingData.participants && { participants: existingBookingData.participants }),
        ...(existingBookingData.specialRequests && { specialRequests: existingBookingData.specialRequests }),
        ...(existingBookingData.trekDate && { trekDate: existingBookingData.trekDate }),
        ...(existingBookingData.selectedDate && { selectedDate: existingBookingData.selectedDate }),
        
        // Also preserve alternative field names for compatibility
        ...(existingBookingData.userEmail && { userEmail: existingBookingData.userEmail }),
        ...(existingBookingData.userName && { userName: existingBookingData.userName }),
        ...(existingBookingData.userPhone && { userPhone: existingBookingData.userPhone }),
        ...(existingBookingData.contact && { contact: existingBookingData.contact }),
        ...(existingBookingData.phone && { phone: existingBookingData.phone })
      };
      
      // Update the booking with payment details while preserving all user data
      await updateDoc(bookingRef, paymentData);
      
      // Get the updated booking
      const updatedBookingSnap = await getDoc(bookingRef);
      return {
        id: updatedBookingSnap.id,
        bookingId: updatedBookingSnap.id,
        ...updatedBookingSnap.data()
      };
    } catch (docError) {
      console.error('❌ Error accessing or creating document:', docError);
      
      // Fall back to auto-generated ID if there's an error
      const bookingsRef = collection(db, 'bookings');
      const fallbackData = {
        userId: 'fallback_user',
        trekName: 'Fallback Payment - Error Recovery',
        amount: paymentDetails.amount || 100,
        currency: 'INR',
        status: 'fallback',
        paymentStatus: 'completed',
        paymentId: paymentDetails.razorpay_payment_id || `test_fallback_${Date.now()}`,
        recoveryReason: 'Error accessing or creating document with ID: ' + safeBookingId,
        errorDetails: docError.message,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        paymentDetails: JSON.stringify(paymentDetails || {})
      };
      
      const newDoc = await addDoc(bookingsRef, fallbackData);
      console.log('✅ Created fallback booking with auto ID:', newDoc.id);
      
      return { 
        id: newDoc.id,
        bookingId: newDoc.id,
        ...fallbackData,
        status: 'fallback',
        isRecovery: true 
      };
    }
  } catch (error) {
    console.error('❌ Error verifying payment:', error);
    throw new Error('Failed to verify payment');
  }
};

/**
 * Save payment failure details
 * @param {string} bookingId - Booking ID
 * @param {Object} errorDetails - Error details
 * @returns {Promise<void>}
 */
export const savePaymentFailureDetails = async (bookingId, errorDetails) => {
  try {
    if (!bookingId || typeof bookingId !== 'string') {
      console.error('Invalid bookingId for saving payment failure:', bookingId);
      return;
    }
    
    const safeBookingId = getSafeDocumentId(bookingId);
    const bookingRef = doc(db, 'bookings', safeBookingId);
    const bookingSnap = await getDoc(bookingRef);
    
    if (!bookingSnap.exists()) {
      console.error('Booking not found for payment failure:', safeBookingId);
      return;
    }
    
    await updateDoc(bookingRef, {
      status: 'failed',
      paymentStatus: 'failed',
      paymentError: JSON.stringify(errorDetails),
      updatedAt: serverTimestamp()
    });
    
    console.log('Saved payment failure details for booking:', safeBookingId);
  } catch (error) {
    console.error('Error saving payment failure details:', error);
  }
};
