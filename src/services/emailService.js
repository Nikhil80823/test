import { functions } from '../firebase';
import { httpsCallable } from 'firebase/functions';

/**
 * Email service for sending booking confirmation emails
 */
export class EmailService {
  constructor() {
    // Get the callable function for sending emails
    this.sendBookingConfirmationEmail = httpsCallable(functions, 'sendBookingConfirmationEmail');
  }

  /**
 * Send booking confirmation email with all participant details
 * @param {Object} bookingData - Booking details with participants array
 * @param {Object} trekData - Trek details
 * @returns {Promise<boolean>} - Success status
 */
async sendConfirmationEmail(bookingData, trekData) {
  try {
    console.log('📧 Sending booking confirmation email...');
    console.log('🔍 Input data validation:');
    console.log('  - Booking data:', bookingData);
    console.log('  - Trek data:', trekData);
    
    // Validate input data
    if (!bookingData) {
      console.error('❌ No booking data provided');
      return false;
    }
    
    if (!trekData) {
      console.error('❌ No trek data provided');
      return false;
    }
    
    // ✅ NEW: Create participant list HTML
    const participantListHTML = (bookingData.participants || [])
      .map((p, index) => `
        <tr style="border-bottom: 1px solid #eee;">
          <td style="padding: 12px; text-align: center; font-weight: 600;">
            ${index + 1}
          </td>
          <td style="padding: 12px;">
            ${p.name || `Participant ${index + 1}`}
            ${p.isPrimaryBooker ? '<span style="background: linear-gradient(135deg, #3399cc, #00b4db); color: white; padding: 2px 8px; border-radius: 12px; font-size: 11px; margin-left: 8px;">Primary Booker</span>' : ''}
          </td>
          <td style="padding: 12px; color: #666;">
            ${p.email || 'N/A'}
          </td>
          <td style="padding: 12px; text-align: center; color: #666;">
            ${p.age || 'N/A'}
          </td>
          <td style="padding: 12px; color: #666;">
            ${p.emergencyContact || 'N/A'}
          </td>
        </tr>
      `)
      .join('');
    
    // Prepare email data
    const emailData = {
      booking: {
        id: bookingData.id || bookingData.bookingId,
        
        // ✅ NEW: Primary booker info
        primaryBooker: bookingData.primaryBooker || {
          name: bookingData.name,
          email: bookingData.email || bookingData.userEmail,
          contactNumber: bookingData.contactNumber
        },
        
        // ✅ NEW: Participants array
        participants: bookingData.participants || [],
        totalParticipants: bookingData.totalParticipants || bookingData.participants?.length || 1,
        
        // Other booking details
        startDate: bookingData.startDate,
        totalAmount: bookingData.totalAmount || bookingData.amount,
        pricePerPerson: bookingData.pricePerPerson,
        subtotal: bookingData.subtotal,
        discount: bookingData.discount || bookingData.discountAmount || 0,
        paymentId: bookingData.paymentId,
        status: bookingData.status,
        paymentStatus: bookingData.paymentStatus,
        specialRequests: bookingData.specialRequests,
        createdAt: bookingData.createdAt || new Date().toISOString()
      },
      trek: {
        title: trekData.title || trekData.name,
        location: trekData.location,
        duration: trekData.duration,
        difficulty: trekData.difficulty,
        imageUrl: trekData.imageUrl || trekData.image,
        description: trekData.description
      },
      
      // ✅ NEW: Add HTML for participant list
      participantListHTML: participantListHTML
    };

    console.log('📤 Prepared email data for Firebase function:');
    console.log('  - Booking ID:', emailData.booking.id);
    console.log('  - Primary Booker:', emailData.booking.primaryBooker.name);
    console.log('  - Total Participants:', emailData.booking.totalParticipants);
    console.log('  - All Participants:', emailData.booking.participants.map(p => p.name).join(', '));

    // Call the Firebase Cloud Function
    const result = await this.sendBookingConfirmationEmail(emailData);
    
    if (result.data.success) {
      console.log('✅ Email sent successfully');
      return true;
    } else {
      console.error('❌ Failed to send email:', result.data.error);
      return false;
    }
  } catch (error) {
    console.error('❌ Error sending confirmation email:', error);
    console.error('❌ Error details:', {
      name: error.name,
      message: error.message,
      code: error.code,
      details: error.details
    });
    return false;
  }
}

  /**
   * Send payment failure email
   * @param {Object} bookingData - Booking details
   * @param {Object} trekData - Trek details  
   * @param {string} errorMessage - Error message
   * @returns {Promise<boolean>} - Success status
   */
  async sendPaymentFailureEmail(bookingData, trekData, errorMessage) {
    try {
      console.log('📧 Sending payment failure email...');
      
      const emailData = {
        booking: {
          id: bookingData.id || bookingData.bookingId,
          name: bookingData.name,
          email: bookingData.email || bookingData.userEmail,
          contactNumber: bookingData.contactNumber,
          startDate: bookingData.startDate,
          participants: bookingData.participants || 1,
          totalAmount: bookingData.totalAmount || bookingData.amount,
          errorMessage: errorMessage
        },
        trek: {
          title: trekData.title || trekData.name,
          location: trekData.location,
          duration: trekData.duration
        }
      };

      // You can add a separate function for payment failure emails
      // For now, we'll use a flag in the confirmation email function
      emailData.isFailureEmail = true;

      const result = await this.sendBookingConfirmationEmail(emailData);
      
      if (result.data.success) {
        console.log('✅ Payment failure email sent successfully');
        return true;
      } else {
        console.error('❌ Failed to send payment failure email:', result.data.error);
        return false;
      }
    } catch (error) {
      console.error('❌ Error sending payment failure email:', error);
      return false;
    }
  }
}

// Export a singleton instance
export const emailService = new EmailService();
export default emailService;
