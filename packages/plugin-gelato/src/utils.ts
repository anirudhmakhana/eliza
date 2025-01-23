import {
    SponsoredCallRequest,
    CallWithERC2771Request,
    GelatoRelay,
  } from "@gelatonetwork/relay-sdk-viem";
  import { createPublicClient, encodeFunctionData } from "viem";
  import {  Address,
    WalletClient,
    PublicClient,
    Chain,
    HttpTransport,
    Account,
    PrivateKeyAccount,
    TestClient, } from "viem";

  const GELATO_RELAY_API_KEY = process.env.GELATO_RELAY_API_KEY as string;
  const relay = new GelatoRelay();

  /**
   * Validates the ABI, contract address, and function inputs.
   * @param abi ABI of the contract.
   * @param functionName Name of the function to call.
   * @param args Arguments for the function call.
   * @param target Target contract address.
   */
  function validateInputs(abi: any, functionName: string, args: any[], target: string) {
    if (!Array.isArray(abi)) throw new Error("Invalid ABI: Must be an array");
    if (!functionName || typeof functionName !== "string") {
      throw new Error("Invalid function name: Must be a non-empty string");
    }
    if (!target || !/^0x[a-fA-F0-9]{40}$/.test(target)) {
      throw new Error("Invalid target address: Must be a valid Ethereum address");
    }
    // Optional: Validate args if needed
  }

  /**
   * Executes a `sponsoredCall` with the Gelato Relay SDK.
   * @param client Public client to fetch chain information.
   * @param abi ABI of the contract.
   * @param functionName Function name to call.
   * @param args Arguments for the function call.
   * @param target Target contract address.
   */
  export async function executeSponsoredCall(
    client: PublicClient<HttpTransport, Chain, Account | undefined>,
    abi: any,
    functionName: string,
    args: any[],
    target: string
  ) {
    // validateInputs(abi, functionName, args, target);

    const chainId = await client.getChainId();
    const data = encodeFunctionData({
      abi,
      functionName,
      args,
    });

    const relayRequest: SponsoredCallRequest = {
      chainId: BigInt(chainId),
      target,
      data,
    };

    return relay.sponsoredCall(relayRequest, GELATO_RELAY_API_KEY);
  }

  /**
   * Executes a `sponsoredCallERC2771` with the Gelato Relay SDK.
   * @param client Wallet client to sign user-specific transactions.
   * @param abi ABI of the contract.
   * @param functionName Function name to call.
   * @param args Arguments for the function call.
   * @param target Target contract address.
   * @param user Address of the user making the call.
   */
//   export async function executeSponsoredCallERC2771(
//     client: WalletClient,
//     abi: any,
//     functionName: string,
//     args: any[],
//     target: string,
//     user: string
//   ) {
//     validateInputs(abi, functionName, args, target);

//     const chainId = await client.getChainId();
//     const data = encodeFunctionData({
//       abi,
//       functionName,
//       args,
//     });

//     const relayRequest: CallWithERC2771Request = {
//       user,
//       chainId: BigInt(chainId),
//       target,
//       data,
//     };

//     return relay.sponsoredCallERC2771(relayRequest, client, GELATO_RELAY_API_KEY);
//   }