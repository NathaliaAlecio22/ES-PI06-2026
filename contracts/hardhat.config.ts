import "dotenv/config";

import hardhatToolboxMochaEthersPlugin from "@nomicfoundation/hardhat-toolbox-mocha-ethers";
import { configVariable, defineConfig } from "hardhat/config";

export default defineConfig({
  plugins: [hardhatToolboxMochaEthersPlugin],
  solidity: {
    profiles: {
      default: {
        version: "0.8.34",
      },
      production: {
        version: "0.8.34",
        settings: {
          optimizer: {
            enabled: true,
            runs: 200,
          },
        },
      },
    },
  },
  networks: {
    // In-process simulated network used by `hardhat test`/`hardhat run` when no --network
    // flag is given. `hardhat node` also defaults to chainId 31337 on 127.0.0.1:8545, which
    // is exactly what apps/api/.env.example's RPC_URL/CHAIN_ID already expect (docs/context.md
    // §4: local Hardhat node for all day-to-day iteration).
    hardhatMainnet: {
      type: "edr-simulated",
      chainType: "l1",
    },
    // Demo / milestone deployments target a public testnet (docs/context.md §4). Sepolia as of
    // this writing; re-check the recommended testnet before a final deployment, since Sepolia
    // has a planned deprecation.
    sepolia: {
      type: "http",
      chainType: "l1",
      url: configVariable("SEPOLIA_RPC_URL"),
      accounts: [configVariable("SEPOLIA_PRIVATE_KEY")],
    },
  },
  verify: {
    etherscan: {
      apiKey: configVariable("ETHERSCAN_API_KEY"),
    },
  },
});
