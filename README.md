# PiggyBank - A smarter way to Swap & Earn

PiggyBank is an innovative Web3 platform that not only helps users convert idle crypto assets into interest-bearing ones, but also consolidates scattered assets into a single token.
By integrating smart contracts with DeFi protocols, users can easily deposit various tokens into a vault and earn stable interest income.

## 🌟 Main functions

💰 Multi-Token Support: Supports major stablecoins such as USDC, DAI, and USDT
🔄 One-Click Swap: Utilizes 1inch Portal API for swap commands and packages transactions via Circle API to provide the most optimal swap route
💸 Auto Yield Generation: Integrates ERC-4626 and Yearn for automated asset management and yield generation
📊 Real-Time Monitoring: Integrates MultiBaas to enable real-time event monitoring

## 🛠 Tech Stack

### Frontend
- Vue 3 + Vite
- Pinia status management
- ethers.js
- Circle API
- Viem

### Backend
- Node.js + Express
- MultiBaas API
- 1inch API

### Smart Contract(deployed on Polygon)
- Solidity
- Hardhat
- OpenZeppelin

## 📁 Project Structure

```
ETH-Global/
├── frontend/          
├── hardhat/           
├── server/          
├── .gitignore
└── README.md
```

## 👥 Development Team

- **Willy Lin**: Integrating all & Backend Development
  - Responsible for integrating Circle and 1inch APIs
  - Integrating and testing frontend, backend, and smart contract
  - IG: @weili9534

- **YU ZhenYan**: Backend Development
  - Implemented event listening via MultiBaas
  - Developed webhook verification mechanisms
  - IG: @zhenyano555

- **Shi Jui Line**: Smart Contract Development
  - Designed and implemented the vault smart contract
  - Developed contract testing and deployment scripts
  - IG: @shuruilian

- **Jun Yuan Lin**: Frontend Development
  - Designed and developed the user interface
  - Integrated Web3 wallet functionalities
  - IG: @jun_yuan0702

- **Pan Yung Hao**: Project Assistant
  - Created project presentations and demo videos
  - Handled administrative tasks
  - IG: @re_aprhp_027

## 🔗 Links
- Demo Video:
- PPT slides: https://www.canva.com/design/DAGjrS__wLU/gqIsMfo2JREjO1A9KJ7rTQ/edit
