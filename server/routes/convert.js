const express = require('express')
const router = express.Router()
const { getQuote, getSwap } = require('../utils/oneinch')

router.get('/quote', async (req, res, next) => {
  try {
    const { fromToken, toToken, amount, fromAddress } = req.query
    
    if (!fromToken || !toToken || !amount || !fromAddress) {
      return res.status(400).json({ error: 'Missing required parameters' })
    }

    const quote = await getQuote({
      fromToken,
      toToken,
      amount,
      fromAddress
    })

    res.json(quote)
  } catch (error) {
    next(error)
  }
})

router.get('/swap', async (req, res, next) => {
  try {
    const { fromToken, toToken, amount, fromAddress, slippage } = req.query
    
    if (!fromToken || !toToken || !amount || !fromAddress) {
      return res.status(400).json({ error: 'Missing required parameters' })
    }

    const swapData = await getSwap({
      fromToken,
      toToken,
      amount,
      fromAddress,
      slippage: slippage || '1'
    })

    res.json(swapData)
  } catch (error) {
    next(error)
  }
})

module.exports = router 