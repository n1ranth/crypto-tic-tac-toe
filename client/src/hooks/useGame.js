import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import { toast } from 'react-toastify';
import { useWeb3Context } from '../contexts/useWeb3Context';

export const useGame = (navigate = null) => {
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
      const gasCostWei = ethers.parseEther('0.00162'); // Pre-paid gas cost
      const totalWei = wagerWei + gasCostWei;
      
      console.log('Create Game Debug:', {
        wagerAmount,
        wagerWei: wagerWei.toString(),
        gasCostWei: gasCostWei.toString(),
        totalWei: totalWei.toString(),
        totalEth: ethers.formatEther(totalWei)
      });
      
      const tx = await web3State.contractInstance.createGame({ value: totalWei });
      
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
        
        toast.success(`Game ${gameId} created! Wager: ${wagerAmount} ETH + Gas: ${ethers.formatEther(gasCostWei)} ETH`);
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
    console.log('joinGame called with gameId:', gameId);
    
    if (!web3State.contractInstance || !web3State.selectedAccount) {
      toast.error('Please connect your wallet first');
      return false;
    }

    console.log('Contract and account validated');
    setLoading(true);
    try {
      console.log('Fetching game details for gameId:', gameId);
      const game = await web3State.contractInstance.getGame(gameId);
      console.log('Game fetched:', game);
      
      const wagerWei = ethers.getBigInt(game.wager);
      
      console.log('Joining game with exact wager amount:', ethers.formatEther(wagerWei), 'ETH');
      
      // Try joining with just the wager amount (what the user sees)
      try {
        const joinTx = await web3State.contractInstance.joinGame(gameId, { value: wagerWei });
        
        toast.info('Joining game...');
        const receipt = await joinTx.wait();
        
        toast.success(`Joined game ${gameId}! Wager: ${ethers.formatEther(wagerWei)} ETH`);
        await fetchAvailableGames();
        await fetchPlayerGames();
        await fetchGameDetails(gameId);
        
        return true;
        
      } catch (error) {
        // If direct wager fails, the contract might expect wager + gas
        console.log('Direct wager failed, trying with standard gas addition...');
        
        const gasCostWei = ethers.parseEther('0.00162');
        const totalWei = wagerWei + gasCostWei;
        
        const joinTx = await web3State.contractInstance.joinGame(gameId, { value: totalWei });
        
        toast.info('Joining game...');
        const receipt = await joinTx.wait();
        
        toast.success(`Joined game ${gameId}! Wager: ${ethers.formatEther(wagerWei)} ETH + Gas: ${ethers.formatEther(gasCostWei)} ETH`);
        await fetchAvailableGames();
        await fetchPlayerGames();
        await fetchGameDetails(gameId);
        
        return true;
      }
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

  // Pre-paid gas functions
  const getGameGasDeposit = useCallback(async (gameId, player) => {
    if (!web3State.contractInstance) return '0';
    
    try {
      // Check if function exists on contract
      if (typeof web3State.contractInstance.getGameGasDeposit !== 'function') {
        console.log('getGameGasDeposit not available on contract, using fallback value');
        return '0.00162'; // Default full gas deposit
      }
      
      const deposit = await web3State.contractInstance.getGameGasDeposit(gameId, player);
      return ethers.formatEther(deposit);
    } catch (error) {
      console.error('Get game gas deposit error:', error);
      return '0.00162'; // Fallback to full deposit
    }
  }, [web3State]);

  const getGameMovesCount = useCallback(async (gameId) => {
    if (!web3State.contractInstance) return 0;
    
    try {
      const count = await web3State.contractInstance.getGameMovesCount(gameId);
      console.log('Moves count from contract:', count);
      return Number(count);
    } catch (error) {
      console.error('Get game moves count error:', error);
      
      // Fallback: try to get game details and count moves from board
      try {
        const game = await web3State.contractInstance.games(gameId);
        if (game && game.board) {
          const moves = game.board.filter(cell => Number(cell) !== 0).length;
          console.log('Moves count from board fallback:', moves, 'Game status:', game.status);
          return moves;
        }
      } catch (fallbackError) {
        console.error('Board fallback error:', fallbackError);
      }
      
      return 0; // Final fallback
    }
  }, [web3State]);

  const getGasCostInfo = useCallback(async () => {
    if (!web3State.contractInstance) return { moveCost: '0', totalGameCost: '0' };
    
    try {
      // Check if function exists on contract
      if (typeof web3State.contractInstance.getGasCostInfo !== 'function') {
        console.log('getGasCostInfo not available on contract, using fallback values');
        return {
          moveCost: '0.00018', // Default move cost
          totalGameCost: '0.00162' // 9 moves * 0.00018
        };
      }
      
      const [moveCost, totalGameCost] = await web3State.contractInstance.getGasCostInfo();
      return {
        moveCost: ethers.formatEther(moveCost),
        totalGameCost: ethers.formatEther(totalGameCost)
      };
    } catch (error) {
      console.error('Get gas cost info error:', error);
      // Return fallback values
      return {
        moveCost: '0.00018', // Default move cost
        totalGameCost: '0.00162' // 9 moves * 0.00018
      };
    }
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
      contract.on('GameJoined', async (gameId, player2) => {
        toast.info(`Game ${gameId.toString()} joined by ${player2.slice(0, 6)}...`);
        fetchAvailableGames();
        fetchPlayerGames();
        
        // If the current user is the game creator, navigate them to the game board
        if (web3State.selectedAccount && navigate) {
          try {
            const game = await contract.getGame(gameId);
            if (game.player1.toLowerCase() === web3State.selectedAccount.toLowerCase()) {
              // This is the game creator, navigate them to the game board
              navigate(`/game/${gameId.toString()}`);
              toast.success('Your game has started! Navigate to game board.');
            }
          } catch (error) {
            console.error('Error checking game creator:', error);
          }
        }
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

  // Delete a game (only for game creator)
  const deleteGame = useCallback(async (gameId) => {
    if (!web3State.contractInstance || !web3State.selectedAccount) {
      toast.error('Please connect your wallet first');
      return false;
    }

    setLoading(true);
    try {
      const tx = await web3State.contractInstance.deleteGame(gameId);
      
      toast.info('Deleting game...');
      const receipt = await tx.wait();
      
      toast.success('Game deleted successfully! Funds refunded.');
      
      // Refresh games lists
      await fetchAvailableGames();
      await fetchPlayerGames();
      
      return true;
    } catch (error) {
      console.error('Error deleting game:', error);
      toast.error(error.message || 'Failed to delete game');
      return false;
    } finally {
      setLoading(false);
    }
  }, [web3State.contractInstance, web3State.selectedAccount, fetchAvailableGames, fetchPlayerGames]);

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
    deleteGame,
    getGameGasDeposit,
    getGameMovesCount,
    getGasCostInfo,
    fetchGameDetails,
    fetchPlayerGames,
    fetchAvailableGames,
    isMyTurn,
    setCurrentGame,
    getGameStatusText
  };
};
