import { HardhatUserConfig } from "hardhat/config";
import "@nomicfoundation/hardhat-toolbox";

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
      // TODO
      // mumbai: {
      //   url: 'https://rpc-mumbai.maticvigil.com/',
      //   accounts: { mnemonic, initialIndex: 0 },
      //   chainId: 80001,
      // },
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
