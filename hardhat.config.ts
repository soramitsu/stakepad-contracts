import * as dotenv from 'dotenv';
import { HardhatUserConfig } from "hardhat/config";
import '@nomicfoundation/hardhat-verify';
import 'hardhat-gas-reporter';
import '@typechain/hardhat';
import 'solidity-coverage';
import '@nomicfoundation/hardhat-network-helpers';
import '@nomicfoundation/hardhat-ethers';
import '@nomicfoundation/hardhat-chai-matchers';

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
    hardhat: {
      allowBlocksWithSameTimestamp: true
    }
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
    L1: "polygon",
    L1Etherscan: process.env.AMOY_API_KEY as string,
    reportFormat: "markdown",
    outputFile: "./test/gasReport.md",
    forceTerminalOutput: true,
    forceTerminalOutputFormat: "terminal"
  },
  typechain: {
    outDir: './typechain',
    target: 'ethers-v6',
    dontOverrideCompile: false,
  },
};

export default config;
