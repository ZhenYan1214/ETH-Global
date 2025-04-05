import { ethers } from 'ethers'

export function formatAddress(address) {
  if (!address) return ''
  return `${address.slice(0, 6)}...${address.slice(-4)}`
}

export function formatBalance(balance, decimals = 18) {
  if (!balance) return '0.00'
  console.log("balance", balance)
  console.log("decimals", decimals)
  const balanceValue = ethers.formatUnits(balance, decimals)
  console.log("balanceValue", balanceValue)
  return ethers.formatUnits(balance, decimals)
}

export function formatPercentage(value) {
  if (!value) return '0.00%'
  return `${parseFloat(value).toFixed(2)}%`
}

export function formatCurrency(value, currency = 'USD') {
  if (!value) return '0.00'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: currency
  }).format(value)
} 