const express = require('express')
const router = express.Router()
const {
  createWallet,
  getWallet,
  listWallets,
  createTransfer,
  getTransfer
} = require('../utils/circle')

// Create a new wallet
router.post('/wallets', async (req, res, next) => {
  try {
    const wallet = await createWallet(req.body)
    res.json(wallet)
  } catch (error) {
    next(error)
  }
})

// Get wallet details
router.get('/wallets/:id', async (req, res, next) => {
  try {
    const wallet = await getWallet(req.params.id)
    res.json(wallet)
  } catch (error) {
    next(error)
  }
})

// List all wallets
router.get('/wallets', async (req, res, next) => {
  try {
    const wallets = await listWallets()
    res.json(wallets)
  } catch (error) {
    next(error)
  }
})

// Create a transfer
router.post('/transfers', async (req, res, next) => {
  try {
    const transfer = await createTransfer(req.body)
    res.json(transfer)
  } catch (error) {
    next(error)
  }
})

// Get transfer details
router.get('/transfers/:id', async (req, res, next) => {
  try {
    const transfer = await getTransfer(req.params.id)
    res.json(transfer)
  } catch (error) {
    next(error)
  }
})

module.exports = router 