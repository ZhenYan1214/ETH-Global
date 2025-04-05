# PiggyBank - A smarter way to Swap & Earn

PiggyBank is an innovative Web3 platform that not only helps users convert idle crypto assets into interest-bearing ones, but also consolidates scattered assets into a single token.
By integrating smart contracts with DeFi protocols, users can easily deposit various tokens into a vault and earn stable interest income.

## 🌟 Main functions

- 💰 多幣種支援：支援 USDC、DAI、USDT 等主流穩定幣
- 🔄 一鍵兌換：使用 1inch Portal API Swap 指令並透過 Circle API 打包交易，提供最優兌換路徑
- 💸 自動生息：整合 ERC-4626 及 Yearn 實現自動化的資金管理
- 📊 即時監控：整合 MultiBaas 提供即時的事件監控

## 🛠 Tech Stack

### Frontend
- Vue 3 + Vite
- Tailwind CSS
- Pinia status management
- ethers.js

### Backend
- Node.js + Express
- MultiBaas API
- Circle API
- 1inch API

### SC
- Solidity
- Hardhat
- OpenZeppelin

## 📁 Project Structure

```
piggy-vault/
├── frontend/          # Vue 3 前端應用
├── server/           # Express 後端服務
├── hardhat/          # 智能合約開發環境
└── shared/           # 共用配置和資源
    ├── config.js     # 網路和 API 配置
    └── tokenList.js  # 支援代幣列表
```

## 👥 Development Team

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

- **D 工程師**: 前端開發
  - 設計與實作使用者介面
  - 整合 Web3 錢包功能
  - 開發響應式設計

## 🚀 Quick Start

1. Clone the projects
```bash
git clone https://github.com/your-org/piggy-vault.git
cd piggy-vault
```

2. Install dependencies
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

3. Set environment variables
```bash
# 複製環境變數範本
cp .env.example .env

# 編輯 .env 檔案，填入必要的 API 金鑰和配置
```

4. Start Development Environment
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
