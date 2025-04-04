// Network Configuration
const NETWORK_CONFIG = {
  mainnet: {
    RPC_URL: 'https://mainnet.infura.io/v3/your-project-id',
    CHAIN_ID: 1,
    NETWORK_NAME: 'Ethereum Mainnet',
    MULTIBAAS_API_KEY: process.env.MULTIBAAS_API_KEY,
    ONEINCH_API_KEY: process.env.ONEINCH_API_KEY,
    CIRCLE_API_KEY: process.env.CIRCLE_API_KEY
  },
  goerli: {
    RPC_URL: 'https://goerli.infura.io/v3/your-project-id',
    CHAIN_ID: 5,
    NETWORK_NAME: 'Goerli Testnet',
    MULTIBAAS_API_KEY: process.env.MULTIBAAS_API_KEY,
    ONEINCH_API_KEY: process.env.ONEINCH_API_KEY,
    CIRCLE_API_KEY: process.env.CIRCLE_API_KEY
  }
}

// Default to mainnet
const DEFAULT_NETWORK = 'mainnet'

// Port Configuration
const PORT_CONFIG = {
  FRONTEND_PORT: 3008,
  SERVER_PORT: 3010
}

// Export configuration
module.exports = {
  ...NETWORK_CONFIG[DEFAULT_NETWORK],
  ...PORT_CONFIG,
  SUPPORTED_TOKENS: require('./tokenList'),
  DEFAULT_NETWORK,
  NETWORKS: Object.keys(NETWORK_CONFIG)
} 