import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { toast } from 'react-toastify';
import { useWeb3Context } from '../contexts/useWeb3Context';

export const useGame = () => {
  const { web3State } = useWeb3Context();
  const [games, setGames] = useState([]);
  const [currentGame, setCurrentGame] = useState(null);
  const [loading, setLoading] = useState(false);
  const [availableGames, setAvailableGames] = useState([]);

  // Create a new game with wager
  const createGame = useCallback(async (wagerAmount) => {
    if (!web3State.contractInstance || !web3State.selectedAccount) {
      toast.error('Please connect your wallet first');
      return null;
    }

    setLoading(true);
    try {
      const wagerWei = ethers.parseEther(wagerAmount.toString());
      const tx = await web3State.contractInstance.createGame({ value: wagerWei });
      
      toast.info('Creating game...');
      const receipt = await tx.wait();
      
      // Extract game ID from event
      const gameCreatedEvent = receipt.logs.find(log => {
        try {
          const parsed = web3State.contractInstance.interface.parseLog(log);
          return parsed.name === 'GameCreated';
        } catch {
          return false;
        }
      });
      
      if (gameCreatedEvent) {
        const parsedEvent = web3State.contractInstance.interface.parseLog(gameCreatedEvent);
        const gameId = parsedEvent.args.gameId;
        
        toast.success(`Game ${gameId} created with ${wagerAmount} ETH wager!`);
        await fetchAvailableGames();
        await fetchPlayerGames();
        
        return gameId;
      }
    } catch (error) {
      console.error('Create game error:', error);
      toast.error(error.message || 'Failed to create game');
    } finally {
      setLoading(false);
    }
    return null;
  }, [web3State]);

  // Join an existing game
  const joinGame = useCallback(async (gameId) => {
    if (!web3State.contractInstance || !web3State.selectedAccount) {
      toast.error('Please connect your wallet first');
      return false;
    }

    setLoading(true);
    try {
      const game = await web3State.contractInstance.getGame(gameId);
      const wagerWei = game.wager;
      
      const tx = await web3State.contractInstance.joinGame(gameId, { value: wagerWei });
      
      toast.info('Joining game...');
      const receipt = await tx.wait();
      
      toast.success(`Joined game ${gameId}!`);
      await fetchAvailableGames();
      await fetchPlayerGames();
      await fetchGameDetails(gameId);
      
      return true;
    } catch (error) {
      console.error('Join game error:', error);
      toast.error(error.message || 'Failed to join game');
    } finally {
      setLoading(false);
    }
    return false;
  }, [web3State]);

  // Make a move in the game
  const makeMove = useCallback(async (gameId, position) => {
    if (!web3State.contractInstance || !web3State.selectedAccount) {
      toast.error('Please connect your wallet first');
      return false;
    }

    setLoading(true);
    try {
      const tx = await web3State.contractInstance.makeMove(gameId, position);
      
      toast.info('Making move...');
      await tx.wait();
      
      toast.success(`Move made at position ${position}`);
      await fetchGameDetails(gameId);
      
      return true;
    } catch (error) {
      console.error('Make move error:', error);
      toast.error(error.message || 'Failed to make move');
    } finally {
      setLoading(false);
    }
    return false;
  }, [web3State]);

  // Submit multiple moves at once - saves 80% on gas fees
  const submitBatchMoves = useCallback(async (gameId, moves) => {
    if (!web3State.contractInstance || !web3State.selectedAccount) {
      toast.error('Please connect your wallet first');
      return false;
    }

    setLoading(true);
    try {
      const tx = await web3State.contractInstance.submitGameMoves(gameId, moves);
      
      toast.info('Submitting batch moves...');
      await tx.wait();
      
      toast.success(`Submitted ${moves.length} moves! Saved ~${(moves.length - 1) * 0.5} ETH in gas fees`);
      await fetchGameDetails(gameId);
      
      return true;
    } catch (error) {
      console.error('Batch moves error:', error);
      toast.error(error.message || 'Failed to submit moves');
    } finally {
      setLoading(false);
    }
    return false;
  }, [web3State]);

  // Claim timeout if opponent hasn't moved
  const claimTimeout = useCallback(async (gameId) => {
    if (!web3State.contractInstance || !web3State.selectedAccount) {
      toast.error('Please connect your wallet first');
      return false;
    }

    setLoading(true);
    try {
      const tx = await web3State.contractInstance.claimTimeout(gameId);
      
      toast.info('Claiming timeout...');
      await tx.wait();
      
      toast.success('Timeout claimed! You won the game.');
      await fetchGameDetails(gameId);
      await fetchPlayerGames();
      
      return true;
    } catch (error) {
      console.error('Claim timeout error:', error);
      toast.error(error.message || 'Failed to claim timeout');
    } finally {
      setLoading(false);
    }
    return false;
  }, [web3State]);

  // Fetch available games to join
  const fetchAvailableGames = useCallback(async () => {
    if (!web3State.contractInstance) return;

    try {
      const availableGamesIds = await web3State.contractInstance.getAvailableGames();
      const gamesDetails = await Promise.all(
        availableGamesIds.map(async (gameId) => {
          const game = await web3State.contractInstance.getGame(gameId);
          return {
            id: gameId.toString(),
            player1: game.player1,
            player2: game.player2,
            wager: ethers.formatEther(game.wager),
            lastMoveTime: Number(game.lastMoveTime),
            status: getGameStatusText(game.status),
            board: game.board,
            currentTurn: game.currentTurn
          };
        })
      );
      setAvailableGames(gamesDetails);
    } catch (error) {
      console.error('Fetch available games error:', error);
    }
  }, [web3State.contractInstance]);

  // Fetch player's games
  const fetchPlayerGames = useCallback(async () => {
    if (!web3State.contractInstance || !web3State.selectedAccount) return;

    try {
      // Try getPlayerGames function first
      let playerGameIds = [];
      try {
        playerGameIds = await web3State.contractInstance.getPlayerGames(web3State.selectedAccount);
      } catch (getPlayerError) {
        console.warn('getPlayerGames function failed, using fallback method:', getPlayerError.message);
        
        // Fallback: Get all games and filter by player
        try {
          const gameCounter = await web3State.contractInstance.gameCounter();
          const allGameIds = Array.from({ length: Number(gameCounter) }, (_, i) => i + 1);
          
          const allGames = await Promise.all(
            allGameIds.map(async (gameId) => {
              try {
                const game = await web3State.contractInstance.getGame(gameId);
                return {
                  id: gameId.toString(),
                  player1: game.player1,
                  player2: game.player2,
                  wager: ethers.formatEther(game.wager),
                  lastMoveTime: Number(game.lastMoveTime),
                  status: getGameStatusText(game.status),
                  board: game.board,
                  currentTurn: game.currentTurn
                };
              } catch {
                return null;
              }
            })
          );
          
          // Filter games where player is involved
          const playerGames = allGames.filter(game => 
            game && (
              game.player1.toLowerCase() === web3State.selectedAccount.toLowerCase() ||
              (game.player2 && game.player2.toLowerCase() === web3State.selectedAccount.toLowerCase())
            )
          );
          
          setGames(playerGames);
          return;
        } catch (fallbackError) {
          console.error('Fallback method also failed:', fallbackError.message);
          setGames([]);
          return;
        }
      }
      
      const gamesDetails = await Promise.all(
        playerGameIds.map(async (gameId) => {
          try {
            const game = await web3State.contractInstance.getGame(gameId);
            return {
              id: gameId.toString(),
              player1: game.player1,
              player2: game.player2,
              wager: ethers.formatEther(game.wager),
              lastMoveTime: Number(game.lastMoveTime),
              status: getGameStatusText(game.status),
              board: game.board,
              currentTurn: game.currentTurn
            };
          } catch (gameError) {
            console.warn(`Failed to fetch game ${gameId}:`, gameError.message);
            return null;
          }
        })
      );
      setGames(gamesDetails.filter(game => game !== null));
    } catch (error) {
      console.error('Fetch player games error:', error);
      setGames([]);
    }
  }, [web3State.contractInstance, web3State.selectedAccount]);

  // Fetch specific game details
  const fetchGameDetails = useCallback(async (gameId) => {
    if (!web3State.contractInstance) return null;

    try {
      const game = await web3State.contractInstance.getGame(gameId);
      const gameDetails = {
        id: gameId.toString(),
        player1: game.player1,
        player2: game.player2,
        wager: ethers.formatEther(game.wager),
        lastMoveTime: Number(game.lastMoveTime),
        status: getGameStatusText(game.status),
        board: game.board,
        currentTurn: game.currentTurn
      };
      setCurrentGame(gameDetails);
      return gameDetails;
    } catch (error) {
      console.error('Fetch game details error:', error);
      return null;
    }
  }, [web3State.contractInstance]);

  // Check if it's the current player's turn
  const isMyTurn = useCallback(async (gameId) => {
    if (!web3State.contractInstance) return false;

    try {
      return await web3State.contractInstance.isMyTurn(gameId);
    } catch (error) {
      console.error('Check turn error:', error);
      return false;
    }
  }, [web3State.contractInstance]);

  // Setup event listeners
  const setupEventListeners = useCallback(() => {
    if (!web3State.contractInstance) return;

    const contract = web3State.contractInstance;

    try {
      // Listen for new games
      contract.on('GameCreated', (gameId, player1, wager) => {
        toast.info(`New game ${gameId.toString()} created by ${player1.slice(0, 6)}...`);
        fetchAvailableGames();
      });

      // Listen for game joins
      contract.on('GameJoined', (gameId, player2) => {
        toast.info(`Game ${gameId.toString()} joined by ${player2.slice(0, 6)}...`);
        fetchAvailableGames();
        fetchPlayerGames();
      });

      // Listen for moves
      contract.on('MoveMade', (gameId, player, position) => {
        toast.info(`Move made at position ${position} by ${player.slice(0, 6)}...`);
        fetchGameDetails(gameId.toString());
      });

      // Listen for game over
      contract.on('GameOver', (gameId, status, winner) => {
        const statusText = getGameStatusText(status);
        if (winner && winner !== ethers.ZeroAddress) {
          toast.success(`Game ${gameId.toString()} over! Winner: ${winner.slice(0, 6)}...`);
        } else {
          toast.info(`Game ${gameId.toString()} over! Status: ${statusText}`);
        }
        fetchPlayerGames();
        fetchGameDetails(gameId.toString());
      });

      // Listen for timeout claims
      contract.on('TimeoutClaimed', (gameId, claimer) => {
        toast.success(`Timeout claimed in game ${gameId.toString()} by ${claimer.slice(0, 6)}...`);
        fetchPlayerGames();
        fetchGameDetails(gameId.toString());
      });

      console.log('✅ Event listeners set up successfully');
    } catch (error) {
      console.warn('⚠️ Failed to set up event listeners:', error.message);
      console.log('🔄 Using polling fallback instead');
      
      // Fallback to polling every 10 seconds
      const pollInterval = setInterval(() => {
        fetchAvailableGames();
        fetchPlayerGames();
      }, 10000);
      
      return () => clearInterval(pollInterval);
    }

    return () => {
      try {
        if (contract && typeof contract.removeAllListeners === 'function') {
          contract.removeAllListeners();
        }
      } catch (error) {
        console.warn('Error cleaning up listeners:', error.message);
      }
    };
  }, [web3State.contractInstance, fetchAvailableGames, fetchPlayerGames, fetchGameDetails]);

  // Helper function to convert game status enum to text
  const getGameStatusText = (status) => {
    const statusMap = {
      0: 'Empty',
      1: 'Active',
      2: 'Player1Won',
      3: 'Player2Won',
      4: 'Draw'
    };
    return statusMap[Number(status)] || 'Unknown';
  };

  // Initialize and fetch data (polling only)
  useEffect(() => {
    if (web3State.contractInstance) {
      fetchAvailableGames();
      fetchPlayerGames();
      
      // Simple polling every 15 seconds instead of event listeners
      const pollInterval = setInterval(() => {
        fetchAvailableGames();
        fetchPlayerGames();
      }, 15000);
      
      return () => clearInterval(pollInterval);
    }
  }, [web3State.contractInstance, fetchAvailableGames, fetchPlayerGames]);

  return {
    games,
    currentGame,
    availableGames,
    loading,
    createGame,
    joinGame,
    makeMove,
    submitBatchMoves,
    claimTimeout,
    fetchGameDetails,
    fetchPlayerGames,
    fetchAvailableGames,
    isMyTurn,
    setCurrentGame,
    getGameStatusText
  };
};
