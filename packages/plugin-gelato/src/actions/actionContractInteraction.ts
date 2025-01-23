import { type Action, type IAgentRuntime, type Memory, type State, type HandlerCallback } from "@elizaos/core";
import { executeSponsoredCall } from "../utils";
import { WalletProvider, initWalletProvider } from "../providers/wallet";
import { formatUnits } from "viem";

export class ContractInteractionAction {
  constructor(private walletProvider: WalletProvider) {}

  async interactWithContract(
    abi: any,
    functionName: string,
    args: any[],
    target: string,
    chain: string
  ) {
    console.log(`Interacting with contract at ${target} on ${chain}`);
    this.walletProvider.switchChain(chain as any);

    // const publicClient = this.walletProvider.getPublicClient(chain as any);
    const publicClient = this.walletProvider.getPublicClient(chain as any)

    // return executeSponsoredCall(publicClient, abi, functionName, args, target);
    return executeSponsoredCall(publicClient, abi, functionName, args, target)
  }
}

export const contractInteractionAction: Action = {
  name: "CONTRACT_INTERACTION",
  description: "Interact with a smart contract function gaslessly using Gelato Relay.",
  handler: async (
    runtime: IAgentRuntime,
    message: Memory,
    state: State,
    _options: any,
    callback?: HandlerCallback
  ) => {
    try {
      const { abi, functionName, args, target, chain } = message.content;

      if (!abi || !functionName || !target || !chain) {
        throw new Error("Missing required inputs: abi, functionName, target, or chain.");
      }

      // Initialize wallet provider
      const walletProvider = await initWalletProvider(runtime);
      const action = new ContractInteractionAction(walletProvider);

      // Execute interaction
      const response = await action.interactWithContract(abi, functionName as string, args as any[], target as string, chain as string);

      const result = `✅ Contract interaction successful! Task ID: ${response.taskId}`;
      if (callback) {
        callback({
          text: result,
          content: {
            success: true,
            taskId: response.taskId,
            target,
            chain,
          },
        });
      }
      return result;
    } catch (error) {
      const errorMessage = `❌ Error in contract interaction: ${error.message}`;
      console.error(errorMessage);
      if (callback) {
        callback({ text: errorMessage, content: { error: error.message } });
      }
      return errorMessage;
    }
  },
  validate: async (runtime: IAgentRuntime) => {
    const apiKey = runtime.getSetting("GELATO_RELAY_API_KEY");
    return typeof apiKey === "string" && apiKey.length > 0;
  },
  examples: [
    [
      {
        user: "User",
        content: {
          text: "Interact with contract at 0x123456 on Sepolia.",
          abi: "[...]",
          functionName: "increment",
          target: "0x1234567890abcdef1234567890abcdef12345678",
          chain: "sepolia",
        },
      },
      {
        user: "Eliza",
        content: {
          text: "✅ Contract interaction successful! Task ID: abc123",
        },
      },
    ],
  ],
  similes: ["CALL_SMART_CONTRACT", "INTERACT_CONTRACT", "GASLESS_CALL"],
};
