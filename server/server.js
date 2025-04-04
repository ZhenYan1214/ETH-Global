// 載入環境變數
require("dotenv").config();

// 引入所需模組
const express = require("express");

// 初始化 Express 應用
const app = express();
const PORT = process.env.PORT || 3010;

// 中間件：解析 JSON 請求主體
app.use(express.json());

// 基本路由
app.get("/", (req, res) => {
  res.json({ message: "Piggy Vault API Server" });
});

// 啟動伺服器
app.listen(PORT, () => {
  console.log(`伺服器運行於 http://localhost:${PORT}`);
});