// 載入環境變數
require("dotenv").config();

// 引入所需模組
const express = require("express");
const { getWalletBalances } = require("./utils/oneinch"); // 修正路徑

// 初始化 Express 應用
const app = express();
const PORT = process.env.PORT || 3010;

// 中間件：解析 JSON 請求主體
app.use(express.json());

// 預設的錢包地址
const DEFAULT_WALLET_ADDRESS = "0x4EC7a00D26d392e1B29e6b7fA0199D5849A1459d";

// 基本路由
app.get("/", (req, res) => {
  res.json({ message: "Piggy Vault API Server" });
});

// 查詢錢包餘額的路由
app.get("/wallet/balances", async (req, res) => {
  try {
    // 從查詢參數中獲取 chainId
    const { chainId } = req.query;

    // 驗證參數
    if (!chainId) {
      return res.status(400).json({ error: "chainId 是必填參數" });
    }

    // 使用預設的錢包地址
    const walletAddress = DEFAULT_WALLET_ADDRESS;

    // 調用 getWalletBalances 函數
    const result = await getWalletBalances(chainId, walletAddress);

    // 返回結果
    res.status(200).json(result);
  } catch (error) {
    res.status(500).json({ error: "無法獲取錢包餘額", details: error.message });
  }
});

// 啟動伺服器
app.listen(PORT, () => {
  console.log(`伺服器運行於 http://localhost:${PORT}`);
});