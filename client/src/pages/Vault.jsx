import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { toast } from 'react-toastify';
import { ethers } from 'ethers';
import {
  Trophy,
  Loader2,
  ExternalLink,
  Clock,
  Users,
  Gamepad2,
  Inbox,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react';
import { useGame } from '../hooks/useGame';
import { useWeb3Context } from '../contexts/useWeb3Context';
import Pagination from '../components/Pagination';

const PAGE_SIZE = 5;

const Vault = () => {
  const { web3State } = useWeb3Context();
  const { selectedAccount } = web3State;
  const { games, loading, fetchPlayerGames } = useGame();
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(games.length / PAGE_SIZE));
  const startIdx = (currentPage - 1) * PAGE_SIZE;
  const pageGames = games.slice(startIdx, startIdx + PAGE_SIZE);

  useEffect(() => {
    if (selectedAccount) {
      fetchPlayerGames();
    }
  }, [selectedAccount, fetchPlayerGames]);

  const formatAddress = (address) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString();
  };

  const getTimeAgo = (timestamp) => {
    const seconds = Math.floor(Date.now() / 1000 - timestamp);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days} day${days > 1 ? 's' : ''} ago`;
    if (hours > 0) return `${hours} hour${hours > 1 ? 's' : ''} ago`;
    if (minutes > 0) return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
    return 'Just now';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'Player1Won':
      case 'Player2Won':
        return <Trophy className="w-4 h-4 text-warning-a0" />;
      case 'Draw':
        return <AlertCircle className="w-4 h-4 text-surface-a40" />;
      case 'Active':
        return <Gamepad2 className="w-4 h-4 text-success-a10" />;
      default:
        return <Clock className="w-4 h-4 text-surface-a40" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'Player1Won':
      case 'Player2Won':
        return 'text-warning-a0 bg-warning-a0/10';
      case 'Draw':
        return 'text-surface-a40 bg-surface-a40/10';
      case 'Active':
        return 'text-success-a10 bg-success-a10/10';
      default:
        return 'text-surface-a40 bg-surface-a40/10';
    }
  };

  const isWinner = (game) => {
    if (!selectedAccount) return false;
    if (game.status === 'Player1Won' && game.player1.toLowerCase() === selectedAccount.toLowerCase()) return true;
    if (game.status === 'Player2Won' && game.player2.toLowerCase() === selectedAccount.toLowerCase()) return true;
    return false;
  };

  const isMyGame = (game) => {
    if (!selectedAccount) return false;
    return game.player1.toLowerCase() === selectedAccount.toLowerCase() || 
           game.player2.toLowerCase() === selectedAccount.toLowerCase();
  };

  const totalWagered = games.reduce((sum, game) => sum + parseFloat(game.wager), 0);
  const totalWon = games.filter(game => isWinner(game)).reduce((sum, game) => sum + parseFloat(game.wager), 0);
  const winRate = games.filter(game => game.status.includes('Won') && isMyGame(game)).length > 0 
    ? (games.filter(game => isWinner(game)).length / games.filter(game => game.status.includes('Won') && isMyGame(game)).length * 100)
    : 0;

  return (
    <div className="flex-1 px-6 md:px-10 py-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="font-heading font-bold text-4xl accent-text mb-2">
            My Games
          </h1>
          <p className="font-body text-gray-400 text-lg">
            {games.length === 0
              ? 'You haven\'t played any games yet.'
              : `${games.length} game${games.length === 1 ? '' : 's'} played on-chain`}
          </p>
        </div>

        {/* Stats Cards */}
        {games.length > 0 && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
            <div className="skeleton-card">
              <div className="flex items-center gap-3">
                <TrendingUp className="w-5 h-5 text-accent" />
                <div>
                  <p className="text-xs text-gray-500">Total Wagered</p>
                  <p className="text-lg font-semibold accent-text">{totalWagered.toFixed(4)} ETH</p>
                </div>
              </div>
            </div>
            <div className="skeleton-card">
              <div className="flex items-center gap-3">
                <Trophy className="w-5 h-5 text-warning" />
                <div>
                  <p className="text-xs text-gray-500">Total Won</p>
                  <p className="text-lg font-semibold text-warning">{totalWon.toFixed(4)} ETH</p>
                </div>
              </div>
            </div>
            <div className="skeleton-card">
              <div className="flex items-center gap-3">
                <CheckCircle2 className="w-5 h-5 text-success" />
                <div>
                  <p className="text-xs text-gray-500">Win Rate</p>
                  <p className="text-lg font-semibold text-success">{winRate.toFixed(1)}%</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Loading skeleton */}
        {loading && pageGames.length === 0 && (
          <div className="space-y-4">
            {[1, 2, 3].map((i) => (
              <div
                key={i}
                className="bg-surface-tonal-a10 border border-surface-tonal-a20 rounded-2xl p-6 animate-pulse"
              >
                <div className="flex gap-4">
                  <div className="w-12 h-12 bg-surface-tonal-a20 rounded-xl flex-shrink-0" />
                  <div className="flex-1 space-y-3">
                    <div className="h-4 bg-surface-tonal-a20 rounded w-1/3" />
                    <div className="h-3 bg-surface-tonal-a20 rounded w-2/3" />
                    <div className="h-3 bg-surface-tonal-a20 rounded w-1/2" />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Empty state */}
        {!loading && games.length === 0 && (
          <div className="bg-surface-tonal-a10 border border-surface-tonal-a20 rounded-2xl p-16 text-center">
            <Inbox className="w-12 h-12 mx-auto mb-4 text-surface-a40" />
            <h3 className="font-heading font-semibold text-lg text-primary-a40 mb-2">
              No games yet
            </h3>
            <p className="font-body text-sm text-surface-a50 mb-6">
              Start playing Tic-Tac-Toe to build your game history.
            </p>
            <Link
              to="/lobby"
              className="inline-flex items-center gap-2 px-6 py-3 bg-primary-a0 hover:bg-primary-a10 text-white rounded-xl font-label font-semibold transition-colors"
            >
              <Gamepad2 className="w-4 h-4" />
              Go to Lobby
            </Link>
          </div>
        )}

        {/* Game cards */}
        {!loading && pageGames.length > 0 && (
          <div className="space-y-4">
            {pageGames.map((game) => (
              <div
                key={game.id}
                className="skeleton-card hover:transform hover:scale-102 transition-all"
              >
                <div className="flex flex-col md:flex-row gap-5">
                  {/* Game Icon */}
                  <div className="md:w-16 w-full flex-shrink-0">
                    <div className={`w-16 h-16 rounded-xl flex items-center justify-center ${getStatusColor(game.status)}`}>
                      {getStatusIcon(game.status)}
                    </div>
                  </div>

                  {/* Game Info */}
                  <div className="flex-1 flex flex-col justify-between min-w-0">
                    <div>
                      <div className="flex items-center gap-2 mb-3">
                        <Trophy className="w-4 h-4 text-accent" />
                        <h3 className="font-heading font-semibold text-base accent-text">
                          Game #{game.id}
                        </h3>
                        <span className={`status-badge ${
                          game.status === 'Active' ? 'status-active' :
                          game.status.includes('Won') ? 'status-completed' :
                          'status-waiting'
                        }`}>
                          {game.status}
                        </span>
                        {isWinner(game) && (
                          <span className="px-2 py-1 rounded-full text-xs font-label bg-success-a10/20 text-success-a10">
                            You Won!
                          </span>
                        )}
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                        <div className="flex items-center gap-2">
                          <Users className="w-3 h-3 text-gray-400" />
                          <span className="text-xs text-gray-500">Players:</span>
                          <span className="text-xs font-mono accent-text">
                            {formatAddress(game.player1)} vs {game.player2 && game.player2 !== ethers.ZeroAddress ? formatAddress(game.player2) : 'Waiting...'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Trophy className="w-3 h-3 text-warning" />
                          <span className="text-xs text-gray-500">Wager:</span>
                          <span className="text-xs font-semibold text-warning">{game.wager} ETH</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <Clock className="w-3 h-3 text-gray-400" />
                          <span className="text-xs text-gray-500">Last move:</span>
                          <span className="text-xs accent-text">{getTimeAgo(game.lastMoveTime)}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <ExternalLink className="w-3 h-3 text-gray-400" />
                          <span className="text-xs text-gray-500">Created:</span>
                          <span className="text-xs accent-text">{formatTime(game.lastMoveTime)}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="flex flex-wrap gap-2 mt-4">
                      {game.status === 'Active' && (
                        <Link
                          to={`/game/${game.id}`}
                          className="px-3 py-2 skeleton-button text-success font-label text-xs font-semibold"
                        >
                          Continue Playing
                        </Link>
                      )}
                      <Link
                        to={`/game/${game.id}`}
                        className="px-3 py-2 skeleton-button text-warning font-label text-xs"
                      >
                        View Details
                      </Link>
                      <a
                        href={`https://sepolia.etherscan.io/address/${game.player1}`}
                        target="_blank"
                        rel="noreferrer"
                        className="flex items-center gap-1 px-3 py-2 skeleton-button text-info font-label text-xs"
                      >
                        <ExternalLink className="w-3 h-3" />
                        Etherscan
                      </a>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Loading overlay during page change */}
        {loading && pageGames.length > 0 && (
          <div className="flex justify-center py-4">
            <Loader2 className="w-6 h-6 text-primary-a30 animate-spin" />
          </div>
        )}

        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
};

export default Vault;
