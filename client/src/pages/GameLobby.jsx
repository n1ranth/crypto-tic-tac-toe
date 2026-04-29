import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { Plus, Clock, Users, Trophy, ExternalLink } from 'lucide-react';
import { ethers } from 'ethers';
import { useGame } from '../hooks/useGame';
import { useWeb3Context } from '../contexts/useWeb3Context';

const GameLobby = () => {
  const navigate = useNavigate();
  const { web3State } = useWeb3Context();
  const { selectedAccount } = web3State;
  const { 
    availableGames, 
    games, 
    loading, 
    createGame, 
    joinGame, 
    deleteGame,
    fetchAvailableGames, 
    fetchPlayerGames,
    getGasCostInfo
  } = useGame(navigate);
  
  const [wagerAmount, setWagerAmount] = useState('');
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [gasCostInfo, setGasCostInfo] = useState({ moveCost: '0', totalGameCost: '0' });

  useEffect(() => {
    fetchAvailableGames();
    fetchPlayerGames();
  }, [fetchAvailableGames, fetchPlayerGames]);

  useEffect(() => {
    // Fetch gas cost info
    const fetchGasInfo = async () => {
      const info = await getGasCostInfo();
      setGasCostInfo(info);
    };
    
    fetchGasInfo();
  }, [getGasCostInfo]);

  const handleCreateGame = async () => {
    if (!wagerAmount || parseFloat(wagerAmount) <= 0) {
      toast.error('Please enter a valid wager amount');
      return;
    }

    const gameId = await createGame(parseFloat(wagerAmount));
    if (gameId) {
      setWagerAmount('');
      setShowCreateForm(false);
    }
  };

  const handleJoinGame = async (gameId) => {
    const success = await joinGame(gameId);
    if (success) {
      navigate(`/game/${gameId}`);
    }
  };

  const handleDeleteGame = async (gameId) => {
    const success = await deleteGame(gameId);
    // Game lists will be automatically refreshed in the deleteGame function
  };

  
  const formatAddress = (address) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const isMyGame = (player1, player2) => {
    return selectedAccount && (player1.toLowerCase() === selectedAccount.toLowerCase() || 
           player2.toLowerCase() === selectedAccount.toLowerCase());
  };

  const isGameExpired = (lastMoveTime) => {
    const FIVE_MINUTES = 5 * 60 * 1000; // 5 minutes in milliseconds
    return (Date.now() - (lastMoveTime * 1000)) > FIVE_MINUTES;
  };

  return (
    <div className="flex-1 px-6 md:px-10 py-8">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
              <h1 className="font-heading font-bold text-4xl accent-text mb-2">
                Tic-Tac-Toe Arena
              </h1>
              <p className="font-body text-gray-400 text-lg">
                Stake Sepolia ETH and battle opponents in on-chain Tic-Tac-Toe. Winner takes all!
              </p>
        </div>

        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Create Game */}
          <div className="lg:col-span-1">
            <div className="skeleton-card">
              <div className="flex items-center gap-2 mb-4">
                <Plus className="w-5 h-5 text-accent" />
                <h2 className="font-heading font-bold text-xl accent-text">
                  Create New Game
                </h2>
              </div>

              {!showCreateForm ? (
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="skeleton-button w-full flex items-center justify-center gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Create Game
                </button>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-primary-a0 mb-2 font-label">
                      Wager Amount (ETH)
                    </label>
                    <input
                      type="number"
                      step="0.001"
                      min="0.001"
                      value={wagerAmount}
                      onChange={(e) => setWagerAmount(e.target.value)}
                      placeholder="0.01"
                      className="w-full px-4 py-2 bg-surface-tonal-a0 border border-surface-tonal-a20 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-a20 text-primary-a40"
                    />
                  </div>
                  <div className="flex gap-3">
                    <button
                      onClick={handleCreateGame}
                      disabled={loading || !wagerAmount}
                      className="flex-1 skeleton-button disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {loading ? 'Creating...' : 'Create'}
                    </button>
                    <button
                      onClick={() => {
                        setShowCreateForm(false);
                        setWagerAmount('');
                      }}
                      className="skeleton-button"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* My Games */}
            <div className="skeleton-card mt-6">
              <div className="flex items-center gap-2 mb-4">
                <Trophy className="w-5 h-5 text-accent" />
                <h2 className="font-heading font-bold text-xl accent-text">
                  Your Games
                </h2>
              </div>

              {games.length === 0 ? (
                <p className="text-surface-a40 text-center py-8">
                  No games yet. Create one or join an existing game!
                </p>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {games.map((game) => (
                    <div
                      key={game.id}
                      className="skeleton-card"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-label text-sm font-semibold accent-text">
                          Game #{game.id}
                        </span>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Clock className="w-3 h-3" />
                          {Math.floor((Date.now() / 1000 - game.lastMoveTime) / 60)}m ago
                        </div>
                      </div>
                      
                      <div className="mb-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-500">Host:</span>
                          <span className="text-xs font-mono accent-text">
                            {formatAddress(game.player1)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">Wager:</span>
                          <span className="text-sm font-semibold accent-text">
                            {game.wager} ETH
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col gap-2">
                        {game.player1.toLowerCase() === selectedAccount?.toLowerCase() && game.status === 'Empty' && (
                          <button
                            onClick={() => handleDeleteGame(game.id)}
                            disabled={loading}
                            className="skeleton-button text-danger font-label text-xs w-full"
                          >
                            Delete
                          </button>
                        )}
                        <button
                          onClick={() => navigate(`/game/${game.id}`)}
                          className={`skeleton-button w-full px-4 py-2 font-semibold text-sm ${
                            game.status === 'Active' 
                              ? 'text-success' 
                              : 'text-warning'
                          }`}
                        >
                          {game.status === 'Active' ? 'Continue Game' : 'View Details'}
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: Available Games */}
          <div className="lg:col-span-2">
            <div className="skeleton-card">
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-5 h-5 text-accent" />
                <h2 className="font-heading font-bold text-xl accent-text">
                  Available Games
                </h2>
              </div>

              {availableGames.length === 0 ? (
                <div className="text-center py-12">
                  <Users className="w-12 h-12 mx-auto mb-4 text-surface-a40" />
                  <p className="text-surface-a40 mb-2">No available games</p>
                  <p className="text-surface-a50 text-sm">
                    Be the first to create a game and wait for an opponent!
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {availableGames.filter(game => !isGameExpired(game.lastMoveTime)).map((game) => (
                    <div
                      key={game.id}
                      className="skeleton-card"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-label text-sm font-semibold accent-text">
                          Game #{game.id}
                        </span>
                        <div className="flex items-center gap-1 text-xs text-gray-500">
                          <Clock className="w-3 h-3" />
                          {Math.floor((Date.now() / 1000 - game.lastMoveTime) / 60)}m ago
                        </div>
                      </div>
                      
                      <div className="mb-3">
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-xs text-gray-500">Host:</span>
                          <span className="text-xs font-mono accent-text">
                            {formatAddress(game.player1)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-500">Wager:</span>
                          <span className="text-sm font-semibold accent-text">
                            {game.wager} ETH
                          </span>
                        </div>
                      </div>

                      <div className="flex gap-2">
                        {game.player1.toLowerCase() === selectedAccount?.toLowerCase() ? (
                          <>
                            <button
                              onClick={() => handleDeleteGame(game.id)}
                              disabled={loading}
                              className="skeleton-button text-danger font-label text-xs flex-1"
                            >
                              Delete
                            </button>
                            <button
                              onClick={() => navigate(`/game/${game.id}`)}
                              disabled={loading}
                              className="skeleton-button text-info font-label text-xs flex-1"
                            >
                              View
                            </button>
                          </>
                        ) : (
                          <button
                            onClick={() => handleJoinGame(game.id)}
                            disabled={loading || isMyGame(game.player1, game.player2)}
                            className="skeleton-button w-full disabled:opacity-50"
                          >
                            {isMyGame(game.player1, game.player2) ? 'Your Game' : 'Join Game'}
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameLobby;
