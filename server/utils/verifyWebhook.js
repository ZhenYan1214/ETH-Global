const crypto = require('crypto')

function verifyWebhook(req, res, next) {
  const signature = req.headers['x-multibaas-signature']
  const timestamp = req.headers['x-multibaas-timestamp']

  if (!signature || !timestamp) {
    return res.status(401).json({ error: 'Missing signature or timestamp' })
  }

  const payload = JSON.stringify(req.body)
  const data = `${timestamp}.${payload}`
  const expectedSignature = crypto
    .createHmac('sha256', process.env.WEBHOOK_SECRET)
    .update(data)
    .digest('hex')

  if (signature !== expectedSignature) {
    return res.status(401).json({ error: 'Invalid signature' })
  }

  // Verify timestamp is not too old (e.g., within 5 minutes)
  const timestampAge = Date.now() - parseInt(timestamp)
  if (timestampAge > 5 * 60 * 1000) {
    return res.status(401).json({ error: 'Request too old' })
  }

  next()
}

module.exports = verifyWebhook 