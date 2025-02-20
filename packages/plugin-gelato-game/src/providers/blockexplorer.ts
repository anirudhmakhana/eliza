export const CHAIN_EXPLORERS: Record<string, { url: string; apiKeyEnv: string }> = {
    mainnet: { url: "https://api.etherscan.io/api", apiKeyEnv: "ETHERSCAN_API_KEY" },
    sepolia: { url: "https://api-sepolia.etherscan.io/api", apiKeyEnv: "ETHERSCAN_API_KEY" },
    arbitrumSepolia: { url: "https://api-sepolia.arbiscan.io/api", apiKeyEnv: "J9Q7QZ6A5TFNVIGSVIPPSHWKQVH8STVFUG" },
    baseSepolia: { url: "https://api-sepolia.basescan.org/api", apiKeyEnv: "BASESCAN_API_KEY" },
};