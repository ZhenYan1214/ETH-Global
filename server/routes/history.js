const express = require('express')
const router = express.Router()
const { getEvents, getTransaction } = require('../utils/multibaas')

// Get transaction history for a specific address
router.get('/:address', async (req, res, next) => {
  try {
    const { address } = req.params
    const { fromBlock, toBlock, eventName } = req.query

    if (!fromBlock || !toBlock) {
      return res.status(400).json({ error: 'Missing block range parameters' })
    }

    // Get events for the address
    const events = await getEvents(
      process.env.VAULT_CONTRACT_ADDRESS,
      eventName || 'Transfer',
      fromBlock,
      toBlock
    )

    // Filter events for the specific address
    const filteredEvents = events.filter(event => 
      event.args.from.toLowerCase() === address.toLowerCase() ||
      event.args.to.toLowerCase() === address.toLowerCase()
    )

    // Get transaction details for each event
    const transactions = await Promise.all(
      filteredEvents.map(async event => {
        const tx = await getTransaction(event.transactionHash)
        return {
          ...event,
          transaction: tx
        }
      })
    )

    res.json(transactions)
  } catch (error) {
    next(error)
  }
})

// Get specific transaction details
router.get('/transaction/:txHash', async (req, res, next) => {
  try {
    const { txHash } = req.params
    const transaction = await getTransaction(txHash)
    res.json(transaction)
  } catch (error) {
    next(error)
  }
})

module.exports = router 