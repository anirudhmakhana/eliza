import type { Plugin } from "@elizaos/core";

export * as actions from "./actions/index.ts";
import { contractInteractionAction } from "./actions/actionContractInteraction.ts";
import { getWalletBalanceAction } from "./actions/actionGetWalletBalance.ts";
import { userFriendlyContractInteractionAction } from "./actions/actionUserFriendly.ts";

export const gelatoPlugin: Plugin = {
    name: "Gelato",
    description: "Gelato plugin for Eliza that relays transactions on chain",
    actions: [contractInteractionAction, getWalletBalanceAction, userFriendlyContractInteractionAction],
    evaluators: [],
    providers: [],
};
export default gelatoPlugin;
