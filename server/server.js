// 載入環境變數
require("dotenv").config();

// 引入所需模組
const express = require("express");
const { getWalletBalances } = require("./utils/oneinch");
const cors = require('cors');

// 初始化 Express 應用
const app = express();
const PORT = process.env.PORT;

// 添加 CORS 中間件
app.use(cors()); // 允許所有來源的請求

// 中間件：解析 JSON 請求主體
app.use(express.json());

// 預設的錢包地址和鏈 ID
const DEFAULT_WALLET_ADDRESS = "0x4EC7a00D26d392e1B29e6b7fA0199D5849A1459d";
const DEFAULT_CHAIN_ID = "137"; // Polygon 鏈 ID

// 基本路由
app.get("/", (req, res) => {
  res.json({ message: "Piggy Vault API Server" });
});

// 查詢錢包餘額的路由
app.get("/wallet/balances/:chainId/:walletAddress", async (req, res) => {
  try {
    const { chainId, walletAddress } = req.params;
    console.log(`前端請求：查詢 chainId=${chainId}, walletAddress=${walletAddress}`); // 添加日誌
    // 調用 getWalletBalances 函數
    const result = await getWalletBalances(chainId, walletAddress);
    // 返回結果
    res.status(200).json(result);
  } catch (error) {
    console.error("前端請求失敗:", error.message); // 添加錯誤日誌
    // 如果是 429 錯誤，仍然返回餘額資料（如果有）
    if (error.message.includes("429")) {
      res.status(200).json({
        walletAddress,
        chainId,
        balances: [], // 如果餘額查詢也失敗，返回空陣列
        warning: "Unable to fetch prices due to rate limit, but balances may still be available.",
      });
    } else {
      res.status(500).json({ error: "無法獲取錢包餘額", details: error.message });
    }
  }
});

// 啟動伺服器
app.listen(PORT, () => {
  console.log(`伺服器運行於 http://localhost:${PORT}`);
});