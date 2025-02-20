import {
    type Action,
    type IAgentRuntime,
    type Memory,
    type State,
    type HandlerCallback,
    elizaLogger,
} from "@elizaos/core";
import axios from "axios";

// Define API base URL & API Key
const API_BASE_URL = "https://game-coordinator-backend.onrender.com";
const API_KEY = "inkhackerhouse"; // Ensure this is securely stored
const AXIOS_CONFIG = { headers: { "x-api-key": API_KEY } };

// 🎲 **Game AI Agent: Flip Coin & Resolve Round**
export const flipCoinAction: Action = {
    name: "FLIP_COIN",
    description: "Flips a coin and resolves the round by submitting the result to the Game Coordinator.",
    validate: async () => true,
    similes: ["TOSS_COIN", "FLIP", "COIN_TOSS", "RESOLVE_ROUND"],
    examples: [[
        { user: "Web3Function", content: { text: '{"round": "1"}' } },
        { user: "Game AI Agent", content: { text: "✅ Round 1 result: heads\nTotal bets: 2\nReady to execute transaction." } }
    ]],
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        _state: State,
        _options: unknown,
        callback?: HandlerCallback
    ) => {
        try {
            elizaLogger.info(`📩 Received flip request: ${message.content.text}`);

            // Parse incoming message to extract round number
            const { round } = JSON.parse(message.content.text);

            // 🔹 **Step 1: Fetch round data from Game Coordinator**
            const roundResponse = await axios.get(`${API_BASE_URL}/round/${round}`, AXIOS_CONFIG);
            const roundData = roundResponse.data;

            // 🔍 **Check if the round has already been resolved**
            if (roundData.resolved) {
                elizaLogger.warn(`⚠️ Round ${round} is already resolved.`);
                callback?.({ text: `⚠️ Round ${round} has already been resolved. No action needed.` });
                return `⚠️ Round ${round} has already been resolved.`;
            }

            // 🔹 **Step 2: Fetch bets for this round**
            const betsResponse = await axios.get(`${API_BASE_URL}/bets/${round}`, AXIOS_CONFIG);
            const bets = betsResponse.data;

            // 🔍 **Check if there are at least 2 players**
            if (bets.length < 2) {
                elizaLogger.warn(`⚠️ Round ${round} does not have enough bets (${bets.length}/2).`);
                callback?.({ text: `⚠️ Round ${round} requires at least 2 bets to resolve.` });
                return `⚠️ Round ${round} requires at least 2 bets to resolve.`;
            }

            // 🎲 **Step 3: Randomly determine the coin flip result**
            const result = Math.random() < 0.5; // `true` = Heads, `false` = Tails
            elizaLogger.info(`🎲 Coin flipped: ${result ? "Heads" : "Tails"}`);

            // 🔹 **Step 4: Submit the resolved round result**
            await axios.post(
                `${API_BASE_URL}/resolve`,
                { round, result },
                AXIOS_CONFIG
            );

            // ✅ **Step 5: Return the response**
            const response = `✅ Round ${round} resolved.\n🎲 Result: ${result ? "Heads" : "Tails"}`;
            elizaLogger.success(response);
            callback?.({ text: response });

            return response;

        } catch (error) {
            const errorMessage = `❌ Error resolving round: ${error instanceof Error ? error.message : "Unknown error"}`;
            elizaLogger.error(errorMessage);
            callback?.({ text: errorMessage });
            return errorMessage;
        }
    },
};

// 🔍 **Helper Action: Check Game State**
export const checkGameStateAction: Action = {
    name: "CHECK_GAME_STATE",
    description: "Fetches the current state of a game round from the Game Coordinator backend.",
    validate: async () => true,
    similes: ["CHECK_ROUND", "GAME_STATUS", "ROUND_STATUS"],
    examples: [[
        { user: "User", content: { text: '{"round": "1"}' } },
        { user: "Game AI Agent", content: { text: "🎲 Round 1 Status:\n- Bets: 2\n- Resolved: ❌ No\n- Created: 2024-02-19 06:56:56" } }
    ]],
    handler: async (
        runtime: IAgentRuntime,
        message: Memory,
        _state: State,
        _options: unknown,
        callback?: HandlerCallback
    ) => {
        try {
            elizaLogger.info(`📩 Received game state check request: ${message.content.text}`);

            // Extract round number
            const { round } = JSON.parse(message.content.text);

            // Fetch round data and bets in parallel
            const [roundResponse, betsResponse] = await Promise.all([
                axios.get<{
                    id: string;
                    round: number;
                    resolved: boolean;
                    result: boolean | null;
                    createdAt: string;
                    updatedAt: string;
                }>(`${API_BASE_URL}/round/${round}`, AXIOS_CONFIG),
                axios.get<Array<{
                    id: string;
                    player: string;
                    amount: string;
                    choice: boolean;
                    round: number;
                    isToken: boolean;
                    token: string;
                    createdAt: string;
                }>>(`${API_BASE_URL}/bets/${round}`, AXIOS_CONFIG)
            ]);

            const roundData = roundResponse.data;
            const bets = betsResponse.data;

            // Format the response
            const response = `🎲 Round ${round} Status:\n` +
                `- Bets: ${bets.length}\n` +
                `- Resolved: ${roundData.resolved ? '✅ Yes' : '❌ No'}\n` +
                `${roundData.resolved && roundData.result !== null ? 
                    `- Result: ${roundData.result ? '🎲 Heads' : '🎲 Tails'}\n` : ''}` +
                `- Created: ${new Date(roundData.createdAt).toLocaleString()}\n` +
                `${roundData.resolved ? 
                    `- Resolved At: ${new Date(roundData.updatedAt).toLocaleString()}` : ''}`;

            elizaLogger.info(`✅ Fetched game state: ${response}`);
            callback?.({ text: response });

            return response;
        } catch (error) {
            if (axios.isAxiosError(error) && error.response?.status === 404) {
                const errorMessage = `❌ Round not found or not yet created`;
                elizaLogger.error(errorMessage);
                callback?.({ text: errorMessage });
                return errorMessage;
            }
            const errorMessage = `❌ Error fetching game state: ${error instanceof Error ? error.message : "Unknown error"}`;
            elizaLogger.error(errorMessage);
            callback?.({ text: errorMessage });
            return errorMessage;
        }
    }
};
