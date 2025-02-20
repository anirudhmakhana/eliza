import type { Plugin } from "@elizaos/core";

export * as actions from "./actions/index.ts";
import { flipCoinAction, checkGameStateAction } from "./actions/actionGameTracker.ts";

export const gelatoGamePlugin: Plugin = {
    name: "Gelato",
    description: "Gelato plugin for Eliza that relays transactions on chain",
    actions: [flipCoinAction, checkGameStateAction],
    evaluators: [],
    providers: [],
};
export default gelatoGamePlugin;
