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
        <div className="w-20 h-20 rounded-2xl bg-surface-tonal-a10 border border-surface-tonal-a20 flex items-center justify-center">
          <Gamepad2 className="w-10 h-10 text-primary-a30" />
        </div>

        {/* Title */}
        <div className="text-center">
          <h1 className="font-heading font-bold text-5xl md:text-7xl gradient-text">
            TicTacToe Arena
          </h1>
          <p className="mt-4 text-surface-a40 font-body text-lg max-w-md mx-auto">
            Wager-based Tic-Tac-Toe gaming on the blockchain
          </p>
        </div>

        {/* Connect button */}
        <button
          className="px-10 py-4 bg-primary-a0 hover:bg-primary-a10 text-white rounded-xl font-label font-semibold text-lg transition-all hover:shadow-[0_0_24px_rgba(119,85,170,0.3)] border-2 border-primary-a30 hover:border-primary-a20"
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
