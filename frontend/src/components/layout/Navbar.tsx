import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAccount, useChainId, useSwitchChain } from 'wagmi';
import { modal } from '../../config/wagmi';
import { useCFTBalance } from '../../hooks/useCircleFlow';
import { CHAIN_ID, formatCFT } from '../../config/contracts';
import { Coins, PlusCircle, LayoutDashboard, Droplets, AlertTriangle } from 'lucide-react';
import { Button } from '../common/Button';

export const Navbar: React.FC = () => {
  const location = useLocation();
  const { address, isConnected } = useAccount();
  const chainId = useChainId();
  const { switchChain } = useSwitchChain();
  const { data: cftBalance } = useCFTBalance(address);

  const isWrongNetwork = isConnected && chainId !== CHAIN_ID;

  const navLinks = [
    { name: 'Dashboard', path: '/dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { name: 'Create Circle', path: '/groups/create', icon: <PlusCircle className="w-4 h-4" /> },
    { name: 'CFT Faucet', path: '/faucet', icon: <Droplets className="w-4 h-4" /> },
  ];

  return (
    <header className="sticky top-0 z-40 bg-slate-950/80 backdrop-blur-xl border-b border-slate-800/80">
      {isWrongNetwork && (
        <div className="bg-rose-500/20 border-b border-rose-500/30 text-rose-300 px-4 py-2 text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-400" />
            <span>CircleFlow currently runs on Ethereum Sepolia (Chain ID 11155111).</span>
          </div>
          <button
            onClick={() => switchChain?.({ chainId: CHAIN_ID })}
            className="font-bold underline hover:text-white"
          >
            Switch to Sepolia
          </button>
        </div>
      )}

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand */}
        <Link to="/" className="flex items-center gap-3 group">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-emerald-500 to-teal-400 flex items-center justify-center text-slate-950 font-black shadow-lg shadow-emerald-500/20 group-hover:scale-105 transition-transform">
            <Coins className="w-5 h-5 text-slate-950" />
          </div>
          <div>
            <span className="font-extrabold text-base tracking-tight text-white flex items-center gap-1.5">
              CircleFlow
              <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                Sepolia
              </span>
            </span>
            <span className="text-[11px] text-slate-400 block -mt-0.5">Rotating Savings Protocol</span>
          </div>
        </Link>

        {/* Nav Links */}
        <nav className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => {
            const isActive = location.pathname === link.path;
            return (
              <Link
                key={link.path}
                to={link.path}
                className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                  isActive
                    ? 'bg-slate-800 text-white'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                }`}
              >
                {link.icon}
                <span>{link.name}</span>
              </Link>
            );
          })}
        </nav>

        {/* Right Section: Balance & Wallet */}
        <div className="flex items-center gap-3">
          {isConnected && (
            <Link
              to="/faucet"
              className="hidden sm:flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5 hover:border-slate-700 transition"
              title="Click to get more CFT test tokens"
            >
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-xs text-slate-400 font-medium">Balance:</span>
              <span className="text-xs font-bold text-slate-100 font-mono">
                {formatCFT(cftBalance as bigint | undefined)}
              </span>
            </Link>
          )}

          <Button
            size="sm"
            variant={isConnected ? 'outline' : 'primary'}
            onClick={() => modal.open()}
            className="text-xs"
          >
            {isConnected
              ? `${address?.slice(0, 6)}...${address?.slice(-4)}`
              : 'Connect Wallet'}
          </Button>
        </div>
      </div>
    </header>
  );
};

