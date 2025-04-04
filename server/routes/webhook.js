const express = require('express')
const router = express.Router()

// Remove empty middleware
// Apply webhook verification middleware to all routes (if needed in future)
// router.use(verifyWebhookSignature);

// Handle deposit events
router.post('/deposit', async (req, res) => {
  try {
    const { event, data } = req.body
    
    // Log the event (in production, you would store this in a database)
    console.log('Received deposit event:', {
      event,
      data,
      timestamp: new Date().toISOString()
    })

    // Here you would typically:
    // 1. Validate the event data
    // 2. Update your database
    // 3. Trigger any necessary business logic
    
    res.json({ status: 'success', message: 'Event processed' })
  } catch (error) {
    console.error('Error processing webhook:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

// Handle withdrawal events
router.post('/withdrawal', async (req, res) => {
  try {
    const { event, data } = req.body
    
    // Log the event
    console.log('Received withdrawal event:', {
      event,
      data,
      timestamp: new Date().toISOString()
    })

    // Process withdrawal event
    res.json({ status: 'success', message: 'Event processed' })
  } catch (error) {
    console.error('Error processing webhook:', error)
    res.status(500).json({ error: 'Internal server error' })
  }
})

module.exports = router 