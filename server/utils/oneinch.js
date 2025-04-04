const axios = require('axios');
const config = require('../../shared/config');

// 獲取錢包餘額
async function getWalletBalances(chainId, walletAddress) {
  try {
    // 這裡應該實現實際的餘額查詢邏輯
    // 目前返回模擬數據
    return {
      walletAddress,
      chainId,
      balances: [
        {
          token: "USDC",
          balance: "1000.00",
          usdValue: "1000.00"
        },
        {
          token: "DAI",
          balance: "500.00",
          usdValue: "500.00"
        }
      ]
    };
  } catch (error) {
    console.error('Error fetching wallet balances:', error);
    throw error;
  }
}

module.exports = {
  getWalletBalances
};