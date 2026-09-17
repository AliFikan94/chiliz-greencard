require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

const DEPLOYER_PRIVATE_KEY = process.env.DEPLOYER_PRIVATE_KEY;
const accounts = DEPLOYER_PRIVATE_KEY ? [DEPLOYER_PRIVATE_KEY] : [];

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    // evmVersion "prague" (below) is only recognized by solc >= 0.8.30 -
    // older versions hard-fail to compile with "Invalid EVM version
    // requested", they don't silently ignore it.
    version: "0.8.30",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      // Chiliz's current docs specify EVM target `prague`. Leaving this
      // unset lets the compiler default to whatever Shanghai-era target
      // ships with this solc version, which can emit an opcode Chiliz's
      // execution client rejects with "invalid opcode" at deploy time.
      evmVersion: "prague",
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
