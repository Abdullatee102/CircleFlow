import React from 'react';
import { Button } from './Button';
import { ExternalLink, CheckCircle2, XCircle, AlertCircle, Loader2 } from 'lucide-react';
import { EXPLORER_URL } from '../../config/contracts';
import { ParsedContractError } from '../../errors/contractErrors';

export type TxStep = 'idle' | 'preparing' | 'waiting_wallet' | 'submitted' | 'confirming' | 'confirmed' | 'failed';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  actionSummary: {
    what: string;
    why: string;
    lockedAmount?: string;
    availableAmount?: string;
    needsApproval?: boolean;
    approvalPending?: boolean;
  };
  step: TxStep;
  txHash?: `0x${string}`;
  error?: ParsedContractError | null;
  onConfirm: () => void;
  onApprove?: () => void;
  confirmLabel?: string;
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  title,
  actionSummary,
  step,
  txHash,
  error,
  onConfirm,
  onApprove,
  confirmLabel = 'Confirm in Wallet',
}) => {
  if (!isOpen) return null;

  const isPending = step === 'preparing' || step === 'waiting_wallet' || step === 'submitted' || step === 'confirming';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl relative overflow-hidden">
        {/* Top Header */}
        <div className="flex items-center justify-between pb-4 border-b border-slate-800/80">
          <h3 className="text-lg font-bold text-slate-100">{title}</h3>
          {!isPending && (
            <button
              onClick={onClose}
              className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800 transition"
            >
              ✕
            </button>
          )}
        </div>

        {/* Content depending on state */}
        <div className="py-6 space-y-4">
          {step === 'idle' && (
            <>
              <div className="bg-slate-950/60 rounded-2xl p-4 border border-slate-800/80 space-y-3">
                <div>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">What you're doing</span>
                  <p className="text-sm font-medium text-slate-200 mt-0.5">{actionSummary.what}</p>
                </div>
                <div>
                  <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Why</span>
                  <p className="text-xs text-slate-300 leading-relaxed mt-0.5">{actionSummary.why}</p>
                </div>
                {(actionSummary.lockedAmount || actionSummary.availableAmount) && (
                  <div className="pt-2 border-t border-slate-800/60 grid grid-cols-2 gap-4">
                    {actionSummary.lockedAmount && (
                      <div>
                        <span className="text-xs text-amber-400/90 font-medium">To be locked</span>
                        <p className="text-sm font-semibold text-amber-300">{actionSummary.lockedAmount}</p>
                      </div>
                    )}
                    {actionSummary.availableAmount && (
                      <div>
                        <span className="text-xs text-emerald-400/90 font-medium">Remaining available</span>
                        <p className="text-sm font-semibold text-emerald-300">{actionSummary.availableAmount}</p>
                      </div>
                    )}
                  </div>
                )}
              </div>

              {actionSummary.needsApproval && onApprove && (
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-xl p-3 text-xs text-amber-200 flex items-center justify-between gap-3">
                  <span>CFT token approval is required before completing this action.</span>
                  <Button size="sm" variant="secondary" onClick={onApprove} isLoading={actionSummary.approvalPending}>
                    Approve CFT
                  </Button>
                </div>
              )}
            </>
          )}

          {isPending && (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
                <Loader2 className="w-8 h-8 text-emerald-400 animate-spin" />
              </div>
              <div>
                <h4 className="font-semibold text-slate-100">
                  {step === 'preparing' && 'Preparing transaction...'}
                  {step === 'waiting_wallet' && 'Waiting for wallet confirmation...'}
                  {step === 'submitted' && 'Transaction submitted...'}
                  {step === 'confirming' && 'Confirming on Sepolia...'}
                </h4>
                <p className="text-xs text-slate-400 mt-1">
                  Please do not close this window while the blockchain confirmation is in progress.
                </p>
              </div>
              {txHash && (
                <a
                  href={`${EXPLORER_URL}/tx/${txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 underline"
                >
                  View on Sepolia Etherscan <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          )}

          {step === 'confirmed' && (
            <div className="text-center py-6 space-y-4">
              <div className="w-16 h-16 mx-auto rounded-full bg-emerald-500/15 flex items-center justify-center border border-emerald-500/30">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
              </div>
              <div>
                <h4 className="font-semibold text-slate-100">Transaction Confirmed!</h4>
                <p className="text-xs text-slate-300 mt-1">
                  Your transaction has been mined and finalized on Ethereum Sepolia.
                </p>
              </div>
              {txHash && (
                <a
                  href={`${EXPLORER_URL}/tx/${txHash}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 text-xs text-emerald-400 hover:text-emerald-300 underline"
                >
                  View on Sepolia Etherscan <ExternalLink className="w-3.5 h-3.5" />
                </a>
              )}
            </div>
          )}

          {step === 'failed' && (
            <div className="space-y-4 py-2">
              <div className="w-14 h-14 mx-auto rounded-full bg-rose-500/15 flex items-center justify-center border border-rose-500/30">
                <XCircle className="w-7 h-7 text-rose-400" />
              </div>
              <div className="bg-rose-500/10 border border-rose-500/30 rounded-2xl p-4 text-left space-y-2">
                <div className="flex items-center gap-2 text-rose-300 font-semibold text-sm">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{error?.title || 'Transaction Reverted'}</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">{error?.message}</p>
                {error?.action && (
                  <p className="text-xs text-emerald-300 font-medium pt-1 border-t border-rose-500/20">
                    💡 Suggested next step: {error.action}
                  </p>
                )}
              </div>
              {txHash && (
                <div className="text-center">
                  <a
                    href={`${EXPLORER_URL}/tx/${txHash}`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-200 underline"
                  >
                    View failed transaction on Etherscan <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Modal Actions */}
        <div className="pt-4 border-t border-slate-800/80 flex items-center justify-end gap-3">
          {step === 'idle' && (
            <>
              <Button variant="secondary" onClick={onClose}>
                Cancel
              </Button>
              <Button
                variant="primary"
                onClick={onConfirm}
                disabled={actionSummary.needsApproval}
              >
                {confirmLabel}
              </Button>
            </>
          )}

          {step === 'confirmed' && (
            <Button variant="primary" onClick={onClose} className="w-full">
              Done
            </Button>
          )}

          {step === 'failed' && (
            <>
              <Button variant="secondary" onClick={onClose}>
                Close
              </Button>
              <Button variant="primary" onClick={onConfirm}>
                Retry
              </Button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

