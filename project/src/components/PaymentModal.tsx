import React, { useState } from 'react';
import { Registration } from '../types/Event';
import { X, Smartphone, QrCode, Shield, ExternalLink } from 'lucide-react';
import { createPhonePePayment, saveRegistration } from '../utils/phonepe';

interface PaymentModalProps {
  registration: Registration;
  onClose: () => void;
  onSuccess: () => void;
}

const PaymentModal: React.FC<PaymentModalProps> = ({ registration, onClose, onSuccess }) => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<'upi' | 'qr'>('upi');
  
  const getEventName = (eventId: string) => {
    const eventNames: Record<string, string> = {
      'web-dev': 'Web Development Challenge',
      'poster-presentation': 'Poster Presentation',
      'techexpo': 'Tech Expo',
      'pycharm': 'PyCharm Programming Contest',
      'technical-quiz': 'Technical Quiz',
      'photo-contest': 'Photography Contest',
      'live-drawing': 'Live Drawing',
      'tech-meme-contest': 'Tech Meme Contest',
      'bgmi-esports': 'BGMI Esports Tournament',
      'freefire-esports': 'Free Fire Esports Championship'
    };
    return eventNames[eventId] || 'Unknown Event';
  };

  const handlePayment = async () => {
    setIsProcessing(true);
    
    try {
      const paymentRequest = {
        amount: registration.totalAmount,
        userDetails: {
          name: registration.participantName,
          email: registration.email,
          phone: registration.phone,
          userId: `USER_${Date.now()}`
        },
        eventDetails: {
          eventId: registration.eventId,
          eventName: getEventName(registration.eventId)
        }
      };

      const paymentResponse = await createPhonePePayment(paymentRequest);
      
      if (paymentResponse.success && paymentResponse.paymentUrl) {
        // Store registration data temporarily in localStorage for callback
        const registrationWithPayment = {
          ...registration,
          merchantTransactionId: paymentResponse.merchantTransactionId,
          paymentMethod: selectedMethod,
          eventName: getEventName(registration.eventId)
        };
        
        localStorage.setItem('pendingRegistration', JSON.stringify(registrationWithPayment));
        
        // Redirect to PhonePe payment page
        window.open(paymentResponse.paymentUrl, '_blank');
        
        // Start polling for payment status
        pollPaymentStatus(paymentResponse.merchantTransactionId!);
      } else {
        throw new Error(paymentResponse.error || 'Failed to create payment');
      }
    } catch (error) {
      setIsProcessing(false);
      console.error('Payment error:', error);
      alert('Payment initialization failed. Please try again.');
    }
  };

  const pollPaymentStatus = async (merchantTransactionId: string) => {
    const maxAttempts = 30; // Poll for 5 minutes (10 seconds interval)
    let attempts = 0;
    
    const checkStatus = async () => {
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/api/payment-status/${merchantTransactionId}`);
        const statusData = await response.json();
        
        if (statusData.success && statusData.data.success) {
          // Payment successful
          const pendingRegistration = localStorage.getItem('pendingRegistration');
          if (pendingRegistration) {
            const registrationData = JSON.parse(pendingRegistration);
            registrationData.transactionId = statusData.data.data.transactionId;
            registrationData.paymentStatus = 'completed';
            
            await saveRegistration(registrationData);
            localStorage.removeItem('pendingRegistration');
            
            setIsProcessing(false);
            onSuccess();
          }
        } else if (statusData.data && statusData.data.code === 'PAYMENT_PENDING') {
          // Payment still pending, continue polling
          attempts++;
          if (attempts < maxAttempts) {
            setTimeout(checkStatus, 10000); // Check again in 10 seconds
          } else {
            setIsProcessing(false);
            alert('Payment verification timeout. Please check your payment status manually.');
          }
        } else {
          // Payment failed
          setIsProcessing(false);
          alert('Payment failed. Please try again.');
        }
      } catch (error) {
        console.error('Error checking payment status:', error);
        attempts++;
        if (attempts < maxAttempts) {
          setTimeout(checkStatus, 10000);
        } else {
          setIsProcessing(false);
          alert('Unable to verify payment status. Please contact support.');
        }
      }
    };
    
    // Start checking after 5 seconds
    setTimeout(checkStatus, 5000);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="bg-gradient-to-r from-purple-600 to-pink-600 text-white p-6 relative">
          <button
            onClick={onClose}
            className="absolute top-4 right-4 text-white hover:text-gray-200 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
          <div className="flex items-center space-x-3">
            <Shield className="w-6 h-6" />
            <h2 className="text-xl font-bold">Secure Payment</h2>
          </div>
          <p className="text-purple-100 text-sm mt-2">Powered by PhonePe</p>
        </div>

        {/* Payment Form */}
        <div className="p-6">
          {/* Order Summary */}
          <div className="bg-gray-50 p-4 rounded-lg mb-6">
            <h3 className="font-semibold text-gray-800 mb-2">Order Summary</h3>
            <div className="text-sm text-gray-600 space-y-1">
              <div>Event: <span className="font-medium">{getEventName(registration.eventId)}</span></div>
              <div>Participant: <span className="font-medium">{registration.participantName}</span></div>
              <div className="flex justify-between pt-2 border-t">
                <span className="font-semibold">Total:</span>
                <span className="font-bold text-green-600">₹{registration.totalAmount}</span>
              </div>
            </div>
          </div>

          {/* Payment Method Selection */}
          <div className="mb-6">
            <h3 className="font-semibold text-gray-800 mb-3">Choose Payment Method</h3>
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setSelectedMethod('upi')}
                className={`flex items-center justify-center p-4 border-2 rounded-lg transition-all duration-200 ${
                  selectedMethod === 'upi'
                    ? 'border-purple-500 bg-purple-50 text-purple-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <Smartphone className="w-6 h-6 mr-2" />
                <div className="text-left">
                  <div className="font-semibold">UPI</div>
                  <div className="text-xs text-gray-500">PhonePe, GPay, Paytm</div>
                </div>
              </button>
              
              <button
                type="button"
                onClick={() => setSelectedMethod('qr')}
                className={`flex items-center justify-center p-4 border-2 rounded-lg transition-all duration-200 ${
                  selectedMethod === 'qr'
                    ? 'border-purple-500 bg-purple-50 text-purple-700'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <QrCode className="w-6 h-6 mr-2" />
                <div className="text-left">
                  <div className="font-semibold">QR Code</div>
                  <div className="text-xs text-gray-500">Scan & Pay</div>
                </div>
              </button>
            </div>
          </div>

          {/* Payment Method Info */}
          <div className="bg-purple-50 border border-purple-200 p-4 rounded-lg mb-6">
            <div className="flex items-start space-x-2">
              <Smartphone className="w-5 h-5 text-purple-600 mt-0.5" />
              <div>
                <h4 className="font-semibold text-purple-800 text-sm">
                  {selectedMethod === 'upi' ? 'UPI Payment' : 'QR Code Payment'}
                </h4>
                <p className="text-purple-700 text-sm">
                  {selectedMethod === 'upi' 
                    ? 'Pay directly using your UPI ID or UPI apps like PhonePe, Google Pay, Paytm'
                    : 'Scan the QR code with any UPI app to complete your payment instantly'
                  }
                </p>
              </div>
            </div>
          </div>

          {/* Security Notice */}
          <div className="bg-green-50 border border-green-200 p-3 rounded-lg mb-6">
            <div className="flex items-center text-green-800 text-sm">
              <Shield className="w-4 h-4 mr-2" />
              <span>Bank-grade security • PCI DSS compliant • Encrypted transactions</span>
            </div>
          </div>

          {/* Pay Button */}
          <button
            onClick={handlePayment}
            disabled={isProcessing}
            className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 px-6 rounded-lg font-semibold text-lg hover:from-purple-700 hover:to-pink-700 transform hover:scale-105 transition-all duration-200 shadow-lg hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {isProcessing ? (
              <div className="flex items-center justify-center space-x-2">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Processing Payment...</span>
              </div>
            ) : (
              <div className="flex items-center justify-center space-x-2">
                {selectedMethod === 'upi' ? <Smartphone className="w-5 h-5" /> : <QrCode className="w-5 h-5" />}
                <span>Pay ₹{registration.totalAmount} via {selectedMethod.toUpperCase()}</span>
                <ExternalLink className="w-4 h-4" />
              </div>
            )}
          </button>

          <div className="mt-4 text-center">
            <p className="text-xs text-gray-500 mb-2">
              By clicking "Pay", you agree to our Terms of Service and Privacy Policy
            </p>
            <div className="flex items-center justify-center space-x-4 text-xs text-gray-400">
              <span>Powered by</span>
              <span className="font-semibold text-purple-600">PhonePe</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PaymentModal;