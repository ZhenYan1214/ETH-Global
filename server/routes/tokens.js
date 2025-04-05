const express = require('express')
const router = express.Router()
const axios = require('axios')

// Base URL and API Key for 1inch API
const BASE_URL = process.env.ONEINCH_API_URL || "https://api.1inch.dev";
const API_KEY = process.env.ONEINCH_API_KEY || "";

// Route to query all available tokens
router.get("/list/:chainId", async (req, res) => {
  try {
    const { chainId } = req.params;
    console.log(`Frontend request: Get all tokens list chainId=${chainId}`);
    const result = await getAllTokens(chainId);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: "Unable to get token list", details: error.message });
  }
});

// Route to query wallet balances
router.get("/balances/:chainId/:walletAddress", async (req, res) => {
  try {
    const { chainId, walletAddress } = req.params;
    console.log(`Frontend request: Query chainId=${chainId}, walletAddress=${walletAddress}`);
    const result = await getWalletBalances(chainId, walletAddress);
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: "Unable to get wallet balances", details: error.message });
  }
});

// Route to query token prices
router.get("/prices/:chainId/:tokenAddresses", async (req, res) => {
  try {
    const { chainId, tokenAddresses } = req.params;
    const tokenArray = tokenAddresses.split(",");
    console.log(`Frontend request: Query prices chainId=${chainId}, tokens=${tokenAddresses}`);
    const result = await getTokenSpotPrices(chainId, tokenArray);
    res.status(200).json(result);
  } catch (error) {
    console.error("Token price error:", error);
    res.status(500).json({ error: "Unable to get prices", details: error.message });
  }
});

// Get all tokens
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
          throw new Error(`1inch API error response, status code: ${response.status}`);
        }
        break;
      } catch (error) {
        console.error(`Attempt ${attempt}/${retries} failed:`, error.message);
        if (attempt === retries) throw error;
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }

    const tokensData = response.data;
    console.log("1inch API Response (All Tokens):", Object.keys(tokensData.tokens).length, "tokens found");
    
    // Add chain ID and timestamp
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

// Get wallet balances
async function getWalletBalances(chainId, walletAddress, retries = 3, delay = 1000) {
  try {
    const url = `${BASE_URL}/balance/v1.2/${chainId}/balances/${walletAddress}`; // Fix URL
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
          throw new Error(`1inch API error response, status code: ${response.status}`);
        }
        break;
      } catch (error) {
        console.error(`Attempt ${attempt}/${retries} failed:`, error.message);
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

// Get token spot prices - using new POST API
async function getTokenSpotPrices(chainId, tokenAddresses, retries = 3, delay = 1000) {
  try {
    const url = `${BASE_URL}/price/v1.1/${chainId}`;
    console.log("Request URL (Prices):", url);
    
    // Prepare request config
    const config = {
      headers: {
        "Authorization": `Bearer ${API_KEY}`
      },
      paramsSerializer: {
        indexes: null
      }
    };
    
    // Prepare request body
    const body = {
      "tokens": tokenAddresses,
      "currency": "USD"
    };
    
    console.log("Price request body:", body);
    
    // Send POST request
    let response;
    for (let attempt = 1; attempt <= retries; attempt++) {
      try {
        response = await axios.post(url, body, config);
        break;
      } catch (error) {
        console.error(`Attempt ${attempt}/${retries} failed:`, error.message);
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