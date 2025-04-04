const express = require('express')
const router = express.Router()
const axios = require('axios')

// API 金鑰
const INCH_API_KEY = process.env.ONEINCH_API_KEY || '';

const CONFIG = {
  RETRY: {
    INITIAL_BACKOFF: 1000, // 初始退避時間 (ms)
    MAX_BACKOFF: 10000, // 最大退避時間 (ms)
    MAX_RETRIES: 3 // 最大重試次數
  }
};

async function apiRequest(url, config, tag = 'API') {
  let retries = 0;
  
  while (true) {
    try {
      return await axios.get(url, config);
    } catch (error) {
      retries++;
      
      // 如果不是429錯誤或已達最大重試次數，拋出錯誤
      if (error.response?.status !== 429 || retries >= CONFIG.RETRY.MAX_RETRIES) {
        throw error;
      }
      
      // 計算退避時間 (指數退避策略)
      const backoffTime = Math.min(
        CONFIG.RETRY.INITIAL_BACKOFF * Math.pow(2, retries - 1),
        CONFIG.RETRY.MAX_BACKOFF
      );
      
      console.warn(`${tag} 請求限制，等待 ${backoffTime}ms 後重試 (${retries}/${CONFIG.RETRY.MAX_RETRIES})`);
      
      // 等待退避時間後再重試
      await new Promise(resolve => setTimeout(resolve, backoffTime));
    }
  }
}

async function getDepositData(tokenAddress, userAddress, amount, chainId, dstTokenAddress) {
  const url = `https://api.1inch.dev/swap/v6.0/${chainId}/swap`
  const config = {
    headers: {
      'Authorization': `Bearer ${INCH_API_KEY}`
    },
    params:{
      src: tokenAddress,
      dst: dstTokenAddress,
      amount: amount,
      from: userAddress,
      origin: userAddress,
      slippage: 1,
      disableEstimate: true,
      includeTokensInfo: true,
      includeProtocols: true
    }
  };
  const response = await apiRequest(url, config, 'Token swap');
  return response.data;
}

async function getTokenApprove(tokenAddress, amount, chainId) {
  const url = `https://api.1inch.dev/swap/v6.0/${chainId}/approve/transaction`;

  const config = {
    headers: {
      'Authorization': `Bearer ${INCH_API_KEY}`
    },
    params:{
      "tokenAddress": tokenAddress,
      "amount": amount
    }
  };
  const response = await apiRequest(url, config, 'Token Approve');
  return response.data;
}

router.post('/approve', async (req, res, next) => {
  try {
    const {chainId, tokens, amounts} = req.body
    if (tokens.length != amounts.length) {
        return res.status(400).json({
            status: 'error',
            message: 'tokens 和 amounts 的長度不相等'
        });
    }
    const approveData = [];
    for (let i = 0; i < tokens.length; i++) {
        try {
            const tokenApproveData = await getTokenApprove(tokens[i], amounts[i], chainId);
            approveData.push(tokenApproveData);
        } catch (error) {
            console.error(`獲取 token ${tokens[i]} 的 approve 數據失敗:`, error);
            // 繼續處理下一個 token，不中斷整個流程
        }
    }
    return res.status(200).json({ approveData });
  } catch (error) {
    console.error('處理 GetApproveCalldata 請求時發生錯誤:', error);
    return res.status(500).json({
        status: 'error',
        message: '處理請求時發生錯誤',
        error: error.message
    });
  }
})

router.post('/swap', async (req, res) => {
  try {
     const { chainId, userAddress, tokens, amounts, dstTokenAddress } = req.body;    
     console.log(chainId, userAddress, tokens, amounts, dstTokenAddress)
     if (tokens.length != amounts.length) {
        return res.status(400).json({
            status: 'error',
            message: 'tokens 和 amounts 的長度不相等'
        });
      }
      const depositDatas = [];
      for (let i = 0; i < tokens.length; i++) {
        const depositData = await getDepositData(tokens[i], userAddress, amounts[i], chainId, dstTokenAddress);
        depositDatas.push(depositData)
      }
      return res.status(200).json({ depositDatas });
  } catch (error) {
      console.error('處理 Swap 請求時發生錯誤:', error);
      
      return res.status(500).json({
          status: 'error',
          message: '處理請求時發生錯誤',
          error: error.message
      });
  }
});

module.exports = router 