import { ethers } from 'ethers';
import Game from '../models/Game.js';
import contractAbi from '../constants/ticTacToeAbi.json' with { type: 'json' };

const CONTRACT_ADDRESS = process.env.CONTRACT_ADDRESS;
const RPC_URL = process.env.RPC_URL || 'https://sepolia.infura.io/v3/your-project-id';

// Setup provider for listening to events
let provider;
let contract;

const initializeContract = () => {
  if (!CONTRACT_ADDRESS) {
    console.warn('CONTRACT_ADDRESS not provided, event listening disabled');
    return;
  }

  provider = new ethers.JsonRpcProvider(RPC_URL);
  contract = new ethers.Contract(CONTRACT_ADDRESS, contractAbi, provider);
  
  console.log('Contract initialized for event listening');
};

// Handle game creation event
export const handleGameCreated = async (gameId, player1, wager) => {
  try {
    const game = new Game({
      gameId: Number(gameId),
      player1: player1.toLowerCase(),
      wager: ethers.formatEther(wager),
      status: 'Empty'
    });

    await game.save();
    console.log(`Game ${gameId} created and saved to database`);
  } catch (error) {
    console.error('Error saving game creation:', error);
  }
};

// Handle game joined event
export const handleGameJoined = async (gameId, player2) => {
  try {
    await Game.findOneAndUpdate(
      { gameId: Number(gameId) },
      { 
        player2: player2.toLowerCase(),
        status: 'Active',
        lastMoveTime: new Date()
      }
    );
    console.log(`Game ${gameId} joined by ${player2}`);
  } catch (error) {
    console.error('Error updating game join:', error);
  }
};

// Handle move made event
export const handleMoveMade = async (gameId, player, position) => {
  try {
    const game = await Game.findOne({ gameId: Number(gameId) });
    if (!game) return;

    // Add move to history
    game.moves.push({
      player: player.toLowerCase(),
      position: Number(position),
      timestamp: new Date()
    });

    // Update board (this would need to be fetched from contract)
    // For now, just update the last move time
    game.lastMoveTime = new Date();
    await game.save();

    console.log(`Move recorded for game ${gameId}: player ${player} at position ${position}`);
  } catch (error) {
    console.error('Error recording move:', error);
  }
};

// Handle game over event
export const handleGameOver = async (gameId, status, winner) => {
  try {
    const winnerAddress = winner && winner !== ethers.ZeroAddress ? winner.toLowerCase() : null;
    
    await Game.findOneAndUpdate(
      { gameId: Number(gameId) },
      { 
        status,
        winner: winnerAddress,
        endedAt: new Date()
      }
    );
    console.log(`Game ${gameId} ended with status: ${status}`);
  } catch (error) {
    console.error('Error updating game end:', error);
  }
};

// Start listening to contract events
export const startEventListener = () => {
  if (!contract) {
    console.warn('Contract not initialized, cannot start event listening');
    return;
  }

  console.log('Starting to listen for contract events...');

  contract.on('GameCreated', handleGameCreated);
  contract.on('GameJoined', handleGameJoined);
  contract.on('MoveMade', handleMoveMade);
  contract.on('GameOver', handleGameOver);

  console.log('Event listeners started successfully');
};

// Manual sync function to sync existing games from contract
export const syncExistingGames = async () => {
  try {
    if (!contract) {
      console.warn('Contract not initialized, cannot sync games');
      return;
    }

    console.log('Syncing existing games from contract...');
    
    // Get game counter
    const gameCounter = await contract.gameCounter();
    const totalGames = Number(gameCounter);

    let syncedCount = 0;
    
    for (let i = 1; i <= totalGames; i++) {
      try {
        const existingGame = await Game.findOne({ gameId: i });
        
        if (!existingGame) {
          // Fetch game data from contract
          const gameData = await contract.getGame(i);
          
          const game = new Game({
            gameId: i,
            player1: gameData.player1.toLowerCase(),
            player2: gameData.player2 && gameData.player2 !== ethers.ZeroAddress 
              ? gameData.player2.toLowerCase() 
              : null,
            wager: ethers.formatEther(gameData.wager),
            status: ['Empty', 'Active', 'Player1Won', 'Player2Won', 'Draw'][Number(gameData.status)],
            board: gameData.board.map(val => Number(val)),
            currentTurn: Number(gameData.currentTurn),
            lastMoveTime: new Date(Number(gameData.lastMoveTime) * 1000),
            createdAt: new Date(Number(gameData.lastMoveTime) * 1000),
            winner: (gameData.status === 1 || gameData.status === 2) 
              ? (gameData.status === 1 ? gameData.player1 : gameData.player2).toLowerCase()
              : null
          });

          await game.save();
          syncedCount++;
        }
      } catch (error) {
        console.error(`Error syncing game ${i}:`, error);
      }
    }

    console.log(`Sync completed. ${syncedCount} new games synced to database.`);
  } catch (error) {
    console.error('Error during sync:', error);
  }
};

// Initialize contract on module load
initializeContract();
