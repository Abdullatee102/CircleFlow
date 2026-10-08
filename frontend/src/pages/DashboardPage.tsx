import React from 'react';
import { Link } from 'react-router-dom';
import { useAccount } from 'wagmi';
import { modal } from '../config/wagmi';
import { useAllCircles, useCFTBalance, CircleGroupData } from '../hooks/useCircleFlow';
import { CircleCard } from '../components/circle/CircleCard';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import { formatCFT, formatAddress } from '../config/contracts';
import {
  Wallet,
  PlusCircle,
  Droplets,
  Coins,
  ShieldCheck,
  RotateCcw,
  Sparkles,
  Layers,
} from 'lucide-react';

export const DashboardPage: React.FC = () => {
  const { address, isConnected } = useAccount();
  const { data: cftBalance, isLoading: isBalanceLoading } = useCFTBalance(address);
  const { data: allCircles, isLoading: isCirclesLoading, refetch: refetchCircles } = useAllCircles();

  const formingCircles = (allCircles || []).filter((c: CircleGroupData) => c.status === 1);
  const activeCircles = (allCircles || []).filter((c: CircleGroupData) => c.status === 2);
  const completedCircles = (allCircles || []).filter((c: CircleGroupData) => c.status === 3);

  return (
    <div className="space-y-10 py-6 max-w-7xl mx-auto">
      {/* Top Welcome / Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-6 border-b border-slate-800/80">
        <div>
          <h1 className="text-2xl sm:text-3xl font-black text-slate-100 tracking-tight">
            Dashboard
          </h1>
          <p className="text-xs sm:text-sm text-slate-400 mt-1">
            Real-time on-chain rotating savings circles and position status on Ethereum Sepolia.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link to="/groups/create">
            <Button size="md" variant="primary">
              <PlusCircle className="w-4 h-4 mr-1" /> Create Circle
            </Button>
          </Link>
          <Link to="/faucet">
            <Button size="md" variant="outline">
              <Droplets className="w-4 h-4 mr-1 text-sky-400" /> Get CFT
            </Button>
          </Link>
        </div>
      </div>

      {/* Account Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Wallet Address Card */}
        <Card className="bg-slate-900/40">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-semibold uppercase tracking-wider">Connected Wallet</span>
            <Wallet className="w-4 h-4 text-emerald-400" />
          </div>
          {isConnected ? (
            <div className="font-mono text-base font-bold text-slate-100 truncate">
              {formatAddress(address || '')}
            </div>
          ) : (
            <button
              onClick={() => modal.open()}
              className="text-xs font-semibold text-emerald-400 hover:underline"
            >
              Connect Wallet
            </button>
          )}
          <span className="text-[11px] text-slate-500 block mt-1">Network: Ethereum Sepolia</span>
        </Card>

        {/* CFT Balance Card */}
        <Card className="bg-slate-900/40">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-semibold uppercase tracking-wider">CFT Balance</span>
            <Coins className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="font-mono text-base font-bold text-slate-100">
            {isBalanceLoading ? 'Loading...' : formatCFT(cftBalance as bigint | undefined)}
          </div>
          <span className="text-[11px] text-slate-500 block mt-1">Available for savings & reserve</span>
        </Card>

        {/* Active Circles Card */}
        <Card className="bg-slate-900/40">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-semibold uppercase tracking-wider">Active Circles</span>
            <RotateCcw className="w-4 h-4 text-sky-400" />
          </div>
          <div className="font-mono text-base font-bold text-sky-400">
            {activeCircles.length}
          </div>
          <span className="text-[11px] text-slate-500 block mt-1">Currently rotating rounds</span>
        </Card>

        {/* Forming Circles Card */}
        <Card className="bg-slate-900/40">
          <div className="flex items-center justify-between text-xs text-slate-400 mb-2">
            <span className="font-semibold uppercase tracking-wider">Forming Circles</span>
            <Layers className="w-4 h-4 text-amber-400" />
          </div>
          <div className="font-mono text-base font-bold text-amber-300">
            {formingCircles.length}
          </div>
          <span className="text-[11px] text-slate-500 block mt-1">Accepting members & collateral</span>
        </Card>
      </div>

      {/* Active Circles Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-emerald-400" />
              Active Savings Circles ({activeCircles.length})
            </h2>
            <p className="text-xs text-slate-400">
              Circles currently running live contribution and payout rotations.
            </p>
          </div>
        </div>

        {activeCircles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {activeCircles.map((circle) => (
              <CircleCard key={circle.id.toString()} group={circle} userAddress={address} />
            ))}
          </div>
        ) : (
          <Card className="text-center py-12 space-y-3 bg-slate-950/40 border-dashed border-slate-800">
            <RotateCcw className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="font-bold text-slate-300 text-sm">No Active Circles</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              There are currently no active rotating circles on Sepolia. Check forming circles or create a new cycle!
            </p>
          </Card>
        )}
      </section>

      {/* Forming Circles Section */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
              <Layers className="w-5 h-5 text-amber-400" />
              Forming Circles ({formingCircles.length})
            </h2>
            <p className="text-xs text-slate-400">
              Circles currently gathering members and security reserve commitments before activation.
            </p>
          </div>
        </div>

        {formingCircles.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {formingCircles.map((circle) => (
              <CircleCard key={circle.id.toString()} group={circle} userAddress={address} />
            ))}
          </div>
        ) : (
          <Card className="text-center py-12 space-y-3 bg-slate-950/40 border-dashed border-slate-800">
            <Sparkles className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="font-bold text-slate-300 text-sm">No Forming Circles</h3>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              Be the first to create a new circle! Select 3, 4, or 5 members and configure your contribution terms.
            </p>
            <div className="pt-2">
              <Link to="/groups/create">
                <Button size="sm" variant="primary">
                  Create a Circle Now
                </Button>
              </Link>
            </div>
          </Card>
        )}
      </section>

      {/* Completed Circles Section */}
      {completedCircles.length > 0 && (
        <section className="space-y-4">
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-slate-400" />
            Completed Circles ({completedCircles.length})
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {completedCircles.map((circle) => (
              <CircleCard key={circle.id.toString()} group={circle} userAddress={address} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
};

