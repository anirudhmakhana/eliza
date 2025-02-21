import * as viemChains from "viem/chains"; // Import all predefined chains from Viem
import {
    type Action,
    type IAgentRuntime,
    type Memory,
    type State,
    type HandlerCallback,
    elizaLogger,
} from "@elizaos/core";
import { executeSponsoredCall } from "../utils";
import { initWalletProvider } from "../providers/wallet";
import { AbiFunction, parseAbi, parseEther, formatEther } from "viem";
import { ContractInteractionAction } from "./actionContractInteraction";
import { CHAIN_EXPLORERS } from "../providers/blockexplorer";
// import { coinflipv2abi } from "../contracts/coinflipv2abi";
import { coinflipVRFABI } from "../contracts/coinflipvrfabi";
import axios from 'axios';

/**
 * Fetch ABI from the correct blockchain explorer.
 * Supports Etherscan, Arbiscan, and Basescan.
 */
async function fetchAbi(contractAddress: string, chain: string): Promise<AbiFunction[]> {
    const explorer = CHAIN_EXPLORERS[chain];

    if (!explorer) {
        throw new Error(`No explorer configured for chain: ${chain}`);
    }

    const apiKey = "J9Q7QZ6A5TFNVIGSVIPPSHWKQVH8STVFUG"
    if (!apiKey) throw new Error(`${explorer.apiKeyEnv} is not set in the environment.`);

    const url = `${explorer.url}?module=contract&action=getabi&address=${contractAddress}&apikey=${apiKey}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        if (!data.result || data.status === "0") {
            throw new Error(`Failed to fetch ABI for contract ${contractAddress} on ${chain}`);
        }

        return parseAbi(JSON.parse(data.result)) as AbiFunction[];
    } catch (error) {
        throw new Error(`Error fetching ABI: ${error instanceof Error ? error.message : "Unknown error"}`);
    }
}

// Define interfaces based on Prisma schema
interface BetResponse {
    id: string;
    player: string;
    amount: string;  // BigInt serialized as string
    choice: boolean;
    round: number;
    createdAt: string;  // DateTime serialized as string
}

interface RoundResponse {
    id: string;
    round: number;
    resolved: boolean;
    result: boolean | null;  // Nullable for unresolved rounds
    winners: string[];      // Parsed from JSON string
    totalBets: string;      // BigInt serialized as string
    houseFee: string;       // BigInt serialized as string
    createdAt: string;      // DateTime serialized as string
    updatedAt: string;      // DateTime serialized as string
}

// Define constants for better maintainability
const INK_SEPOLIA_CONTRACTS = {
    COIN_FLIP_TEST: "0x0616d765019aa11ec5a50e2aeA0e371b064c64f0"
} as const;

// Changed from "inkSepolia" to match the RPC in .env
const DEFAULT_CHAIN = "inkSepolia";

// Define API configuration
const API_BASE_URL = 'https://game-coordinator-backend.onrender.com'; // Update with your actual API URL
const API_KEY = "inkhackerhouse"; // Ensure this is securely stored
const AXIOS_CONFIG = { headers: { "x-api-key": API_KEY } };

// 🔹 Define user-friendly contract interaction action
export const userFriendlyContractInteractionAction: Action = {
    name: "USER_FRIENDLY_CONTRACT_INTERACTION",
    description: "Handle user betting interactions and result checking for the CoinFlip game. Primary interface for all game-related user queries.",
    validate: async (runtime: IAgentRuntime): Promise<boolean> => {
        const apiKey = runtime.getSetting("GELATO_RELAY_API_KEY");
        if (!apiKey) {
            throw new Error("GELATO_RELAY_API_KEY is not configured.");
        }
        return true;
    },
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        _state: State,
        _options: unknown,
        callback?: HandlerCallback
    ) => {
        try {
            const userInput = message.content.text.toLowerCase();
            elizaLogger.debug('Processing user input:', userInput);
            
            // Changed to use COIN_FLIP_V2 instead of COIN_FLIP_TEST for production
            const contractAddress = INK_SEPOLIA_CONTRACTS.COIN_FLIP_TEST;
            
            // Initialize providers
            const walletProvider = await initWalletProvider(runtime);
            walletProvider.switchChain(DEFAULT_CHAIN);
            
            const publicClient = walletProvider.getPublicClient(DEFAULT_CHAIN);
            const walletClient = walletProvider.getWalletClient(DEFAULT_CHAIN);
            const userAddress = walletProvider.getAddress();

            // Check user's ETH balance in the contract
            const userBalance = await publicClient.readContract({
                address: contractAddress,
                abi: coinflipVRFABI,
                functionName: 'ethBalances',
                args: [userAddress]
            }) as bigint;

            const currentRound = await publicClient.readContract({
                address: contractAddress,
                abi: coinflipVRFABI,
                functionName: 'currentRound'
            }) as bigint;

            if (userInput.includes("balance")) {
                const balanceInEth = formatEther(userBalance);
                const result = `💰 Your balance: ${balanceInEth} ETH`;
                callback?.({ text: result });
                return result;

            } else if (userInput.includes("pick something") || userInput.includes("pick for me") || userInput.includes("random bet")) {
                // Check if user has enough balance first
                const randomChoice = Math.random() < 0.5;
                const randomAmount = (Math.random() * 0.04 + 0.01).toFixed(3); // Random amount between 0.01 and 0.05 ETH
                const amountInWei = parseEther(randomAmount);

                if (userBalance < amountInWei) {
                    throw new Error(`Insufficient balance. Please deposit at least ${randomAmount} ETH first.`);
                }

                const action = new ContractInteractionAction();
                const response = await action.interactWithContract(
                    coinflipVRFABI as AbiFunction[],
                    "placeBet",
                    [randomChoice, amountInWei],
                    contractAddress,
                    DEFAULT_CHAIN,
                    publicClient,
                    walletClient,
                    userAddress
                );

                const taskLink = `https://relay.gelato.digital/tasks/status/${response.taskId}`;
                const result = `✅ Bet placed!\n` +
                    `- Amount: ${randomAmount} ETH\n` +
                    `- Choice: ${randomChoice ? 'Heads' : 'Tails'}\n` +
                    `- Task ID: ${response.taskId}\n` +
                    `- [Track Status](${taskLink})`;

                callback?.({ text: result });
                return result;

            } else if (userInput.includes("bet")) {
                const betAmount = userInput.match(/\d+(\.\d+)?/);
                const betSide = userInput.includes("heads");
                const amountInEth = betAmount ? betAmount[0] : "0.01";
                const amountInWei = parseEther(amountInEth);

                if (userBalance < amountInWei) {
                    throw new Error(`Insufficient balance. Please deposit at least ${amountInEth} ETH first.`);
                }

                const action = new ContractInteractionAction();
                const response = await action.interactWithContract(
                    coinflipVRFABI as AbiFunction[],
                    "placeBet",
                    [betSide, amountInWei],
                    contractAddress,
                    DEFAULT_CHAIN,
                    publicClient,
                    walletClient,
                    userAddress
                );

                const taskLink = `https://relay.gelato.digital/tasks/status/${response.taskId}`;
                const result = `✅ Bet placed!\n` +
                    `- Amount: ${amountInEth} ETH\n` +
                    `- Choice: ${betSide ? 'Heads' : 'Tails'}\n` +
                    `- Task ID: ${response.taskId}\n` +
                    `- [Track Status](${taskLink})`;

                callback?.({ text: result });
                return result;
            } else if (userInput.includes("did i win") || userInput.includes("check result") || userInput.includes("check results")) {
                const roundNum = userInput.match(/\d+/) ? 
                    Number(userInput.match(/\d+/)[0]) : 
                    Number(currentRound) - 1;

                try {
                    const [roundInfo, bets] = await Promise.all([
                        axios.get<RoundResponse>(`${API_BASE_URL}/round/${roundNum}`, AXIOS_CONFIG),
                        axios.get<BetResponse[]>(`${API_BASE_URL}/bets/${roundNum}`, AXIOS_CONFIG)
                    ]);

                    const round = roundInfo.data;
                    const roundBets = bets.data;

                    if (!round.resolved) {
                        const result = `⏳ Round ${roundNum} Status:\n` +
                            `- Total Bets: ${formatEther(BigInt(round.totalBets))} ETH\n` +
                            `- Number of Bets: ${roundBets.length}\n` +
                            `- Status: Waiting for resolution\n` +
                            `- Created: ${new Date(round.createdAt).toLocaleString()}`;
                        callback?.({ text: result });
                        return result;
                    }

                    // Find user's bet
                    const userBet = roundBets.find(bet => 
                        bet.player.toLowerCase() === userAddress.toLowerCase()
                    );
                    
                    if (!userBet) {
                        const result = `❌ You didn't place any bets in round ${roundNum}.`;
                        callback?.({ text: result });
                        return result;
                    }

                    // Parse winners array from JSON string if needed
                    const winners = Array.isArray(round.winners) ? round.winners : JSON.parse(round.winners);
                    const isWinner = winners.some(
                        winner => winner.toLowerCase() === userAddress.toLowerCase()
                    );

                    const result = `🎲 Round ${roundNum} Result:\n` +
                        `Your bet: ${userBet.choice ? 'Heads' : 'Tails'} for ${formatEther(BigInt(userBet.amount))} ETH\n` +
                        `Result: ${round.result ? 'Heads' : 'Tails'}\n` +
                        `${isWinner ? '🎉 Congratulations! You won!' : '😔 Sorry, you lost this time.'}\n` +
                        `Total Bets: ${formatEther(BigInt(round.totalBets))} ETH\n` +
                        `House Fee: ${formatEther(BigInt(round.houseFee))} ETH\n` +
                        `Number of Winners: ${winners.length}\n` +
                        `Resolved at: ${new Date(round.updatedAt).toLocaleString()}`;

                    callback?.({ text: result });
                    return result;

                } catch (error) {
                    if (axios.isAxiosError(error) && error.response?.status === 404) {
                        const result = `❌ Round ${roundNum} not found.`;
                        callback?.({ text: result });
                        return result;
                    }
                    throw error;
                }
            } else if (userInput.includes("show round")) {
                const roundNum = userInput.match(/\d+/) ? 
                    Number(userInput.match(/\d+/)[0]) : 
                    Number(currentRound);

                try {
                    const [roundInfo, bets] = await Promise.all([
                        axios.get<RoundResponse>(`${API_BASE_URL}/round/${roundNum}`, AXIOS_CONFIG),
                        axios.get<BetResponse[]>(`${API_BASE_URL}/bets/${roundNum}`, AXIOS_CONFIG)
                    ]);

                    const round = roundInfo.data;
                    const roundBets = bets.data;

                    // Parse winners array from JSON string if needed
                    const winners = Array.isArray(round.winners) ? round.winners : JSON.parse(round.winners);

                    const result = `🎲 Round ${roundNum} Information:\n` +
                        `Status: ${round.resolved ? '✅ Resolved' : '⏳ Active'}\n` +
                        `Total Bets: ${formatEther(BigInt(round.totalBets))} ETH\n` +
                        `Number of Players: ${roundBets.length}\n` +
                        `${round.resolved ? 
                            `Result: ${round.result ? '🎲 Heads' : '🎲 Tails'}\n` +
                            `House Fee: ${formatEther(BigInt(round.houseFee))} ETH\n` +
                            `Winners: ${winners.length}\n` : 
                            ''
                        }` +
                        `Created: ${new Date(round.createdAt).toLocaleString()}\n` +
                        `${round.resolved ? 
                            `Resolved: ${new Date(round.updatedAt).toLocaleString()}` : 
                            ''
                        }`;

                    callback?.({ text: result });
                    return result;

                } catch (error) {
                    if (axios.isAxiosError(error) && error.response?.status === 404) {
                        const result = `❌ Round ${roundNum} not found.`;
                        callback?.({ text: result });
                        return result;
                    }
                    throw error;
                }
            } else {
                throw new Error("Please specify an action: bet (heads/tails), show round, or check result");
            }

        } catch (error) {
            const errorMessage = `❌ Error: ${error instanceof Error ? error.message : "Unknown error"}`;
            elizaLogger.error(errorMessage);
            callback?.({ text: errorMessage });
            return errorMessage;
        }
    },
    examples: [
        [
            { user: "User", content: { text: "deposit 0.1 ETH" } },
            { user: "Eliza", content: { text: "✅ Deposit initiated!\n- Amount: 0.1 ETH\n- [Track Status](link)" } },
        ],
        [
            { user: "User", content: { text: "bet 0.05 ETH on heads" } },
            { user: "Eliza", content: { text: "✅ Bet placed!\n- Amount: 0.05 ETH\n- Choice: Heads\n- [Track Status](link)" } },
        ],
        [
            { user: "User", content: { text: "withdraw 0.2 ETH" } },
            { user: "Eliza", content: { text: "✅ Withdrawal initiated!\n- Amount: 0.2 ETH\n- [Track Status](link)" } },
        ],
        [
            {
                user: "User",
                content: { text: "show round 42" },
            },
            {
                user: "Eliza",
                content: { text: "🎲 Round 42 Information:\nStatus: Active\nTotal Bets: 3" },
            },
        ],
        [
            {
                user: "User",
                content: { text: "Did I win?" },
            },
            {
                user: "Eliza",
                content: { text: "🎲 Round 42 Result:\nYour bet: Heads for 2.5 ETH\nResult: Heads\n🎉 Congratulations! You won!" },
            },
        ],
        [
            {
                user: "User",
                content: { text: "Pick something for me" },
            },
            {
                user: "Eliza",
                content: { text: "🎲 I've picked a random bet for you!\n✅ Bet placed successfully!\n- Round: 42\n- Amount: 0.45 ETH\n- Choice: Heads\n- Task ID: 0xabc...def\n- [Track Status](https://relay.gelato.digital/tasks/status/xyz123)" },
            },
        ],
    ],
    similes: [
        "COIN_FLIP_BET",
        "GAME_BET_CHECK",
        "BET_RESULT_CHECK",
        "USER_BET_STATUS",
        "COIN_FLIP_RESULT",
        "DEPOSIT_ETH",
        "WITHDRAW_ETH",
        "CHECK_BALANCE"
    ],
};
