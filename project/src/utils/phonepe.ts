// PhonePe payment gateway utility functions

export interface PhonePePaymentRequest {
  amount: number;
  userDetails: {
    name: string;
    email: string;
    phone: string;
    userId?: string;
  };
  eventDetails: {
    eventId: string;
    eventName: string;
  };
}

export interface PhonePeResponse {
  success: boolean;
  merchantTransactionId?: string;
  paymentUrl?: string;
  error?: string;
}

export const createPhonePePayment = async (paymentRequest: PhonePePaymentRequest): Promise<PhonePeResponse> => {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/create-payment`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(paymentRequest),
    });
    
    if (!response.ok) {
      throw new Error('Failed to create payment');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error creating PhonePe payment:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error'
    };
  }
};

export const checkPaymentStatus = async (merchantTransactionId: string) => {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/payment-status/${merchantTransactionId}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error('Failed to check payment status');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error checking payment status:', error);
    throw error;
  }
};

export const saveRegistration = async (registrationData: any) => {
  try {
    const response = await fetch(`${import.meta.env.VITE_API_URL}/api/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(registrationData),
    });
    
    if (!response.ok) {
      throw new Error('Failed to save registration');
    }
    
    return await response.json();
  } catch (error) {
    console.error('Error saving registration:', error);
    throw error;
  }
};