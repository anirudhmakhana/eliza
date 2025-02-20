// SPDX-License-Identifier: MIT
pragma solidity 0.8.28;

import "@gelatonetwork/relay-context/contracts/vendor/ERC2771Context.sol";
import "@openzeppelin/contracts/token/ERC20/IERC20.sol";

contract CoinFlipGame is ERC2771Context {
    struct Bet {
        address player;
        uint256 amount;
        bool choice; // true = Heads, false = Tails
        bool isTokenBet;
        address token; // Address of token (if token bet)
    }

    mapping(uint256 => Bet[]) public rounds;
    mapping(address => uint256) public ethBalances;
    mapping(address => mapping(address => uint256)) public tokenBalances; // User → Token → Balance
    uint256 public currentRound;
    uint256 public minBetAmount = 0.01 ether;

    event BetPlaced(address indexed player, uint256 amount, bool choice, uint256 round, bool isToken, address token);
    event RoundResolved(uint256 round, bool outcome, address[] winners);
    event Payout(address indexed player, uint256 amount, bool isToken, address token);
    event Deposit(address indexed player, uint256 amount);
    event TokenDeposit(address indexed player, uint256 amount, address token);
    event Withdrawal(address indexed player, uint256 amount, bool isToken, address token);

    constructor(address trustedForwarder) ERC2771Context(trustedForwarder) {}

    /// @notice Players deposit ETH before placing bets
    function deposit() external payable {
        require(msg.value > 0, "Must deposit ETH");
        ethBalances[_msgSender()] += msg.value;
        emit Deposit(_msgSender(), msg.value);
    }

    /// @notice Players deposit ERC20 tokens before placing bets
    function depositTokens(address token, uint256 amount) external {
        require(amount > 0, "Must deposit tokens");
        require(IERC20(token).transferFrom(_msgSender(), address(this), amount), "Transfer failed");
        tokenBalances[_msgSender()][token] += amount;
        emit TokenDeposit(_msgSender(), amount, token);
    }

    /// @notice Players place bets using their deposited ETH or tokens
    function placeBet(bool choice, bool isToken, address token, uint256 amount) external {
        require(amount > 0, "Invalid bet amount");

        if (isToken) {
            require(tokenBalances[_msgSender()][token] >= amount, "Insufficient token balance");
            tokenBalances[_msgSender()][token] -= amount;
        } else {
            require(ethBalances[_msgSender()] >= amount, "Insufficient ETH balance");
            ethBalances[_msgSender()] -= amount;
        }

        rounds[currentRound].push(Bet(_msgSender(), amount, choice, isToken, token));
        emit BetPlaced(_msgSender(), amount, choice, currentRound, isToken, token);
    }

    /// @notice Resolves the round (called by Web3 Function)
    function resolveRound(bool outcome) external {
        require(_msgSender() == address(this), "Only callable via Web3 Function");
        require(rounds[currentRound].length > 0, "No bets in this round");

        address[] memory winners;
        uint256 winnersCount;

        for (uint256 i = 0; i < rounds[currentRound].length; i++) {
            Bet storage bet = rounds[currentRound][i];

            if (bet.choice == outcome) {
                if (bet.isTokenBet) {
                    tokenBalances[bet.player][bet.token] += bet.amount * 2;
                } else {
                    ethBalances[bet.player] += bet.amount * 2;
                }
                winners[winnersCount++] = bet.player;
            }
        }

        emit RoundResolved(currentRound, outcome, winners);
        currentRound++; // Move to next round
    }

    /// @notice Players withdraw winnings
    function withdraw(bool isToken, address token, uint256 amount) external {
        require(amount > 0, "Invalid withdrawal amount");

        if (isToken) {
            require(tokenBalances[_msgSender()][token] >= amount, "Insufficient token balance");
            tokenBalances[_msgSender()][token] -= amount;
            IERC20(token).transfer(_msgSender(), amount);
            emit Withdrawal(_msgSender(), amount, true, token);
        } else {
            require(ethBalances[_msgSender()] >= amount, "Insufficient ETH balance");
            ethBalances[_msgSender()] -= amount;
            payable(_msgSender()).transfer(amount);
            emit Withdrawal(_msgSender(), amount, false, address(0));
        }
    }
}
