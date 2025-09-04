const express = require('express');
const cors = require('cors');
const { v4: uuidv4 } = require('uuid');
const connectDB = require('./config/database');
const Registration = require('./models/Registration');
const PhonePePayment = require('./utils/phonepe');

const app = express();
const PORT = process.env.PORT || 3001;

// Initialize PhonePe
const phonePe = new PhonePePayment();

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true
}));
app.use(express.json());

// Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', timestamp: new Date().toISOString() });
});

// Create PhonePe payment
app.post('/api/create-payment', async (req, res) => {
  try {
    const { amount, userDetails, eventDetails } = req.body;
    
    const merchantTransactionId = `TXN_${uuidv4()}`;
    const callbackUrl = `${req.protocol}://${req.get('host')}/api/payment-callback`;
    
    const paymentRequest = await phonePe.createPaymentRequest(
      amount,
      merchantTransactionId,
      userDetails,
      callbackUrl
    );
    
    if (paymentRequest.success) {
      res.json({
        success: true,
        merchantTransactionId,
        paymentUrl: paymentRequest.paymentUrl,
        data: paymentRequest.data
      });
    } else {
      res.status(400).json({
        success: false,
        error: paymentRequest.error
      });
    }
  } catch (error) {
    console.error('Error creating payment:', error);
    res.status(500).json({ error: 'Failed to create payment' });
  }
});

// PhonePe payment callback
app.post('/api/payment-callback', async (req, res) => {
  try {
    const { merchantTransactionId } = req.body;
    
    const statusCheck = await phonePe.checkPaymentStatus(merchantTransactionId);
    
    if (statusCheck.success && statusCheck.data.success) {
      // Payment successful - redirect to success page
      res.redirect(`http://localhost:5173?payment=success&txn=${merchantTransactionId}`);
    } else {
      // Payment failed - redirect to failure page
      res.redirect(`http://localhost:5173?payment=failed&txn=${merchantTransactionId}`);
    }
  } catch (error) {
    console.error('Payment callback error:', error);
    res.redirect(`http://localhost:5173?payment=error`);
  }
});

// Check payment status
app.get('/api/payment-status/:merchantTransactionId', async (req, res) => {
  try {
    const { merchantTransactionId } = req.params;
    
    const statusCheck = await phonePe.checkPaymentStatus(merchantTransactionId);
    
    res.json(statusCheck);
  } catch (error) {
    console.error('Error checking payment status:', error);
    res.status(500).json({ error: 'Failed to check payment status' });
  }
});

// Save registration
app.post('/api/register', async (req, res) => {
  try {
    const registrationData = req.body;
    
    const registration = new Registration({
      registrationId: `CACHE2K25_${uuidv4().substring(0, 8).toUpperCase()}`,
      ...registrationData,
      transactionDate: new Date(),
      paymentStatus: 'completed'
    });
    
    await registration.save();
    
    res.json({ 
      success: true, 
      registrationId: registration.registrationId,
      message: 'Registration saved successfully' 
    });
  } catch (error) {
    console.error('Error saving registration:', error);
    res.status(500).json({ error: 'Failed to process registration' });
  }
});

// Get all registrations (admin endpoint)
app.get('/api/registrations', async (req, res) => {
  try {
    const registrations = await Registration.find().sort({ createdAt: -1 });
    res.json(registrations);
  } catch (error) {
    console.error('Error fetching registrations:', error);
    res.status(500).json({ error: 'Failed to fetch registrations' });
  }
});

// Get registrations by event
app.get('/api/registrations/:eventId', async (req, res) => {
  try {
    const { eventId } = req.params;
    const registrations = await Registration.find({ eventId }).sort({ createdAt: -1 });
    res.json(registrations);
  } catch (error) {
    console.error('Error fetching event registrations:', error);
    res.status(500).json({ error: 'Failed to fetch event registrations' });
  }
});

// Export registrations to Excel
app.get('/api/export-excel', async (req, res) => {
  try {
    const registrations = await Registration.find().sort({ createdAt: -1 });
    
    // Convert to Excel format
    const excelData = registrations.map(reg => ({
      'Registration ID': reg.registrationId,
      'Event ID': reg.eventId,
      'Event Name': reg.eventName,
      'Participant Name': reg.participantName,
      'Email': reg.email,
      'Phone': reg.phone,
      'College': reg.college,
      'Roll Number': reg.rollNumber,
      'Total Amount': reg.totalAmount,
      'Payment Status': reg.paymentStatus,
      'Transaction ID': reg.transactionId,
      'Transaction Date': reg.transactionDate,
      'Team Members': reg.teamMembers ? JSON.stringify(reg.teamMembers) : '',
      'Game IDs': reg.gameIds ? JSON.stringify(reg.gameIds) : ''
    }));
    
    res.json(excelData);
  } catch (error) {
    console.error('Error exporting data:', error);
    res.status(500).json({ error: 'Failed to export data' });
  }
});

app.listen(PORT, () => {
  console.log(`🚀 Cache2K25 Backend Server running on port ${PORT}`);
  console.log(`📊 MongoDB connected and ready`);
  console.log(`💳 PhonePe Payment Gateway configured`);
  console.log(`🌐 Frontend should be running on: http://localhost:5173`);
});