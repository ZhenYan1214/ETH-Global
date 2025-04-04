const axios = require("axios");

// 1inch API 的基礎 URL 和你的 API Key
const BASE_URL = process.env.ONEINCH_API_URL || "https://api.1inch.dev";
const API_KEY = process.env.ONEINCH_API_KEY || "E7WfrujlMqIk1UJGeOhzdpZEQ4C93dxJ";

// 獲取錢包餘額
async function getWalletBalances(chainId, walletAddress, retries = 3, delay = 1000) {
  try {
    const url = `${BASE_URL}/balance/v1.2/${chainId}/balances/${walletAddress}`; // 修正 URL
    console.log("Request URL (Balances):", url);

    let response;
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        response = await axios.get(url, {
          headers: {
            Authorization: `Bearer ${API_KEY}`,
          },
        });
        if (response.status !== 200) {
          throw new Error(`1inch API 回應錯誤，狀態碼：${response.status}`);
        }
        break;
      } catch (error) {
        console.error(`嘗試 ${attempt}/${retries} 失敗:`, error.message);
        if (attempt === retries) throw error;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    const balancesData = response.data;
    console.log("1inch API Response (Balances):", balancesData);

    const filteredBalances = [];
    for (const [tokenAddress, balance] of Object.entries(balancesData)) {
      const balanceInNumber = parseFloat(balance);
      if (balanceInNumber > 0) {
        filteredBalances.push({
          token: tokenAddress,
          balance: balanceInNumber.toString(),
          usdValue: "N/A",
        });
      }
    }

    return {
      walletAddress,
      chainId,
      balances: filteredBalances,
    };
  } catch (error) {
    console.error("Error fetching wallet balances from 1inch:", error.message);
    throw error;
  }
}

// 獲取 token 即時價格
async function getTokenSpotPrices(chainId, tokenAddresses, retries = 3, delay = 1000) {
  try {
    const url = `${BASE_URL}/price/v1.1/${chainId}/${tokenAddresses.join(",")}`;
    console.log("Request URL (Prices):", url);

    let response;
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        response = await axios.get(url, {
          headers: {
            Authorization: `Bearer ${API_KEY}`,
          },
          paramsSerializer: { indexes: null },
        });
        if (response.status !== 200) {
          throw new Error(`1inch API 回應錯誤，狀態碼：${response.status}`);
        }
        break;
      } catch (error) {
        console.error(`嘗試 ${attempt}/${retries} 失敗:`, error.message);
        if (attempt === retries) throw error;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    const pricesData = response.data;
    console.log("1inch API Response (Prices):", pricesData);
    return pricesData;
  } catch (error) {
    console.error("Error fetching token prices from 1inch:", error.message);
    throw error;
  }
}

module.exports = {
  getWalletBalances,
  getTokenSpotPrices,
};