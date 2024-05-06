import * as dotenv from 'dotenv';
import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    compilers: [
      {
        version: '0.8.25',
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    ],
  },
  networks: {
    amoy: {
      url: 'https://rpc-amoy.polygon.technology/',
      accounts: [process.env.PRIVATE_KEY as string],
      chainId: 80002,
    },
  },
  etherscan: {
    apiKey: { amoy: process.env.AMOY_API_KEY as string },
    customChains: [
      {
        network: "amoy",
        chainId: 80002,
        urls: {
          apiURL: "https://api-amoy.polygonscan.com/api",
          browserURL: "https://amoy.polygonscan.com"
        },
      }
    ]
  },
  gasReporter: {
    enabled: true,
    currency: 'USD',
    gasPrice: 50,
  },
  typechain: {
    outDir: './typechain',
    target: 'ethers-v6',
    dontOverrideCompile: false,
  },
};

export default config;
