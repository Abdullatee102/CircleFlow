import React from 'react';
import { ExternalLink, ShieldCheck, Heart } from 'lucide-react';
import { CIRCLEFLOW_CONTRACT_ADDRESS, CIRCLEFLOW_TOKEN_ADDRESS, EXPLORER_URL } from '../../config/contracts';

export const Footer: React.FC = () => {
  return (
    <footer className="border-t border-slate-900 bg-slate-950 py-10 mt-20 text-xs text-slate-500">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2 text-slate-400 font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>CircleFlow Protocol — Non-Custodial Rotating Savings on Ethereum Sepolia</span>
          </div>

          <div className="flex flex-wrap items-center gap-4 text-slate-400">
            <a
              href={`${EXPLORER_URL}/address/${CIRCLEFLOW_CONTRACT_ADDRESS}`}
              target="_blank"
              rel="noreferrer"
              className="hover:text-emerald-400 transition flex items-center gap-1"
            >
              CircleFlow Contract <ExternalLink className="w-3 h-3" />
            </a>
            <span className="text-slate-800">•</span>
            <a
              href={`${EXPLORER_URL}/address/${CIRCLEFLOW_TOKEN_ADDRESS}`}
              target="_blank"
              rel="noreferrer"
              className="hover:text-emerald-400 transition flex items-center gap-1"
            >
              CFT Token Contract <ExternalLink className="w-3 h-3" />
            </a>
          </div>
        </div>

        <div className="border-t border-slate-900/80 pt-6 flex flex-col sm:flex-row items-center justify-between gap-3 text-slate-500 text-[11px]">
          <p>
            CFT and CircleFlow on Sepolia are experimental testnet software with no real-world monetary value.
          </p>
          <p className="flex items-center gap-1">
            Inspired by traditional Ajo / Esusu / ROSCA circles. Built for trustless decentralized savings.
          </p>
        </div>
      </div>
    </footer>
  );
};

