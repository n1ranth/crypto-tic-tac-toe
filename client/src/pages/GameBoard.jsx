import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { ethers } from 'ethers';
import { ArrowLeft, Clock, Trophy, AlertTriangle } from 'lucide-react';
import { useGame } from '../hooks/useGame';
import { useWeb3Context } from '../contexts/useWeb3Context';

const GameBoard = () => {
  const { gameId } = useParams();
  const navigate = useNavigate();
  const { web3State } = useWeb3Context();
  const { selectedAccount } = web3State;
  const { 
    currentGame, 
    loading, 
    makeMove, 
    claimTimeout, 
    fetchGameDetails, 
    isMyTurn: checkMyTurn 
  } = useGame();
  
  const [myTurn, setMyTurn] = useState(false);
  const [timeUntilTimeout, setTimeUntilTimeout] = useState(null);

  useEffect(() => {
    if (gameId) {
      fetchGameDetails(gameId);
    }
  }, [gameId, fetchGameDetails]);

  useEffect(() => {
    if (currentGame && selectedAccount) {
      checkTurnStatus();
      const interval = setInterval(checkTurnStatus, 5000); // Check every 5 seconds
      return () => clearInterval(interval);
    }
  }, [currentGame, selectedAccount]);

  const checkTurnStatus = async () => {
    if (!currentGame || !selectedAccount) return;
    
    const isMyTurn = await checkMyTurn(gameId);
    setMyTurn(isMyTurn);
    
    // Calculate time until timeout
    if (currentGame.status === 'Active') {
      const now = Date.now() / 1000;
      const lastMoveTime = currentGame.lastMoveTime || now;
      const timeSinceLastMove = now - lastMoveTime;
      const timeoutDuration = 5 * 60; // 5 minutes
      const remainingTime = Math.max(0, timeoutDuration - timeSinceLastMove);
      
      console.log('Timer debug:', { 
        now, 
        lastMoveTime, 
        timeSinceLastMove, 
        remainingTime,
        status: currentGame.status 
      });
      
      setTimeUntilTimeout(remainingTime);
    }
  };

  const handleCellClick = async (index) => {
    // Debug logging
    console.log('Cell click:', { index, myTurn, loading, board: currentGame?.board });
    
    if (!currentGame || !currentGame.board) {
      toast.error('Game not loaded properly');
      return;
    }
    
    if (!myTurn || loading) {
      if (!myTurn) toast.error("It's not your turn!");
      return;
    }
    
    const cellValue = currentGame.board[index];
    console.log('Cell value:', cellValue, 'Type:', typeof cellValue);
    
    // Handle both string and number representations
    const numValue = Number(cellValue);
    if (numValue !== 0) {
      toast.error('Cell already taken!');
      return;
    }

    await makeMove(gameId, index);
  };

  const handleClaimTimeout = async () => {
    if (timeUntilTimeout > 0) {
      toast.error(`Timeout not available yet. Wait ${Math.ceil(timeUntilTimeout / 60)} more minutes.`);
      return;
    }
    
    await claimTimeout(gameId);
  };

  const formatAddress = (address) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatTime = (seconds) => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  const getPlayerSymbol = (index) => {
    const value = currentGame.board[index];
    console.log('Getting symbol for cell', index, 'value:', value, 'type:', typeof value);
    
    // Handle both string and number representations
    const numValue = Number(value);
    if (numValue === 0) return '';
    if (numValue === 1) return 'X';
    if (numValue === 2) return 'O';
    return '';
  };

  const getCellStyle = (index) => {
    const value = currentGame.board[index];
    let baseStyle = "w-24 h-24 border-2 border-surface-tonal-a30 rounded-lg flex items-center justify-center text-2xl font-bold transition-all cursor-pointer ";
    
    // Handle both string and number representations
    const numValue = Number(value);
    
    if (numValue === 0) {
      baseStyle += myTurn ? "hover:border-primary-a20 hover:bg-surface-tonal-a0 " : "hover:border-surface-tonal-a40 ";
    } else if (numValue === 1) {
      baseStyle += "text-primary-a30 bg-primary-a0/10 ";
    } else if (numValue === 2) {
      baseStyle += "text-success-a10 bg-success-a0/10 ";
    }
    
    return baseStyle;
  };

  const isGameOver = currentGame && currentGame.status !== 'Active';
  const isWinner = currentGame && (
    (currentGame.status === 'Player1Won' && currentGame.player1.toLowerCase() === selectedAccount?.toLowerCase()) ||
    (currentGame.status === 'Player2Won' && currentGame.player2.toLowerCase() === selectedAccount?.toLowerCase())
  );

  if (!currentGame) {
    return (
      <div className="flex-1 px-6 md:px-10 py-8">
        <div className="max-w-4xl mx-auto text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-a30 mx-auto mb-4"></div>
          <p className="text-surface-a50">Loading game...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 px-6 md:px-10 py-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => navigate('/lobby')}
            className="flex items-center gap-2 text-surface-a50 hover:text-primary-a30 mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Lobby
          </button>
          
          <div className="flex items-center justify-between">
            <div>
              <h1 className="font-heading font-bold text-3xl text-primary-a40 mb-2">
                Game #{gameId}
              </h1>
              <div className="flex items-center gap-4 text-sm text-surface-a50">
                <span>Wager: {currentGame.wager} ETH</span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {formatTime(timeUntilTimeout || 0)}
                </span>
              </div>
            </div>
            
            <div className={`px-4 py-2 rounded-lg font-label font-semibold ${
              isGameOver ? (
                isWinner ? 'bg-success-a0/20 text-success-a10' : 'bg-danger-a0/20 text-danger-a10'
              ) : myTurn ? 'bg-primary-a0/20 text-primary-a30' : 'bg-surface-a40/20 text-surface-a40'
            }`}>
              {isGameOver ? (
                isWinner ? 'You Won! 🎉' : currentGame.status === 'Draw' ? 'Draw' : 'You Lost'
              ) : myTurn ? 'Your Turn' : "Opponent's Turn"}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Game Board */}
          <div className="lg:col-span-2">
            <div className="bg-surface-tonal-a10 border border-surface-tonal-a20 rounded-2xl p-8">
              <div className="grid grid-cols-3 gap-3 max-w-sm mx-auto mb-6">
                {currentGame.board.map((cell, index) => (
                  <button
                    key={index}
                    onClick={() => handleCellClick(index)}
                    disabled={isGameOver || !myTurn || loading}
                    className={getCellStyle(index)}
                  >
                    {getPlayerSymbol(index)}
                  </button>
                ))}
              </div>

              {/* Game Status */}
              {isGameOver && (
                <div className="text-center">
                  <div className="mb-4">
                    {isWinner ? (
                      <Trophy className="w-16 h-16 mx-auto text-success-a10 mb-2" />
                    ) : (
                      <AlertTriangle className="w-16 h-16 mx-auto text-danger-a10 mb-2" />
                    )}
                    <p className="text-lg font-semibold text-primary-a40">
                      {currentGame.status === 'Draw' ? "It's a Draw!" : 
                       isWinner ? 'Congratulations! You won!' : 'Better luck next time!'}
                    </p>
                  </div>
                  <button
                    onClick={() => navigate('/lobby')}
                    className="px-6 py-3 bg-primary-a0 hover:bg-primary-a10 text-white rounded-xl font-label font-semibold transition-colors"
                  >
                    Back to Lobby
                  </button>
                </div>
              )}

              {/* Timeout Claim Button */}
              {!isGameOver && !myTurn && timeUntilTimeout !== null && timeUntilTimeout <= 0 && (
                <div className="text-center">
                  <button
                    onClick={handleClaimTimeout}
                    disabled={loading}
                    className="px-6 py-3 bg-warning-a0 hover:bg-warning-a10 text-white rounded-xl font-label font-semibold transition-colors"
                  >
                    {loading ? 'Claiming...' : 'Claim Timeout (Opponent AFK)'}
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Game Info */}
          <div className="lg:col-span-1">
            <div className="bg-surface-tonal-a10 border border-surface-tonal-a20 rounded-2xl p-6">
              <h2 className="font-heading font-semibold text-lg text-primary-a40 mb-4">
                Game Info
              </h2>
              
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-surface-a50 mb-1">Player 1 (X)</p>
                  <p className="font-mono text-sm text-primary-a30">
                    {formatAddress(currentGame.player1)}
                    {currentGame.player1.toLowerCase() === selectedAccount?.toLowerCase() && (
                      <span className="ml-2 text-xs bg-primary-a0/20 text-primary-a30 px-2 py-1 rounded">You</span>
                    )}
                  </p>
                </div>
                
                {currentGame.player2 && currentGame.player2 !== ethers.ZeroAddress && (
                  <div>
                    <p className="text-xs text-surface-a50 mb-1">Player 2 (O)</p>
                    <p className="font-mono text-sm text-success-a10">
                      {formatAddress(currentGame.player2)}
                      {currentGame.player2.toLowerCase() === selectedAccount?.toLowerCase() && (
                        <span className="ml-2 text-xs bg-success-a0/20 text-success-a10 px-2 py-1 rounded">You</span>
                      )}
                    </p>
                  </div>
                )}
                
                <div>
                  <p className="text-xs text-surface-a50 mb-1">Status</p>
                  <p className="text-sm font-semibold text-primary-a40">{currentGame.status}</p>
                </div>
                
                <div>
                  <p className="text-xs text-surface-a50 mb-1">Prize Pool</p>
                  <p className="text-sm font-semibold text-primary-a40">
                    {(parseFloat(currentGame.wager) * 2).toFixed(4)} ETH
                  </p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameBoard;
