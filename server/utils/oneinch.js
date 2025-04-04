const axios = require('axios');

// 1inch API 的基礎 URL 和你的 API Key
const BASE_URL = process.env.ONEINCH_API_URL;
const API_KEY = process.env.ONEINCH_API_KEY; // 從環境變數中獲取會更安全

// 簡單的延遲函數，用於重試
const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

// 獲取錢包餘額
async function getWalletBalances(chainId, walletAddress) {
  try {
    // 檢查環境變數
    if (!BASE_URL || !API_KEY) {
      throw new Error("ONEINCH_API_URL 或 ONEINCH_API_KEY 未在環境變數中設置");
    }

    // 構建 API 請求 URL（獲取餘額）
    const url = `${BASE_URL}/${chainId}/balances/${walletAddress}`;
    console.log("Request URL (Balances):", url); // 調試用日誌

    // 發送 GET 請求到 1inch API（獲取餘額）
    const response = await axios.get(url, {
      headers: {
        Authorization: `Bearer ${API_KEY}`,
      },
    });

    // 檢查回應狀態碼
    if (response.status !== 200) {
      throw new Error(`1inch API 回應錯誤（餘額），狀態碼：${response.status}`);
    }

    // 1inch API 回應的數據格式（假設回應是一個 token 地址到餘額的映射）
    const balancesData = response.data;
    console.log("1inch API Response (Balances):", balancesData); // 調試用日誌

    // 過濾餘額大於 0 的 token
    const filteredBalances = [];
    const tokenAddresses = []; // 用於存儲代幣地址，以便查詢價格
    for (const [tokenAddress, balance] of Object.entries(balancesData)) {
      // 假設 balance 是字符串格式，轉為數字進行比較
      const balanceInNumber = parseFloat(balance);
      if (balanceInNumber > 0) {
        filteredBalances.push({
          token: tokenAddress, // 這裡應該是 token 符號，後面可以改進
          balance: balanceInNumber.toString(),
          usdValue: 'N/A', // 暫時設為 N/A，稍後會更新為實際價格
        });
        tokenAddresses.push(tokenAddress); // 收集代幣地址
      }
    }

    // 如果有代幣，查詢它們的價格
    if (tokenAddresses.length > 0) {
      // 構建 Spot Price API 請求 URL
      const priceUrl = `https://api.1inch.dev/price/v1.1/${chainId}/${tokenAddresses.join(',')}`;
      console.log("Request URL (Prices):", priceUrl); // 調試用日誌

      // 添加重試邏輯，最多重試 3 次
      let priceData = null;
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          // 發送 GET 請求到 1inch Spot Price API
          const priceResponse = await axios.get(priceUrl, {
            headers: {
              Authorization: `Bearer ${API_KEY}`,
            },
            params: {
              currency: 'USD',
            },
            paramsSerializer: {
              indexes: null,
            },
          });

          // 檢查回應狀態碼
          if (priceResponse.status !== 200) {
            throw new Error(`1inch API 回應錯誤（價格），狀態碼：${priceResponse.status}`);
          }

          // 獲取價格資料
          priceData = priceResponse.data;
          console.log("1inch API Response (Prices):", priceData); // 調試用日誌
          break; // 成功獲取價格，退出重試循環
        } catch (error) {
          if (error.response && error.response.status === 429) {
            console.warn(`Rate limit exceeded, retrying (${attempt}/3) after delay...`);
            if (attempt === 3) {
              console.error("Max retries reached for Spot Price API, skipping price fetch.");
              break; // 達到最大重試次數，跳出循環
            }
            await delay(2000 * attempt); // 每次重試等待更長時間（2秒、4秒、6秒）
          } else {
            console.error("Error fetching prices from 1inch:", error.message);
            break; // 其他錯誤，直接跳出循環
          }
        }
      }

      // 如果成功獲取價格，更新 filteredBalances
      if (priceData) {
        filteredBalances.forEach(balance => {
          const tokenAddress = balance.token;
          if (priceData[tokenAddress]) {
            balance.usdValue = priceData[tokenAddress]; // 更新 usdValue 為實際價格
          }
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
    console.error('Error fetching wallet balances or prices from 1inch:', error.message);
    throw error;
  }
}

module.exports = {
  getWalletBalances,
};