// 載入環境變數
require("dotenv").config();

// 引入所需模組
const express = require("express");
const cors = require("cors");
const morgan = require("morgan");
const helmet = require("helmet");
const axios = require("axios");

// 引入路由模組
const tokensRouter = require("./routes/tokens");
const convertRouter = require("./routes/convert");
const historyRouter = require("./routes/history");
const webhookRouter = require("./routes/webhook");

// 初始化 Express 應用
const app = express();
const PORT = process.env.PORT || 3011;

// 添加安全相關中間件
app.use(helmet()); // 安全標頭
app.use(cors()); // 允許所有來源的請求

// 記錄請求日誌
app.use(morgan("dev"));

// 中間件：解析 JSON 請求主體
app.use(express.json());

// 設置 axios 實例全局使用
global.axios = axios;

// API 金鑰設置
global.INCH_API_KEY = process.env.ONEINCH_API_KEY || "";
global.CIRCLE_API_KEY = process.env.CIRCLE_API_KEY || "";
global.MULTIBAAS_API_KEY = process.env.MULTIBAAS_API_KEY || "";

// 基本路由
app.get("/", (req, res) => {
  res.json({ 
    message: "Piggy Vault API Server",
    version: "1.0.0",
    status: "running" 
  });
});

// 註冊路由
app.use('/api/tokens', tokensRouter);
app.use('/api/convert', convertRouter);
app.use('/api/history', historyRouter);
app.use('/api/webhook', webhookRouter);

// 錯誤處理中間件
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({
    status: 'error',
    message: '伺服器內部錯誤',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// 處理不存在的路由
app.use((req, res) => {
  res.status(404).json({ status: 'error', message: '找不到請求的資源' });
});

// 啟動伺服器
app.listen(PORT, () => {
  console.log(`伺服器運行於 http://localhost:${PORT}`);
  console.log(`環境: ${process.env.NODE_ENV || 'development'}`);
  
  // 在開發環境中顯示可用的 API 路由
  if (process.env.NODE_ENV === 'development') {
    console.log('\n可用 API 路由:');
    console.log('GET  /api/tokens/:chainId/:walletAddress - 獲取錢包代幣餘額');
    console.log('GET  /api/tokens/prices/:chainId/:tokenAddresses - 獲取代幣價格');
    console.log('GET  /api/convert/approve - 獲取授權交易資料');
    console.log('POST /api/convert/swap - 獲取兌換交易資料');
    console.log('GET  /api/history/:address - 獲取交易歷史');
    console.log('GET  /api/history/transaction/:txHash - 獲取交易詳情');
    console.log('POST /api/webhook/deposit - 存款事件 webhook');
    console.log('POST /api/webhook/withdrawal - 提款事件 webhook\n');
  }
});