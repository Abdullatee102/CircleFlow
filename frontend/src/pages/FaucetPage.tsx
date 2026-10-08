import React, { useState } from 'react';
import { useAccount, useWriteContract } from 'wagmi';
import { Card } from '../components/common/Card';
import { Button } from '../components/common/Button';
import { AlertBanner } from '../components/common/AlertBanner';
import { TransactionModal, TxStep } from '../components/common/TransactionModal';
import { useCFTBalance, useHasClaimedFaucet } from '../hooks/useCircleFlow';
import {
  CIRCLEFLOW_TOKEN_ADDRESS,
  TOKEN_ABI,
  EXPLORER_URL,
  formatCFT,
} from '../config/contracts';
import { parseContractError, ParsedContractError } from '../errors/contractErrors';
import { Droplets, CheckCircle2, AlertCircle, Coins, ExternalLink } from 'lucide-react';

export const FaucetPage: React.FC = () => {
  const { address, isConnected } = useAccount();
  const { data: balance, refetch: refetchBalance } = useCFTBalance(address);
  const { data: hasClaimed, refetch: refetchClaimed } = useHasClaimedFaucet(address);

  const { writeContractAsync } = useWriteContract();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [txStep, setTxStep] = useState<TxStep>('idle');
  const [txHash, setTxHash] = useState<`0x${string}` | undefined>(undefined);
  const [parsedError, setParsedError] = useState<ParsedContractError | null>(null);

  const handleClaim = async () => {
    if (!address) return;
    try {
      setTxStep('preparing');
      setParsedError(null);

      setTxStep('waiting_wallet');
      const hash = await writeContractAsync({
        address: CIRCLEFLOW_TOKEN_ADDRESS,
        abi: TOKEN_ABI,
        functionName: 'faucet',
      });

      setTxHash(hash);
      setTxStep('confirming');

      await new Promise((r) => setTimeout(r, 6000));
      await Promise.all([refetchBalance(), refetchClaimed()]);
      setTxStep('confirmed');
    } catch (err: any) {
      console.error(err);
      setParsedError(parseContractError(err));
      setTxStep('failed');
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-10 space-y-8">
      {/* Page Title */}
      <div className="text-center space-y-2">
        <div className="w-14 h-14 mx-auto rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
          <Droplets className="w-7 h-7" />
        </div>
        <h1 className="text-3xl font-black text-slate-100 tracking-tight">
          CFT Token Faucet
        </h1>
        <p className="text-xs sm:text-sm text-slate-400 max-w-md mx-auto">
          Claim 1,000 CFT to participate in savings circles, commit security collateral, and test rotating payouts.
        </p>
      </div>

      {!isConnected && (
        <AlertBanner
          type="info"
          title="Connect Wallet"
          message="Connect your wallet to claim your one-time 1,000 CFT allocation."
        />
      )}

      {/* Main Faucet Card */}
      <Card className="space-y-6 border-sky-500/20 bg-slate-900/40">
        <div className="p-4 bg-slate-950/60 rounded-2xl border border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Coins className="w-8 h-8 text-emerald-400" />
            <div>
              <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold block">
                Current CFT Balance
              </span>
              <span className="text-lg font-mono font-bold text-slate-100">
                {formatCFT(balance as bigint | undefined)}
              </span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[11px] text-slate-400 uppercase tracking-wider font-semibold block">
              Faucet Allotment
            </span>
            <span className="text-lg font-mono font-bold text-sky-400">
              1,000 CFT
            </span>
          </div>
        </div>

        {hasClaimed ? (
          <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800 text-center space-y-2">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
            <h4 className="font-bold text-slate-200 text-sm">Faucet Already Claimed</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto leading-relaxed">
              You have already claimed your 1,000 CFT test allocation from this wallet. You can use your balance to create or join circles!
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <p className="text-xs text-slate-400 leading-relaxed text-center">
              Each wallet can claim up to 1,000 CFT once. Transactions require a small amount of testnet Sepolia ETH for gas.
            </p>
            <Button
              size="lg"
              variant="primary"
              onClick={() => {
                setTxStep('idle');
                setIsModalOpen(true);
              }}
              disabled={!isConnected}
              className="w-full"
            >
              Claim 1,000 CFT
            </Button>
          </div>
        )}

        <div className="pt-4 border-t border-slate-800/80 text-[11px] text-slate-500 flex items-center justify-between">
          <span>Contract: {CIRCLEFLOW_TOKEN_ADDRESS}</span>
          <a
            href={`${EXPLORER_URL}/address/${CIRCLEFLOW_TOKEN_ADDRESS}`}
            target="_blank"
            rel="noreferrer"
            className="text-emerald-400 hover:text-emerald-300 underline inline-flex items-center gap-1 font-sans"
          >
            Etherscan <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </Card>

      {/* Transaction Modal */}
      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Claim Faucet Tokens"
        actionSummary={{
          what: 'Mint 1,000 CFT test tokens directly to your connected wallet',
          why: 'Provides test tokens for CircleFlow rotating savings cycles on Ethereum Sepolia.',
        }}
        step={txStep}
        txHash={txHash}
        error={parsedError}
        onConfirm={handleClaim}
        confirmLabel="Confirm Faucet Claim"
      />
    </div>
  );
};

