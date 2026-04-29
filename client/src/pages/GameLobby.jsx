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

  const formatAddress = (address) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const isMyGame = (player1, player2) => {
    return selectedAccount && (player1.toLowerCase() === selectedAccount.toLowerCase() || 
           player2.toLowerCase() === selectedAccount.toLowerCase());
  };

  return (
    <div className="flex-1 px-6 md:px-10 py-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-heading font-bold text-3xl text-primary-a40 mb-2">
            Tic-Tac-Toe Arena
          </h1>
          <p className="font-body text-surface-a50">
            Stake Sepolia ETH and battle opponents in on-chain Tic-Tac-Toe. Winner takes all!
          </p>
        </div>

        {/* Pre-paid Gas Info Widget */}
        <div className="mb-8 bg-gradient-to-r from-primary-a0/10 to-success-a0/10 border border-primary-a20/30 rounded-2xl p-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-heading font-semibold text-lg text-primary-a40 mb-2">
                ⛽ Pre-paid Gas System
              </h3>
              <div className="flex items-center gap-6 text-sm">
                <div>
                  <span className="text-surface-a50">Cost per Move:</span>
                  <span className="ml-2 font-mono text-primary-a30">{parseFloat(gasCostInfo.moveCost).toFixed(6)} ETH</span>
                </div>
                <div>
                  <span className="text-surface-a50">Total Gas per Game:</span>
                  <span className="ml-2 font-mono text-success-a10">{parseFloat(gasCostInfo.totalGameCost).toFixed(6)} ETH</span>
                </div>
                <div className="text-surface-a50">
                  💡 Gas collected during create/join, refunded for unused moves
                </div>
              </div>
            </div>
          </div>
          
          <div className="mt-4 grid grid-cols-2 gap-4 text-xs">
            <div className="bg-surface-tonal-a10 rounded-lg p-3">
              <div className="font-semibold text-surface-a40 mb-1">Create Game</div>
              <div className="text-surface-a50">Wager + {parseFloat(gasCostInfo.totalGameCost).toFixed(6)} ETH gas</div>
            </div>
            <div className="bg-surface-tonal-a10 rounded-lg p-3">
              <div className="font-semibold text-surface-a40 mb-1">Join Game</div>
              <div className="text-surface-a50">Wager + {parseFloat(gasCostInfo.totalGameCost).toFixed(6)} ETH gas</div>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Left: Create Game */}
          <div className="lg:col-span-1">
            <div className="bg-surface-tonal-a10 border border-surface-tonal-a20 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <Plus className="w-5 h-5 text-primary-a30" />
                <h2 className="font-heading font-semibold text-lg text-primary-a40">
                  Create New Game
                </h2>
              </div>

              {!showCreateForm ? (
                <button
                  onClick={() => setShowCreateForm(true)}
                  className="w-full flex items-center justify-center gap-2 px-6 py-3 bg-primary-a0 hover:bg-primary-a10 text-white rounded-xl font-label font-semibold transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Create Game
                </button>
              ) : (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-primary-a40 mb-2">
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
                      className="flex-1 px-4 py-2 bg-primary-a0 hover:bg-primary-a10 disabled:bg-surface-tonal-a20 disabled:text-surface-a40 disabled:cursor-not-allowed text-white rounded-lg font-label font-semibold transition-colors"
                    >
                      {loading ? 'Creating...' : 'Create'}
                    </button>
                    <button
                      onClick={() => {
                        setShowCreateForm(false);
                        setWagerAmount('');
                      }}
                      className="px-4 py-2 bg-surface-tonal-a20 hover:bg-surface-tonal-a30 text-surface-a40 rounded-lg font-label font-semibold transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* My Games */}
            <div className="bg-surface-tonal-a10 border border-surface-tonal-a20 rounded-2xl p-6 mt-6">
              <div className="flex items-center gap-3 mb-6">
                <Trophy className="w-5 h-5 text-primary-a30" />
                <h2 className="font-heading font-semibold text-lg text-primary-a40">
                  My Games
                </h2>
              </div>

              {games.length === 0 ? (
                <p className="text-surface-a40 text-center py-8">
                  No games yet. Create one or join an existing game!
                </p>
              ) : (
                <div className="space-y-3">
                  {games.map((game) => (
                    <div
                      key={game.id}
                      className="bg-surface-tonal-a0 border border-surface-tonal-a20 rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-label text-sm font-semibold text-primary-a40">
                          Game #{game.id}
                        </span>
                        <span className={`text-xs px-2 py-1 rounded-full font-label ${
                          game.status === 'Active' ? 'bg-success-a0/20 text-success-a10' :
                          game.status.includes('Won') ? 'bg-primary-a0/20 text-primary-a30' :
                          'bg-surface-a40/20 text-surface-a40'
                        }`}>
                          {game.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-surface-a50">
                        <span>Wager: {game.wager} ETH</span>
                        {game.player2 && game.player2 !== ethers.ZeroAddress ? (
                          <span>vs {formatAddress(game.player2)}</span>
                        ) : (
                          <span>Waiting for opponent</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Right: Available Games */}
          <div className="lg:col-span-2">
            <div className="bg-surface-tonal-a10 border border-surface-tonal-a20 rounded-2xl p-6">
              <div className="flex items-center gap-3 mb-6">
                <Users className="w-5 h-5 text-primary-a30" />
                <h2 className="font-heading font-semibold text-lg text-primary-a40">
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
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {availableGames.map((game) => (
                    <div
                      key={game.id}
                      className="bg-surface-tonal-a0 border border-surface-tonal-a20 rounded-lg p-4 hover:border-primary-a20 transition-colors"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="font-label text-sm font-semibold text-primary-a40">
                          Game #{game.id}
                        </span>
                        <div className="flex items-center gap-1 text-xs text-surface-a50">
                          <Clock className="w-3 h-3" />
                          {Math.floor((Date.now() / 1000 - game.lastMoveTime) / 60)}m ago
                        </div>
                      </div>
                      
                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-xs text-surface-a50">Host:</span>
                          <span className="text-xs font-mono text-primary-a30">
                            {formatAddress(game.player1)}
                          </span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-surface-a50">Wager:</span>
                          <span className="text-sm font-semibold text-primary-a40">
                            {game.wager} ETH
                          </span>
                        </div>
                      </div>

                      <button
                        onClick={() => handleJoinGame(game.id)}
                        disabled={loading || isMyGame(game.player1, game.player2)}
                        className="w-full px-4 py-2 bg-success-a0 hover:bg-success-a10 disabled:bg-surface-tonal-a20 disabled:text-surface-a40 disabled:cursor-not-allowed text-white rounded-lg font-label font-semibold transition-colors"
                      >
                        {isMyGame(game.player1, game.player2) ? 'Your Game' : 'Join Game'}
                      </button>
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
