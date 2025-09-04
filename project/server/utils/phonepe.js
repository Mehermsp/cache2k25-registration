const crypto = require('crypto');
const axios = require('axios');

class PhonePePayment {
  constructor() {
    this.merchantId = process.env.PHONEPE_MERCHANT_ID || 'PGTESTPAYUAT';
    this.saltKey = process.env.PHONEPE_SALT_KEY || '099eb0cd-02cf-4e2a-8aca-3e6c6aff0399';
    this.saltIndex = process.env.PHONEPE_SALT_INDEX || '1';
    this.baseUrl = process.env.PHONEPE_BASE_URL || 'https://api-preprod.phonepe.com/apis/pg-sandbox';
  }

  generateChecksum(payload) {
    const string = payload + '/pg/v1/pay' + this.saltKey;
    const sha256 = crypto.createHash('sha256').update(string).digest('hex');
    return sha256 + '###' + this.saltIndex;
  }

  generateStatusChecksum(merchantTransactionId) {
    const string = `/pg/v1/status/${this.merchantId}/${merchantTransactionId}` + this.saltKey;
    const sha256 = crypto.createHash('sha256').update(string).digest('hex');
    return sha256 + '###' + this.saltIndex;
  }

  async createPaymentRequest(amount, merchantTransactionId, userDetails, callbackUrl) {
    const payload = {
      merchantId: this.merchantId,
      merchantTransactionId: merchantTransactionId,
      merchantUserId: userDetails.userId || 'USER_' + Date.now(),
      amount: amount * 100, // Convert to paise
      redirectUrl: callbackUrl,
      redirectMode: 'POST',
      callbackUrl: callbackUrl,
      mobileNumber: userDetails.phone,
      paymentInstrument: {
        type: 'PAY_PAGE'
      }
    };

    const base64Payload = Buffer.from(JSON.stringify(payload)).toString('base64');
    const checksum = this.generateChecksum(base64Payload);

    try {
      const response = await axios.post(
        `${this.baseUrl}/pg/v1/pay`,
        {
          request: base64Payload
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'X-VERIFY': checksum,
            'accept': 'application/json'
          }
        }
      );

      return {
        success: true,
        data: response.data,
        paymentUrl: response.data.data?.instrumentResponse?.redirectInfo?.url
      };
    } catch (error) {
      console.error('PhonePe payment request error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }

  async checkPaymentStatus(merchantTransactionId) {
    const checksum = this.generateStatusChecksum(merchantTransactionId);

    try {
      const response = await axios.get(
        `${this.baseUrl}/pg/v1/status/${this.merchantId}/${merchantTransactionId}`,
        {
          headers: {
            'Content-Type': 'application/json',
            'X-VERIFY': checksum,
            'X-MERCHANT-ID': this.merchantId,
            'accept': 'application/json'
          }
        }
      );

      return {
        success: true,
        data: response.data
      };
    } catch (error) {
      console.error('PhonePe status check error:', error.response?.data || error.message);
      return {
        success: false,
        error: error.response?.data || error.message
      };
    }
  }
}

module.exports = PhonePePayment;