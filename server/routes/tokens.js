const express = require('express')
const router = express.Router()
const axios = require('axios')

// 1inch API 的基礎 URL 和 API Key
const BASE_URL = process.env.ONEINCH_API_URL || "https://api.1inch.dev";
const API_KEY = process.env.ONEINCH_API_KEY || "";

// 查詢所有可用代幣的路由
router.get("/list/:chainId", async (req, res) => {
  try {
    const { chainId } = req.params;
    console.log(`前端請求：獲取所有代幣列表 chainId=${chainId}`);
    const result = await getAllTokens(chainId);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: "無法獲取代幣列表", details: error.message });
  }
});

// 查詢錢包餘額的路由
router.get("/balances/:chainId/:walletAddress", async (req, res) => {
  try {
    const { chainId, walletAddress } = req.params;
    console.log(`前端請求：查詢 chainId=${chainId}, walletAddress=${walletAddress}`);
    const result = await getWalletBalances(chainId, walletAddress);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: "無法獲取錢包餘額", details: error.message });
  }
});

// 查詢 token 價格的路由
router.get("/prices/:chainId/:tokenAddresses", async (req, res) => {
  try {
    const { chainId, tokenAddresses } = req.params;
    const tokenArray = tokenAddresses.split(",");
    console.log(`前端請求：查詢價格 chainId=${chainId}, tokens=${tokenAddresses}`);
    const result = await getTokenSpotPrices(chainId, tokenArray);
    res.status(200).json(result);
  } catch (error) {
    console.error("Token price error:", error);
    res.status(500).json({ error: "無法獲取價格", details: error.message });
  }
});

// 獲取所有代幣
async function getAllTokens(chainId, retries = 3, delay = 1000) {
  try {
    const url = `${BASE_URL}/swap/v6.0/${chainId}/tokens`;
    console.log("Request URL (All Tokens):", url);

    let response;
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        response = await axios.get(url, {
          headers: {
            Authorization: `Bearer ${API_KEY}`,
          },
          paramsSerializer: {
            indexes: null
          }
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

    const tokensData = response.data;
    console.log("1inch API Response (All Tokens):", Object.keys(tokensData.tokens).length, "tokens found");
    
    // 添加鏈 ID 和時間戳記錄
    return {
      chainId,
      timestamp: new Date().toISOString(),
      tokens: tokensData.tokens
    };
  } catch (error) {
    console.error("Error fetching all tokens from 1inch:", error.message);
    throw error;
  }
}

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

// 獲取 token 即時價格 - 使用新的 POST API
async function getTokenSpotPrices(chainId, tokenAddresses, retries = 3, delay = 1000) {
  try {
    const url = `${BASE_URL}/price/v1.1/${chainId}`;
    console.log("Request URL (Prices):", url);
    
    // 準備請求配置
    const config = {
      headers: {
        "Authorization": `Bearer ${API_KEY}`
      },
      paramsSerializer: {
        indexes: null
      }
    };
    
    // 準備請求體
    const body = {
      "tokens": tokenAddresses,
      "currency": "USD"
    };
    
    console.log("Price request body:", body);
    
    // 發送 POST 請求
    let response;
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        response = await axios.post(url, body, config);
        break;
      } catch (error) {
        console.error(`嘗試 ${attempt}/${retries} 失敗:`, error.message);
        if (attempt === retries) throw error;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
    
    return response.data;
    
  } catch (error) {
    console.error("Error fetching token prices from 1inch:", error.message);
    throw error;
  }
}

module.exports = router 