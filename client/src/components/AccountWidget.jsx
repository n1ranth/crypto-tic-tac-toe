import { useEffect, useRef, useState } from 'react';
import { useWeb3Context } from '../contexts/useWeb3Context';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import {
  ChevronDown,
  Copy,
  CheckCircle2,
  AlertCircle,
  ArrowLeftRight,
  LogOut,
  ExternalLink,
} from 'lucide-react';
import { getNetworkName, isSepolia } from '../utils/network';

const AccountWidget = () => {
  const { web3State, switchAccount, switchToSepolia, disconnect } = useWeb3Context();
  const { selectedAccount, chainId, balance } = web3State;
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const popoverRef = useRef(null);
  const triggerRef = useRef(null);
  const navigate = useNavigate();

  const onCorrectNetwork = isSepolia(chainId);
  const networkName = getNetworkName(chainId);
  const truncated = selectedAccount
    ? `${selectedAccount.slice(0, 6)}...${selectedAccount.slice(-4)}`
    : '';
  const balanceFmt = balance ? Number(balance).toFixed(4) : '0.0000';

  useEffect(() => {
    const onClickOutside = (e) => {
      if (
        popoverRef.current &&
        !popoverRef.current.contains(e.target) &&
        !triggerRef.current.contains(e.target)
      ) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, [open]);

  const copyAddress = async () => {
    try {
      await navigator.clipboard.writeText(selectedAccount);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      toast.error('Could not copy');
    }
  };

  const handleDisconnect = () => {
    disconnect();
    setOpen(false);
    navigate('/');
  };

  if (!selectedAccount) return null;

  return (
    <div className="relative">
      <button
        ref={triggerRef}
        onClick={() => setOpen((v) => !v)}
        className="w-full bg-surface-tonal-a10 hover:bg-surface-tonal-a20 border border-surface-tonal-a20 rounded-xl p-3 transition-colors text-left"
      >
        <div className="flex items-center gap-2 mb-1">
          <span
            className={`w-2 h-2 rounded-full ${
              onCorrectNetwork ? 'bg-success-a0' : 'bg-danger-a0'
            }`}
          />
          <span className="font-label text-xs text-surface-a50">{networkName}</span>
          <ChevronDown className="w-4 h-4 text-surface-a40 ml-auto" />
        </div>
        <div className="font-heading text-sm font-semibold accent-text">
          {balanceFmt} ETH
        </div>
        <div className="font-label text-xs text-gray-500 mt-1">{truncated}</div>
      </button>

      {open && (
        <div
          ref={popoverRef}
          className="absolute bottom-full mb-2 left-0 right-0 skeleton-card shadow-2xl overflow-hidden z-50"
        >
          {/* Network section */}
          <div className="p-4 border-b border-surface-tonal-a20">
            <p className="font-label text-xs text-gray-500 uppercase tracking-wider mb-2">
              Network
            </p>
            <div className="flex items-center gap-2">
              {onCorrectNetwork ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-success" />
                  <span className="font-body text-sm accent-text">{networkName}</span>
                </>
              ) : (
                <>
                  <AlertCircle className="w-4 h-4 text-danger" />
                  <span className="font-body text-sm text-danger">Wrong network</span>
                </>
              )}
            </div>
            {!onCorrectNetwork && (
              <button
                onClick={switchToSepolia}
                className="mt-3 w-full text-xs font-label font-semibold skeleton-button rounded-lg px-3 py-2"
              >
                Switch to Sepolia
              </button>
            )}
          </div>

          {/* Account section */}
          <div className="p-4 border-b border-surface-tonal-a20">
            <p className="font-label text-xs text-gray-500 uppercase tracking-wider mb-2">
              Account
            </p>
            <div className="flex items-center gap-2 mb-3">
              <span className="font-label text-xs accent-text break-all flex-1">
                {selectedAccount}
              </span>
              <button
                onClick={copyAddress}
                className="text-surface-a40 hover:text-primary-a30 transition-colors"
                title="Copy address"
              >
                {copied ? (
                  <CheckCircle2 className="w-4 h-4 text-success-a0" />
                ) : (
                  <Copy className="w-4 h-4" />
                )}
              </button>
            </div>
            <span className="font-body text-sm text-gray-400">
              Balance: <span className="accent-text font-semibold">{balanceFmt} ETH</span>
            </span>
            <a
              href={`https://sepolia.etherscan.io/address/${selectedAccount}`}
              target="_blank"
              rel="noreferrer"
              className="mt-2 inline-flex items-center gap-1 px-3 py-1 text-xs font-label skeleton-button rounded"
            >
              View on Etherscan <ExternalLink className="w-3 h-3" />
            </a>
          </div>

          {/* Actions */}
          <div className="p-2">
            <button
              onClick={() => {
                setOpen(false);
                switchAccount();
              }}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm font-label text-primary-a40 hover:bg-surface-tonal-a20 rounded-lg transition-colors"
            >
              <ArrowLeftRight className="w-4 h-4" />
              Switch Account
            </button>
            <button
              onClick={handleDisconnect}
              className="w-full flex items-center gap-3 px-3 py-2 text-sm font-label text-danger-a10 hover:bg-surface-tonal-a20 rounded-lg transition-colors"
            >
              <LogOut className="w-4 h-4" />
              Disconnect
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AccountWidget;
