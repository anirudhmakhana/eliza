// import * as viemChains from "viem/chains"; // Import all predefined chains from Viem
// import {
//     type Action,
//     type IAgentRuntime,
//     type Memory,
//     type State,
//     type HandlerCallback,
//     elizaLogger,
// } from "@elizaos/core";
// import { executeSponsoredCall } from "../utils";
// import { initWalletProvider } from "../providers/wallet";
// import { AbiFunction, parseAbi, parseEther } from "viem";
// import { ContractInteractionAction } from "./actionContractInteraction";
// import { CHAIN_EXPLORERS } from "../providers/blockexplorer";
// import { coinflipabi } from "../contracts/coinflipabi";
// import axios from 'axios';

// /**
//  * Fetch ABI from the correct blockchain explorer.
//  * Supports Etherscan, Arbiscan, and Basescan.
//  */
// async function fetchAbi(contractAddress: string, chain: string): Promise<AbiFunction[]> {
//     const explorer = CHAIN_EXPLORERS[chain];

//     if (!explorer) {
//         throw new Error(`No explorer configured for chain: ${chain}`);
//     }

//     const apiKey = "J9Q7QZ6A5TFNVIGSVIPPSHWKQVH8STVFUG"
//     if (!apiKey) throw new Error(`${explorer.apiKeyEnv} is not set in the environment.`);

//     const url = `${explorer.url}?module=contract&action=getabi&address=${contractAddress}&apikey=${apiKey}`;

//     try {
//         const response = await fetch(url);
//         const data = await response.json();

//         if (!data.result || data.status === "0") {
//             throw new Error(`Failed to fetch ABI for contract ${contractAddress} on ${chain}`);
//         }

//         return parseAbi(JSON.parse(data.result)) as AbiFunction[];
//     } catch (error) {
//         throw new Error(`Error fetching ABI: ${error instanceof Error ? error.message : "Unknown error"}`);
//     }
// }

// // Define constants for better maintainability
// const ARBITRUM_SEPOLIA_CONTRACTS = {
//     COIN_FLIP: "0xbb9A737C60f20386512eDAcf32bD7277896fcC3c",
// } as const;

// const DEFAULT_CHAIN = "arbitrumSepolia";

// // Define API configuration
// const API_BASE_URL = 'https://game-coordinator-backend.onrender.com'; // Update with your actual API URL
// const API_KEY = "inkhackerhouse"; // Ensure this is securely stored
// const AXIOS_CONFIG = { headers: { "x-api-key": API_KEY } };

// // 🔹 Define user-friendly contract interaction action
// export const userFriendlyContractInteractionAction: Action = {
//     name: "USER_FRIENDLY_CONTRACT_INTERACTION",
//     description: "Handle user betting interactions and result checking for the CoinFlip game. Primary interface for all game-related user queries.",
//     validate: async (runtime: IAgentRuntime): Promise<boolean> => {
//         const apiKey = runtime.getSetting("GELATO_RELAY_API_KEY");
//         if (!apiKey) {
//             throw new Error("GELATO_RELAY_API_KEY is not configured.");
//         }
//         return true;
//     },
//     handler: async (
//         runtime: IAgentRuntime,
//         message: Memory,
//         _state: State,
//         _options: unknown,
//         callback?: HandlerCallback
//     ) => {
//         try {
//             const userInput = message.content.text.toLowerCase();
//             elizaLogger.debug('Processing user input:', userInput);
            
//             const contractAddress = ARBITRUM_SEPOLIA_CONTRACTS.COIN_FLIP;
            
//             // Initialize Wallet Provider and switch to Arbitrum Sepolia
//             const walletProvider = await initWalletProvider(runtime);
//             walletProvider.switchChain(DEFAULT_CHAIN);
            
//             const publicClient = walletProvider.getPublicClient(DEFAULT_CHAIN);
//             const walletClient = walletProvider.getWalletClient(DEFAULT_CHAIN);
//             const userAddress = walletProvider.getAddress();

//             // Get current round from the contract
//             const currentRoundRaw = await publicClient.readContract({
//                 address: contractAddress,
//                 abi: coinflipabi,
//                 functionName: 'currentRound',
//             }) as bigint;

//             const currentRound = currentRoundRaw ? BigInt(currentRoundRaw).toString() : "1";

//             let functionName: string;
//             let args: any[];

//             if (userInput.includes("pick something") || userInput.includes("pick for me") || userInput.includes("random bet")) {
//                 functionName = "placeBet";
//                 const randomChoice = Math.random() < 0.5;
//                 // Random bet amount between 0.001 and 0.01 ETH
//                 const randomAmount = (Math.random() * 0.009 + 0.001).toFixed(3);
//                 const amountInWei = parseEther(randomAmount);

//                 elizaLogger.debug('Random bet parameters:', {
//                     randomChoice,
//                     randomAmount,
//                     amountInWei,
//                     choice: randomChoice,
//                     isToken: false,
//                     token: "0x0000000000000000000000000000000000000000",
//                 });
                
//                 args = [
//                     randomChoice,
//                     false,
//                     "0x0000000000000000000000000000000000000000",
//                     amountInWei
//                 ];

//                 // Submit transaction through Gelato
//                 const action = new ContractInteractionAction();
//                 const response = await action.interactWithContract(
//                     coinflipabi as AbiFunction[],
//                     functionName,
//                     args,
//                     contractAddress,
//                     DEFAULT_CHAIN,
//                     publicClient,
//                     walletClient,
//                     userAddress
//                 );

//                 // Format response message
//                 const taskLink = `https://relay.gelato.digital/tasks/status/${response.taskId}`;
//                 const result = `✅ Transaction successful!\n` +
//                     `- Function: ${functionName}\n` +
//                     `- Contract: ${contractAddress}\n` +
//                     `- Chain: ${DEFAULT_CHAIN}\n` +
//                     `- Amount: ${randomAmount} ETH\n` +
//                     `- Choice: ${randomChoice ? 'Heads' : 'Tails'}\n` +
//                     `- Task ID: ${response.taskId}\n` +
//                     `- [Track Status](${taskLink})`;

//                 elizaLogger.success(result);
//                 callback?.({ text: result });
//                 return result;

//             } else if (userInput.includes("bet")) {
//                 functionName = "placeBet";
//                 const betAmount = userInput.match(/\d+(\.\d+)?/);
//                 const betSide = userInput.includes("heads");
                
//                 const amountInEth = betAmount ? betAmount[0] : "1";
//                 const amountInWei = parseEther(amountInEth);
                
//                 elizaLogger.debug('Bet parameters:', {
//                     betSide,
//                     amountInEth,
//                     amountInWei,
//                     choice: betSide,
//                     isToken: false,
//                     token: "0x0000000000000000000000000000000000000000",
//                 });

//                 args = [
//                     betSide,
//                     false,
//                     "0x0000000000000000000000000000000000000000",
//                     amountInWei
//                 ];

//                 // Submit transaction through Gelato
//                 const action = new ContractInteractionAction();
//                 const response = await action.interactWithContract(
//                     coinflipabi as AbiFunction[],
//                     functionName,
//                     args,
//                     contractAddress,
//                     DEFAULT_CHAIN,
//                     publicClient,
//                     walletClient,
//                     userAddress
//                 );

//                 // Format response message
//                 const taskLink = `https://relay.gelato.digital/tasks/status/${response.taskId}`;
//                 const result = `✅ Transaction successful!\n` +
//                     `- Function: ${functionName}\n` +
//                     `- Contract: ${contractAddress}\n` +
//                     `- Chain: ${DEFAULT_CHAIN}\n` +
//                     `- Amount: ${amountInEth} ETH\n` +
//                     `- Choice: ${betSide ? 'Heads' : 'Tails'}\n` +
//                     `- Task ID: ${response.taskId}\n` +
//                     `- [Track Status](${taskLink})`;

//                 elizaLogger.success(result);
//                 callback?.({ text: result });
//                 return result;
//             } else if (userInput.includes("did i win") || userInput.includes("check result")) {
//                 const roundNum = userInput.match(/\d+/) ? 
//                     Number(userInput.match(/\d+/)[0]) : 
//                     Number(currentRound.toString()) - 1;

//                 try {
//                     const [roundInfo, bets] = await Promise.all([
//                         axios.get(`${API_BASE_URL}/round/${roundNum}`, AXIOS_CONFIG),
//                         axios.get(`${API_BASE_URL}/bets/${roundNum}`, AXIOS_CONFIG)
//                     ]);

//                     if (!roundInfo.data.resolved) {
//                         const result = `⏳ Round ${roundNum} hasn't been resolved yet. Please wait for the result.`;
//                         callback?.({ text: result });
//                         return result;
//                     }

//                     // Find user's bet for this round
//                     const userBet = bets.data.find(bet => bet.player.toLowerCase() === userAddress.toLowerCase());
                    
//                     if (!userBet) {
//                         const result = `❌ You didn't place any bets in round ${roundNum}.`;
//                         callback?.({ text: result });
//                         return result;
//                     }

//                     const didWin = userBet.choice === roundInfo.data.result;
//                     const result = `🎲 Round ${roundNum} Result:\n` +
//                         `Your bet: ${userBet.choice ? 'Heads' : 'Tails'} for ${userBet.amount} ETH\n` +
//                         `Result: ${roundInfo.data.result ? 'Heads' : 'Tails'}\n` +
//                         `${didWin ? '🎉 Congratulations! You won!' : '😔 Sorry, you lost this time.'}\n`;

//                     callback?.({ text: result });
//                     return result;
//                 } catch (error) {
//                     elizaLogger.error('API Error:', error);
//                     throw new Error(`Failed to fetch round information: ${error instanceof Error ? error.message : "Unknown error"}`);
//                 }
//             } else if (userInput.includes("show round")) {
//                 // New command to show round information
//                 const roundNum = userInput.match(/\d+/) ? Number(userInput.match(/\d+/)[0]) : Number(currentRound);
                
//                 const [roundInfo, bets] = await Promise.all([
//                     axios.get(`${API_BASE_URL}/round/${roundNum}`, AXIOS_CONFIG),
//                     axios.get(`${API_BASE_URL}/bets/${roundNum}`, AXIOS_CONFIG)
//                 ]);

//                 const result = `🎲 Round ${roundNum} Information:\n` +
//                     `Status: ${roundInfo.data.resolved ? 'Resolved' : 'Active'}\n` +
//                     `${roundInfo.data.resolved ? `Result: ${roundInfo.data.result ? 'Heads' : 'Tails'}\n` : ''}` +
//                     `Total Bets: ${bets.data.length}\n`;

//                 callback?.({ text: result });
//                 return result;
//             } else {
//                 throw new Error("Please specify an action: bet (heads/tails), show round, or check result");
//             }

//         } catch (error) {
//             const errorMessage = `❌ Error: ${error instanceof Error ? error.message : "Unknown error"}`;
//             elizaLogger.error(errorMessage);
//             callback?.({ text: errorMessage });
//             return errorMessage;
//         }
//     },
//     examples: [
//         [
//             {
//                 user: "User",
//                 content: { text: "Bet 2.5 ETH on heads" },
//             },
//             {
//                 user: "Eliza",
//                 content: { text: "✅ Bet placed successfully!\n- Round: 42\n- Amount: 2.5 ETH\n- Choice: Heads\n- Task ID: 0xabc...def\n- [Track Status](https://relay.gelato.digital/tasks/status/xyz123)" },
//             },
//         ],
//         [
//             {
//                 user: "User",
//                 content: { text: "show round 42" },
//             },
//             {
//                 user: "Eliza",
//                 content: { text: "🎲 Round 42 Information:\nStatus: Active\nTotal Bets: 3" },
//             },
//         ],
//         [
//             {
//                 user: "User",
//                 content: { text: "Did I win?" },
//             },
//             {
//                 user: "Eliza",
//                 content: { text: "🎲 Round 42 Result:\nYour bet: Heads for 2.5 ETH\nResult: Heads\n🎉 Congratulations! You won!" },
//             },
//         ],
//         [
//             {
//                 user: "User",
//                 content: { text: "Pick something for me" },
//             },
//             {
//                 user: "Eliza",
//                 content: { text: "🎲 I've picked a random bet for you!\n✅ Bet placed successfully!\n- Round: 42\n- Amount: 0.45 ETH\n- Choice: Heads\n- Task ID: 0xabc...def\n- [Track Status](https://relay.gelato.digital/tasks/status/xyz123)" },
//             },
//         ],
//     ],
//     similes: [
//         "COIN_FLIP_BET",
//         "GAME_BET_CHECK",
//         "BET_RESULT_CHECK",
//         "USER_BET_STATUS",
//         "COIN_FLIP_RESULT"
//     ],
// };
