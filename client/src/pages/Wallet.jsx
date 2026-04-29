import { useWeb3Context } from '../contexts/useWeb3Context';
import { connectWallet } from '../utils/connectWallet';
import { useNavigate } from 'react-router-dom';
import { useEffect } from 'react';
import { Gamepad2 } from 'lucide-react';

const Wallet = () => {
  const navigateTo = useNavigate();
  const { updateWeb3State, web3State } = useWeb3Context();
  const { selectedAccount } = web3State;

  useEffect(() => {
    if (selectedAccount) {
      navigateTo('/lobby');
    }
  }, [selectedAccount, navigateTo]);

  const handleWalletConnection = async () => {
    const result = await connectWallet();
    if (result) {
      updateWeb3State(result);
    }
  };

  return (
    <div className="min-h-screen bg-surface-a0 flex flex-col justify-center items-center relative overflow-hidden">
      {/* Subtle grid background */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#1b181f_1px,transparent_1px),linear-gradient(to_bottom,#1b181f_1px,transparent_1px)] bg-[size:6rem_4rem] opacity-40" />

      {/* Radial glow */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_600px_at_50%_300px,rgba(119,85,170,0.15),transparent)]" />

      <div className="relative z-10 flex flex-col items-center gap-12 px-4">
        {/* Logo / icon */}
        <div className="w-24 h-24 rounded-2xl bg-surface-tonal-a10 border-2 border-primary-a30/50 flex items-center justify-center transform transition-all duration-500 hover:scale-110 hover:rotate-12 hover:shadow-[0_0_40px_rgba(119,85,170,0.4)] animate-float">
          <Gamepad2 className="w-12 h-12 text-primary-a20 animate-glow" />
        </div>

        {/* Title */}
        <div className="text-center">
          <h1 className="font-heading font-bold text-5xl md:text-8xl gradient-text animate-glow animate-float">
            TicTacToe Arena
          </h1>
          <p className="mt-6 text-surface-a40 font-body text-lg max-w-md mx-auto animate-slide-in-up">
            Wager-based Tic-Tac-Toe gaming on the blockchain
          </p>
        </div>

        {/* Connect button */}
        <button
          className="px-12 py-5 bg-primary-a0 hover:bg-primary-a10 text-white rounded-xl font-label font-semibold text-lg transition-all duration-300 hover:shadow-[0_0_30px_rgba(119,85,170,0.6)] border-2 border-primary-a30 hover:border-primary-a20 transform hover:scale-105 hover:-translate-y-1 animate-zoom-in"
          onClick={handleWalletConnection}
        >
          Connect Wallet
        </button>

        {/* Subtle hint */}
        <p className="text-surface-a30 font-label text-xs">
          Requires MetaMask on Sepolia testnet
        </p>
      </div>
    </div>
  );
};

export default Wallet;
