
# StakePad Project

This repository contains the smart contracts and tests for the Stakepad project. 

## Setup

### Installation

Install the required dependencies by running:

```
npm install
```

### Environment Variables

Before running the project, you need to set up the environment variables. Create a `.env` file in the root directory of the project and add the following variables:

```
AMOY_API_KEY="Your_Amoy_API_Key"
PRIVATE_KEY="0xYour_Wallet_Private_Key"
```

To get your AMOY API key, please refer to the [AMOY Documentation](https://docs.polygonscan.com/getting-started/viewing-api-usage-statistics#creating-an-api-key).

## Running Tests

To run all unit tests, use the following command:

```
npx hardhat test
```

Make sure you have provided the necessary environment variables in the `.env` file before running the tests.

## Deployment

Before deploying the smart contracts, ensure you have set up all required parameters in your `.env` file as described above.

### Deploying the Contracts

To deploy the main Stakepad smart contracts, run the following command:

```
npx hardhat ignition deploy ignition/modules/stakepad.ts --network `network`
```

Replace `network` with the desired network name. The network should be configured in your `hardhat.config.ts` file under the `networks` section. Please refer to the [Hardhat Networks Configuration](https://hardhat.org/hardhat-runner/docs/config#networks-configuration) guide for more information. 

Currently, the following networks are already configured:

- hardhat (default localhost)
- amoy (also known as polygon-amoy, Polygon PoS testnet)


Example for deploying to the amoy network:

```bash
npx hardhat ignition deploy ignition/modules/stakepad.ts -network 'amoy'
```

Example for deploying to the default hardhat network:

In the first terminal run the hardhat node:

```bash
npx hardhat node
```

In the second terminal run the deployment module:

```bash
npx hardhat ignition deploy ignition/modules/stakepad.ts -network 'localhost'
```

## Documentation

This repository contains the specifications and audit reports for the ERC20 Lockup Staking Pool smart contracts. For more detailed information, please refer to the [Documentation](./docs/README.md).

## Support

If you have any questions or need further assistance, feel free to open an issue on the repository or contact the maintainers.

