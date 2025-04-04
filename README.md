# PiggyBank - Web3 智能金庫平台

PiggyBank 是一個創新的 Web3 平台，專注於幫助使用者將閒置的加密貨幣資產轉換為生息資產。透過智能合約和 DeFi 協議的整合，使用者可以輕鬆地將各種代幣存入金庫，獲得穩定的利息收益。

## 🌟 主要功能

- 💰 多幣種支援：支援 USDC、DAI、USDT 等主流穩定幣
- 🔄 一鍵兌換：整合 1inch 協議，提供最優兌換路徑
- 💸 自動生息：透過 Circle API 實現自動化的資金管理
- 📊 即時監控：整合 MultiBaas 提供即時的事件監控
- 🔒 安全可靠：採用多重簽名和時間鎖定機制

## 🛠 技術棧

### 前端
- Vue 3 + Vite
- Tailwind CSS
- Pinia 狀態管理
- ethers.js

### 後端
- Node.js + Express
- MultiBaas API
- Circle API
- 1inch API

### 智能合約
- Solidity
- Hardhat
- OpenZeppelin

## 📁 專案結構

```
piggy-vault/
├── frontend/          # Vue 3 前端應用
├── server/           # Express 後端服務
├── hardhat/          # 智能合約開發環境
└── shared/           # 共用配置和資源
    ├── config.js     # 網路和 API 配置
    └── tokenList.js  # 支援代幣列表
```

## 👥 開發團隊

- **A 工程師**: API 整合與後端開發
  - 負責 MultiBaas、Circle、1inch API 整合
  - 實作 Webhook 接收與處理
  - 開發 RESTful API 端點

- **B 工程師**: 事件處理與監控
  - 實作 MultiBaas 事件監聽
  - 開發 Webhook 驗證機制
  - 建立事件日誌系統

- **C 工程師**: 智能合約開發
  - 設計與實作金庫合約
  - 開發合約測試與部署腳本
  - 實作合約升級機制

- **D 工程師**: 前端開發
  - 設計與實作使用者介面
  - 整合 Web3 錢包功能
  - 開發響應式設計

## 🚀 快速開始

1. 克隆專案
```bash
git clone https://github.com/your-org/piggy-vault.git
cd piggy-vault
```

2. 安裝依賴
```bash
# 安裝前端依賴
cd frontend
npm install

# 安裝後端依賴
cd ../server
npm install

# 安裝合約依賴
cd ../hardhat
npm install
```

3. 設定環境變數
```bash
# 複製環境變數範本
cp .env.example .env

# 編輯 .env 檔案，填入必要的 API 金鑰和配置
```

4. 啟動開發環境
```bash
# 啟動前端開發伺服器
cd frontend
npm run dev

# 啟動後端服務
cd ../server
npm run dev

# 啟動本地區塊鏈
cd ../hardhat
npx hardhat node
```

## 📝 開發指南

- 遵循 [Conventional Commits](https://www.conventionalcommits.org/) 規範
- 使用 ESLint 和 Prettier 保持程式碼風格一致
- 提交前執行完整的測試套件
- 定期更新依賴套件版本

## 🔒 安全性

- 所有 API 金鑰和敏感資訊必須通過環境變數管理
- 實作完整的 Webhook 驗證機制
- 定期進行安全性審計
- 遵循智能合約最佳實踐

## 📄 授權

本專案採用 MIT 授權條款 - 詳見 [LICENSE](LICENSE) 檔案 
