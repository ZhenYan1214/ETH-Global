const axios = require('axios');

// 1inch API 的基礎 URL 和你的 API Key
const BASE_URL = process.env.ONEINCH_API_URL;
const API_KEY = process.env.ONEINCH_API_KEY; // 從環境變數中獲取會更安全

// 獲取錢包餘額
async function getWalletBalances(chainId, walletAddress) {
  try {
    // 檢查環境變數
    if (!BASE_URL || !API_KEY) {
      throw new Error("ONEINCH_API_URL 或 ONEINCH_API_KEY 未在環境變數中設置");
    }

    // 構建 API 請求 URL
    const url = `${BASE_URL}/${chainId}/balances/${walletAddress}`;
    console.log("Request URL:", url); // 調試用日誌

    // 發送 GET 請求到 1inch API
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${API_KEY}`,
      },
    });

    // 檢查回應狀態碼
    if (response.status !== 200) {
      throw new Error(`1inch API 回應錯誤，狀態碼：${response.status}`);
    }

    // 1inch API 回應的數據格式（假設回應是一個 token 地址到餘額的映射）
    const balancesData = response.data;
    console.log("1inch API Response:", balancesData); // 調試用日誌

    // 過濾餘額大於 0 的 token
    const filteredBalances = [];
    for (const [tokenAddress, balance] of Object.entries(balancesData)) {
      // 假設 balance 是字符串格式，轉為數字進行比較
      const balanceInNumber = parseFloat(balance);
      if (balanceInNumber > 0) {
        // 這裡可以進一步查詢 token 的符號（例如 USDC、DAI 等）
        // 目前我們先簡單地用 token 地址作為標識
        filteredBalances.push({
          token: tokenAddress, // 這裡應該是 token 符號，後面可以改進
          balance: balanceInNumber.toString(),
          usdValue: 'N/A', // 1inch balance API 不直接提供 USD 價值，可能需要額外查詢
        });
      }
    }

    // 返回格式化的結果
    return {
      walletAddress,
      chainId,
      balances: filteredBalances,
    };
  } catch (error) {
    console.error('Error fetching wallet balances from 1inch:', error.message);
    throw error;
  }
}

module.exports = {
  getWalletBalances,
};