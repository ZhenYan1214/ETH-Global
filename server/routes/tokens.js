const express = require('express')
const router = express.Router()
const { getTokenBalances, getTokenPrices } = require('../utils/oneinch')

router.get('/:address', async (req, res, next) => {
  try {
    const { address } = req.params
    const { chainId } = req.query

    // Get token balances
    const balances = await getTokenBalances(address, chainId)
    
    // Get token prices for non-zero balances
    const tokensWithBalance = Object.entries(balances)
      .filter(([_, balance]) => balance !== '0')
      .map(([token]) => token)
    
    const prices = await getTokenPrices(tokensWithBalance, chainId)

    // Combine balances with prices
    const result = Object.entries(balances).map(([token, balance]) => ({
      token,
      balance,
      price: prices[token] || '0',
      value: (parseFloat(balance) * parseFloat(prices[token] || '0')).toString()
    }))

    res.json(result)
  } catch (error) {
    next(error)
  }
})

module.exports = router 