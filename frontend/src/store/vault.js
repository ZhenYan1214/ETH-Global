import { defineStore } from 'pinia'
import { ref } from 'vue'

export const useVaultStore = defineStore('vault', () => {
  const depositedAmount = ref('0')
  const interestRate = ref('0')
  const totalValue = ref('0')

  function setDepositedAmount(amount) {
    depositedAmount.value = amount
  }

  function setInterestRate(rate) {
    interestRate.value = rate
  }

  function setTotalValue(value) {
    totalValue.value = value
  }

  return {
    depositedAmount,
    interestRate,
    totalValue,
    setDepositedAmount,
    setInterestRate,
    setTotalValue
  }
}) 