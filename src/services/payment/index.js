import { 
  loadRazorpayScript, 
  createRazorpayOrder, 
  initializeRazorpayPayment, 
  verifyAndCompletePayment,
  savePaymentFailureDetails
} from './razorpay';
import { debugRazorpayIntegration, validateFirestoreData } from './debugUtils';
import { auth, db, getSafeDocumentId } from '../../firebase';
import { doc, setDoc, serverTimestamp, updateDoc, increment } from 'firebase/firestore';

/**
 * Process payment for a trek booking
 * @param {Object} trekData - Trek details
 * @param {Object} bookingDetails - Booking details
 * @returns {Promise<Object>} - Payment result
 */
export const processPayment = async (trekData, bookingDetails) => {
  try {
    console.group('📊 Payment Processing');
    console.log('Trek Data:', trekData);
    console.log('Booking Details:', bookingDetails);
    
    // Debug Razorpay integration
    const debugInfo = debugRazorpayIntegration();
    if (!debugInfo.isRazorpayLoaded) {
      console.log('🔄 Razorpay not loaded, attempting to load...');
      
      // Attempt to load Razorpay script
      const isRazorpayLoaded = await loadRazorpayScript();
      if (!isRazorpayLoaded) {
        throw new Error('Failed to load Razorpay SDK. Please check your internet connection and try again.');
      }
    }

    // Validate key existence
    if (!process.env.REACT_APP_RAZORPAY_KEY_ID) {
      console.error('❌ Razorpay Key ID is missing');
      throw new Error('Payment configuration error: API key not found. Please check your .env file.');
    }

    // Get current user (or allow anonymous for testing)
    const user = auth.currentUser;
    const userId = user ? user.uid : 'anonymous-user';
    
    console.log('👤 User:', user ? `${user.displayName || user.email} (${user.uid})` : 'Anonymous');
    
    // Create order data with proper validation and preserve all participant data
    const orderData = {
      userId: userId,
      
      // ✅ Include participant data
      primaryBooker: bookingDetails.primaryBooker || {},
      participants: bookingDetails.participants || [],
      totalParticipants: bookingDetails.totalParticipants || 1,
      
      // Include coupon data if available
      coupon: bookingDetails.coupon ? {
        id: bookingDetails.coupon.id,
        code: bookingDetails.coupon.code,
        discount: bookingDetails.coupon.discount,
        discountType: bookingDetails.coupon.discountType
      } : null,
      
      // User information - preserve original field names AND add alternatives
      userEmail: user ? user.email : (bookingDetails.primaryBooker?.email || bookingDetails.email || 'anonymous@example.com'),
      email: bookingDetails.primaryBooker?.email || bookingDetails.email || (user ? user.email : 'anonymous@example.com'),
      
      userName: user ? (user.displayName || bookingDetails.primaryBooker?.name || bookingDetails.name || 'Guest User') : (bookingDetails.primaryBooker?.name || bookingDetails.name || 'Guest User'),
      name: bookingDetails.primaryBooker?.name || bookingDetails.name || (user ? user.displayName : 'Guest User'),
      
      contactNumber: bookingDetails.primaryBooker?.contactNumber || bookingDetails.contactNumber || '',
      phoneNumber: bookingDetails.primaryBooker?.contactNumber || bookingDetails.contactNumber || '',
      phone: bookingDetails.primaryBooker?.contactNumber || bookingDetails.contactNumber || '',
      
      // Trek information
      trekId: trekData?.id || 'unknown-trek',
      trekName: trekData?.name || trekData?.title || 'Unknown Trek',
      trekTitle: trekData?.title || trekData?.name || 'Unknown Trek',
      trekLocation: trekData?.location || '',
      trekDuration: trekData?.duration || '',
      trekDifficulty: trekData?.difficulty || '',
      trekImage: trekData?.image || trekData?.imageUrl || '',
      
      // Booking details
      startDate: bookingDetails?.startDate || new Date().toISOString().split('T')[0],
      specialRequests: bookingDetails?.specialRequests || '',
      
      // Pricing
      pricePerPerson: trekData?.numericPrice || 100,
      subtotal: bookingDetails.subtotal || (trekData?.numericPrice || 100) * (bookingDetails?.totalParticipants || 1),
      discount: bookingDetails.discount || 0,
      
      // Calculate amount based on participants and apply discount if coupon is present
      amount: bookingDetails.totalAmount || (bookingDetails.coupon ? 
        parseInt(bookingDetails.coupon.finalAmount) :
        parseInt((trekData?.numericPrice || 100) * (bookingDetails?.totalParticipants || 1))),
      originalAmount: bookingDetails.coupon ?
        parseInt(bookingDetails.coupon.originalAmount) :
        parseInt((trekData?.numericPrice || 100) * (bookingDetails?.totalParticipants || 1)),
      totalAmount: bookingDetails.totalAmount || (bookingDetails.coupon ? 
        parseInt(bookingDetails.coupon.finalAmount) :
        parseInt((trekData?.numericPrice || 100) * (bookingDetails?.totalParticipants || 1))),
      
      currency: 'INR',
      bookingDate: new Date().toISOString()
    };

    // Ensure amount is valid (minimum 100 paise = ₹1)
    if (orderData.amount < 1) {
      console.warn('⚠️ Invalid amount, setting to minimum ₹100');
      orderData.amount = 100;
    }
    
    // Validate data before sending to Firestore
    const { fixedData } = validateFirestoreData(orderData);
    
    console.log('💾 Creating order with data:', fixedData);
    console.log('👥 Participants:', fixedData.participants);
    console.log('📊 Total participants:', fixedData.totalParticipants);
    
    // Create a local booking record first
    const order = await createRazorpayOrder(fixedData);
    console.log('📝 Order created:', order);
    
    // Configure Razorpay options
    const options = {
      key: process.env.REACT_APP_RAZORPAY_KEY_ID,
      amount: parseInt(order.amount),
      currency: "INR",
      name: 'Trovia Treks',
      description: `Booking for ${orderData.trekName} - ${orderData.totalParticipants} participant(s)`,
      notes: {
        bookingId: order.bookingId,
        trekId: orderData.trekId,
        totalParticipants: orderData.totalParticipants
      },
      prefill: {
        name: orderData.userName,
        email: orderData.userEmail,
        contact: orderData.contactNumber || ''
      },
      theme: {
        color: '#3399cc'
      }
    };
    
    console.log('🚀 Initializing Razorpay payment with options:', options);
    console.groupEnd();

    // Initialize payment
    await initializeRazorpayPayment(options);

    // Return the order details
    return {
      orderId: order.bookingId,
      amount: order.amount,
      success: true
    };
  } catch (error) {
    console.error('❌ Payment processing error:', error);
    console.groupEnd();
    return {
      success: false,
      error: error.message || 'Payment processing failed'
    };
  }
};

/**
 * Handle successful payment
 * Extensively enhanced for redundancy and error recovery
 * @param {string} bookingId - Booking ID (can be undefined/null)
 * @param {Object} paymentResponse - Razorpay payment response
 * @returns {Promise<Object>} - Updated booking
 */
export const handlePaymentSuccess = async (bookingId, paymentResponse) => {
  try {
    console.log('⭐ Payment success handler called with:', { bookingId, paymentResponse });
    
    // Safety check - ensure we have a valid payment response
    if (!paymentResponse || typeof paymentResponse !== 'object') {
      console.warn('⚠️ Invalid payment response, creating empty object:', paymentResponse);
      paymentResponse = {};
    }
    
    // Debug all possible booking ID sources
    console.log('📊 DEBUG - All booking ID sources:', {
      functionParam: bookingId,
      responseBookingId: paymentResponse?.bookingId,
      responseVerifiedId: paymentResponse?.verifiedBookingId,
      responseOrderId: paymentResponse?.razorpay_order_id,
      responseNotesId: paymentResponse?.notes?.bookingId,
      globalVariable: window.lastRazorpayBookingId,
      paymentId: paymentResponse?.razorpay_payment_id
    });// Check each possible source for a valid booking ID in priority order
    // Initialize variables we'll use for tracking the ID
    let potentialId = null;
    
    // Log all possible sources for debugging
    console.log('Payment Handler - Potential booking ID sources:', {
      providedBookingId: bookingId,
      responseBookingId: paymentResponse.bookingId,
      verifiedBookingId: paymentResponse.verifiedBookingId,
      razorpayOrderId: paymentResponse.razorpay_order_id,
      notesBookingId: paymentResponse.notes?.bookingId,
      backupNotesId: paymentResponse.notes?.backupId,
      globalVar: window.lastRazorpayBookingId
    });
    
    // Check each possible source and ensure it's a valid string
    if (typeof bookingId === 'string' && bookingId.trim() !== '') {
      potentialId = bookingId;
      console.log('Using provided bookingId:', potentialId);
    } else if (typeof paymentResponse.verifiedBookingId === 'string' && paymentResponse.verifiedBookingId.trim() !== '') {
      potentialId = paymentResponse.verifiedBookingId;
      console.log('Using verifiedBookingId from response:', potentialId);
    } else if (typeof paymentResponse.bookingId === 'string' && paymentResponse.bookingId.trim() !== '') {
      potentialId = paymentResponse.bookingId;
      console.log('Using bookingId from response:', potentialId);
    } else if (typeof paymentResponse.razorpay_order_id === 'string' && paymentResponse.razorpay_order_id.trim() !== '') {
      potentialId = paymentResponse.razorpay_order_id;
      console.log('Using razorpay_order_id as bookingId:', potentialId);
    } else if (paymentResponse.notes && typeof paymentResponse.notes.bookingId === 'string' && paymentResponse.notes.bookingId.trim() !== '') {
      potentialId = paymentResponse.notes.bookingId;
      console.log('Using bookingId from response notes:', potentialId);    } else if (typeof window.lastRazorpayBookingId === 'string' && window.lastRazorpayBookingId.trim() !== '') {
      potentialId = window.lastRazorpayBookingId;
      console.log('Using global variable lastRazorpayBookingId:', potentialId);
    }
    
    // If we still don't have an ID, try to generate one from the payment ID
    if (!potentialId && paymentResponse.razorpay_payment_id) {
      potentialId = `payment_${paymentResponse.razorpay_payment_id}`;
      console.log('Generated ID from payment ID:', potentialId);
    }
    
    // Ultimate fallback - always ensure we have an ID
    if (!potentialId) {
      potentialId = `fallback_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
      console.log('Using ultimate fallback ID:', potentialId);
    }
    
    // Always ensure the ID is safe for Firestore database use
    const actualBookingId = getSafeDocumentId(potentialId);
    
    // If the ID was modified during sanitization, log that
    if (actualBookingId !== potentialId) {
      console.log('ID was sanitized for Firestore:', {
        original: potentialId,
        sanitized: actualBookingId
      });
    }
    
    console.log('✅ Final booking ID for payment verification:', actualBookingId);
      // Enhance paymentResponse with the verified bookingId for complete redundancy
    const enhancedPaymentResponse = {
      ...paymentResponse,
      bookingId: actualBookingId,
      verifiedBookingId: actualBookingId,
      orderId: actualBookingId, // Add another standardized field
      // Also embed in notes for deeper redundancy
      notes: {
        ...(paymentResponse.notes || {}),
        bookingId: actualBookingId,
        verifiedBookingId: actualBookingId,
        timestamp: Date.now()
      }
    };
    
    // Store in window variable for global recovery access
    window.lastRazorpayBookingId = actualBookingId;
    
    console.log('💼 Calling verifyAndCompletePayment with:', { 
      bookingId: actualBookingId, 
      paymentResponse: enhancedPaymentResponse 
    });
    
    // In test mode, we don't need server-side verification since we're using simulated signatures
    // For production, you would verify the signature server-side
    const updatedBooking = await verifyAndCompletePayment(actualBookingId, enhancedPaymentResponse);
    
    console.log('✅ Payment verification completed with result:', updatedBooking);
    
    // Get user ID for the payment record
    const user = auth.currentUser;
    const userId = user ? user.uid : 'anonymous-user';// Generate a payment ID if missing
    const paymentId = paymentResponse.razorpay_payment_id || 
                      `test_payment_${Date.now()}_${Math.floor(Math.random() * 10000)}`;
                        // Create a payment record with detailed info for debugging
    const paymentRef = doc(db, 'payments', paymentId);
    await setDoc(paymentRef, {
      bookingId: actualBookingId,
      userId, // Include user ID for permissions
      paymentId: paymentId,
      orderId: paymentResponse.razorpay_order_id || actualBookingId || 'test_order',
      signature: paymentResponse.razorpay_signature || 'test_signature',
      status: 'completed',
      originalBookingId: bookingId || 'not_provided',
      responseBookingId: paymentResponse.bookingId || 'not_in_response',
      responseOrderId: paymentResponse.razorpay_order_id || 'not_in_response',
      globalBookingId: window.lastRazorpayBookingId || 'not_stored',
      amount: paymentResponse.amount || updatedBooking.amount || 0,
      currency: paymentResponse.currency || 'INR', 
      timestamp: serverTimestamp(),
      paymentJson: JSON.stringify(paymentResponse)
    });
    
    // Handle coupon usage increment if a coupon was used
    try {
      if (updatedBooking.coupon && updatedBooking.coupon.id) {
        console.log('🏷️ Updating coupon usage count for:', updatedBooking.coupon.code);
        
        const couponRef = doc(db, 'coupons', updatedBooking.coupon.id);
        
        // Update the coupon usage count
        await updateDoc(couponRef, {
          usageCount: increment(1),
          updatedAt: serverTimestamp()
        });
        
        console.log('✅ Coupon usage count updated successfully');
      }
    } catch (couponError) {
      // Don't fail the payment if coupon update fails, just log the error
      console.error('Error updating coupon usage count:', couponError);
    }
    
    return updatedBooking;
  } catch (error) {
    console.error('Error handling payment success:', error);
    throw new Error('Failed to complete payment');
  }
};

/**
 * Handle failed payment
 * @param {string} bookingId - Booking ID
 * @param {Object} error - Error details
 * @returns {Promise<void>}
 */
export const handlePaymentFailure = async (bookingId, error) => {
  await savePaymentFailureDetails(bookingId, {
    code: error.code || 'unknown',
    description: error.description || error.message || 'Unknown error',
    source: error.source || 'client',
    step: error.step || 'payment',
    timestamp: new Date().toISOString()
  });
};
