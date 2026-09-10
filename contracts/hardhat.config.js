require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY;
const accounts = DEPLOYER_PRIVATE_KEY ? [DEPLOYER_PRIVATE_KEY] : [];

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
    },
  },
  networks: {
    spicy: {
      url: process.env.SPICY_RPC_URL || "https://spicy-rpc.chiliz.com",
      chainId: 88882,
      accounts,
    },
    chiliz: {
      url: process.env.CHILIZ_RPC_URL || "https://rpc.ankr.com/chiliz",
      chainId: 88888,
      accounts,
    },
  },
  etherscan: {
    apiKey: {
      spicy: "not-needed",
      chiliz: "not-needed",
    },
    customChains: [
      {
        network: "spicy",
        chainId: 88882,
        urls: {
          apiURL: "https://testnet.chiliscan.com/api",
          browserURL: "https://testnet.chiliscan.com",
        },
      },
      {
        network: "chiliz",
        chainId: 88888,
        urls: {
          apiURL: "https://chiliscan.com/api",
          browserURL: "https://chiliscan.com",
        },
      },
    ],
  },
};
