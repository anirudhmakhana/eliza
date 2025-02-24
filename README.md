# Eliza 🤖
# Eliza Coinflip Game Agent 🎲

## Overview

This agent is designed to interact with a Coinflip game on the blockchain. It allows users to:
- Place bets on heads or tails
- Check game results
- View round information
- Get random bet suggestions
- Check their balance

The agent uses Gelato for gasless transactions, making the gaming experience seamless for users.

## Screenshots

<div align="center">
  <h3>Game Interface</h3>
  <img src="./docs/static/img/flipmaster-1.png" alt="Coinflip Game Interface" width="800px" />
  
  <h3>Placing Bets</h3>
  <img src="./docs/static/img/flipmaster-2.png" alt="Placing Bets in Coinflip" width="800px" />
  
  <h3>Round Results</h3>
  <img src="./docs/static/img/flipmaster-3.png" alt="Viewing Round Results" width="800px" />
</div>

## Prerequisites

- [Node.js 23+](https://docs.npmjs.com/downloading-and-installing-node-js-and-npm)
- [pnpm](https://pnpm.io/installation)
- A wallet with some testnet ETH
- Gelato Relay API key (get it from [Gelato](https://www.gelato.network/))

## Quick Start

1. Clone and checkout the correct branch:
```bash
git clone https://github.com/elizaos/eliza.git
cd eliza
git checkout update-gelato-plugin
```

2. Set up your environment variables:
```bash
cp .env.example .env
```

3. Configure the following required variables in your `.env`:
```env
EVM_PRIVATE_KEY=your_wallet_private_key
EVM_PROVIDER_URL=your_rpc_url
GELATO_RELAY_API_KEY=your_gelato_api_key
```

4. Install dependencies and build:
```bash
pnpm install
pnpm run build
```

5. Start the agent:
```bash
pnpm run start
```

6. In a new terminal, start the client interface:
```bash
pnpm run start:client
```

7. Open your browser and navigate to the URL shown in the terminal (usually http://localhost:3000)

## Usage

The agent responds to the following commands:

- `bet 0.01 heads` - Place a bet of 0.01 ETH on heads
- `bet 0.01 tails` - Place a bet of 0.01 ETH on tails
- `pick for me` - Get a random bet suggestion
- `balance` - Check your current balance
- `show round` - View current round information
- `did i win` - Check if you won your last bet
- `check result 123` - Check results for round number 123

## Important Notes

- All transactions are gasless thanks to Gelato integration
- The game is running on the Sepolia testnet
- Minimum bet is 0.01 ETH
- Maximum bet is 0.05 ETH
- Each round has a time limit for betting

## Web3 Functions & VRF Tasks

The game uses Gelato's Web3 Functions and VRF (Verifiable Random Function) for automation and randomness:

- [Event Detection & Bet Processing](https://app.gelato.network/functions/task/0x635ba6671e63842c7b511865ce85cbde37c01692999493fb601394255654c40e:763373) - Web3 function that monitors events and processes bets
- [VRF Round Resolution](https://app.gelato.network/functions/task/0x379bcc0c73cbe607297306a54e854cccb8eadd1bc57cb46061d0d2b3e459033f:763373) - Task that provides verifiable randomness for round resolution

## Troubleshooting

If you encounter issues:

1. Ensure your wallet has enough testnet ETH
2. Verify your environment variables are correctly set
3. Make sure you're on the correct branch (`update-gelato-plugin`)
4. Try cleaning the project and rebuilding:
```bash
pnpm clean
pnpm install
pnpm build
```

## Support

For additional help:
- [Discord](https://discord.gg/ai16z)
- [GitHub Issues](https://github.com/elizaos/eliza/issues)
