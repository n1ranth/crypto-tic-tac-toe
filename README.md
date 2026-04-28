# TicTacToe Arena — Wager-Based On-Chain GameFi Platform

A decentralized Tic-Tac-Toe game where players stake Sepolia ETH to compete. Built with Solidity smart contracts for game state management, automatic payouts, and timeout handling. Features real-time game updates and a cyberpunk-themed UI.

## 🎮 Features

- **Wager-Based Gameplay**: Stake Sepolia ETH to play competitive games
- **Automatic Payouts**: Smart contract distributes winnings instantly
- **Timeout Protection**: Claim winnings if opponent doesn't move (5 minutes)
- **Real-Time Updates**: Event listeners sync game state without refresh
- **Game History**: Track all played games with detailed statistics
- **Cyberpunk UI**: Modern, minimalist interface with neon aesthetics

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Frontend** | Vite + React 19 + Tailwind CSS v4, Ethers.js v6, React Router, React Toastify |
| **Smart Contract** | Solidity ^0.8.20, deployed to Sepolia testnet |
| **Wallet** | MetaMask browser extension |
| **Network** | Ethereum Sepolia Testnet |

## 🚀 Quick Start

### Prerequisites
- MetaMask browser extension
- Sepolia ETH for testing (get from [Sepolia Faucet](https://cloud.google.com/application/web3/faucet/ethereum/sepolia))
- Node.js 18+ installed

### Installation

```bash
# Clone the repository
git clone https://github.com/bhavi-th/crypto-tic-tac-toe.git
cd crypto-tic-tac-toe

# Install frontend dependencies
cd client
npm install

# Setup environment variables
cp .env.example .env
```

### Environment Setup

Create a `.env` file in the `client` directory:

```env
VITE_CONTRACT_ADDRESS=your_deployed_contract_address_here
```

### Deploy Smart Contract

1. Open [Remix IDE](https://remix.ethereum.org)
2. Create new file `TicTacToe.sol`
3. Copy the contract code from `TicTacToe.sol`
4. Compile with Solidity version ^0.8.20
5. Deploy to Sepolia testnet using MetaMask
6. Copy the deployed contract address to your `.env` file

### Run the Application

```bash
# Start the frontend
cd client
npm run dev

# Visit http://localhost:5173
```

## 🎯 How to Play

1. **Connect Wallet**: Connect your MetaMask wallet to the app
2. **Create Game**: Set a wager amount and create a new game
3. **Join Game**: Other players can join existing games with matching wagers
4. **Play**: Take turns making moves on the 3x3 board
5. **Win**: First to get 3 in a row wins the pot!
6. **Timeout**: If opponent doesn't move for 5 minutes, you can claim the win

## 🏗 Architecture

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│   Player 1      │    │   Player 2      │    │   Other Players │
│   (MetaMask)    │    │   (MetaMask)    │    │   (MetaMask)    │
└─────────┬───────┘    └─────────┬───────┘    └─────────┬───────┘
          │                      │                      │
          └──────────────────────┼──────────────────────┘
                                 │
                    ┌─────────────▼─────────────┐
                    │     TicTacToe Arena      │
                    │      React Frontend       │
                    │   (Real-time Updates)     │
                    └─────────────┬─────────────┘
                                 │
                    ┌─────────────▼─────────────┐
                    │   TicTacToe Smart Contract │
                    │      (Sepolia Testnet)     │
                    │  • Game State Management  │
                    │  • Wager Escrow & Payouts  │
                    │  • Timeout Handling        │
                    └───────────────────────────┘
```

## 📋 Game Flow

1. **Game Creation**: Player stakes ETH → Contract creates game
2. **Game Joining**: Opponent matches stake → Contract activates game
3. **Gameplay**: Players alternate moves → Contract validates moves
4. **Game End**: Win/Draw detected → Contract auto-distributes ETH
5. **Timeout**: 5-minute inactivity → Opponent can claim win

## 🔧 Smart Contract Functions

| Function | Purpose |
|---|---|
| `createGame()` | Create new game with ETH wager |
| `joinGame(gameId)` | Join existing game with matching wager |
| `makeMove(gameId, position)` | Make a move on the board (0-8) |
| `claimTimeout(gameId)` | Claim win if opponent is AFK (5+ min) |
| `getGame(gameId)` | Get complete game state |
| `getAvailableGames()` | List all games waiting for players |

## 🎨 UI Components

- **Game Lobby**: Browse and join available games
- **Game Board**: Interactive 3x3 Tic-Tac-Toe grid
- **Game History**: Track statistics and past games
- **Account Widget**: Wallet connection and balance display

## 🛡 Security Features

- **Contract Validation**: All moves validated on-chain
- **Fair Payouts**: Automatic ETH distribution based on game result
- **Timeout Protection**: Prevents games from stalling indefinitely
- **Access Control**: Only current player can make their move

## 🐛 Troubleshooting

**Common Issues:**
- **"Contract not deployed"**: Ensure you've deployed TicTacToe.sol and updated `.env`
- **"No Sepolia ETH"**: Get test ETH from the Sepolia faucet
- **"Transaction failed"**: Check you have sufficient ETH for gas + wager
- **"Game not found"**: Verify the game ID is correct and game exists

## 📄 License

MIT License - feel free to use this project for learning and development.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

**Built with ❤️ for the Web3 gaming community**
