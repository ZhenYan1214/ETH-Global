require("dotenv").config();
require("@nomicfoundation/hardhat-toolbox");

module.exports = {
  solidity: "0.8.28",
  networks: {
    hardhat: {
      forking: {
        url: process.env.MAINNET_RPC_URL,
      },
    },
  },
};