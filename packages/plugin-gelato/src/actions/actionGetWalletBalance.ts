import {
    type Action,
    type IAgentRuntime,
    type Memory,
    type State,
    type HandlerCallback,
    elizaLogger,
} from "@elizaos/core";
import { initWalletProvider } from "../providers/wallet";
import * as viemChains from "viem/chains";

// Dynamically extract all chain names from viem/chains
const supportedChains = Object.values(viemChains)
    .filter(chain => chain?.id)
    .map(chain => chain.name.toLowerCase());

// Action Definition
export const getWalletBalanceAction: Action = {
    name: "GET_WALLET_BALANCE",
    description: "Fetch the wallet balance for the configured wallet address on the connected chain.",
    validate: async (runtime: IAgentRuntime): Promise<boolean> => {
        return true;
    },
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        state: State,
        _options: unknown,
        callback?: HandlerCallback
    ) => {
        try {
            // Initialize Wallet Provider
            const walletProvider = await initWalletProvider(runtime);
            
            // Switch to Ink Sepolia
            walletProvider.switchChain('inkSepolia');
            
            // Debug log to see chain details
            const chain = walletProvider.getCurrentChain();
            elizaLogger.debug('Current chain details:', {
                name: chain.name,
                id: chain.id,
                rpcUrls: chain.rpcUrls
            });

            const walletAddress = walletProvider.getAddress();
            const currentChain = chain.name.toLowerCase();

            elizaLogger.info(`Fetching balance for wallet ${walletAddress} on chain ${currentChain} (${chain.id})...`);

            // Validate chain is supported
            if (!supportedChains.includes(currentChain)) {
                elizaLogger.warn(`Chain validation failed. Current chain: ${currentChain}, Supported chains: ${supportedChains.join(', ')}`);
                callback({ text: `❌ Chain ${currentChain} (ID: ${chain.id}) is not supported.` });
                return;
            }

            const balance = await walletProvider.getWalletBalance(); // Use getWalletBalance instead of getWalletBalanceForChain

            if (balance) {
                callback({
                    text: `💰 Wallet balance on **${currentChain}**: ${balance} ${walletProvider.getCurrentChain().nativeCurrency.symbol}\n📍 Address: ${walletAddress}`,
                });
            } else {
                callback({ text: `❌ Failed to fetch balance on ${currentChain}. Please try again later.` });
            }
        } catch (error) {
            elizaLogger.error("Error in getWalletBalanceAction", error);
            callback({ text: "❌ Something went wrong. Please try again later." });
        }
    },
    examples: [
        [
            {
                user: "User",
                content: { text: "Check my balance" },
            },
            {
                user: "Eliza",
                content: { text: "💰 Your wallet balance on inkSepolia: 2.543 ETH" },
            },
        ],
    ],
    similes: ["GET_BALANCE", "CHECK_WALLET", "FETCH_FUNDS", "BALANCE_LOOKUP"],
};
