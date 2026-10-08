import React from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/common/Button';
import { Card } from '../components/common/Card';
import {
  Coins,
  ShieldCheck,
  RotateCw,
  Lock,
  Users,
  Award,
  ArrowRight,
  Droplets,
  CheckCircle,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  return (
    <div className="space-y-24 py-8">
      {/* Hero Section */}
      <section className="text-center max-w-4xl mx-auto space-y-6 pt-10">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-xs font-semibold text-emerald-400">
          <ShieldCheck className="w-4 h-4" />
          <span>Non-Custodial Rotating Savings Protocol</span>
        </div>

        <h1 className="text-4xl sm:text-6xl font-black text-slate-100 tracking-tight leading-tight">
          Save together. <br className="hidden sm:inline" />
          Rotate fairly. <br className="hidden sm:inline" />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 to-teal-300">
            Stay protected.
          </span>
        </h1>

        <p className="text-base sm:text-lg text-slate-400 max-w-2xl mx-auto leading-relaxed">
          CircleFlow allows a small group to form an on-chain savings circle, contribute a fixed amount
          each round, and rotate the pooled payout according to a predetermined, financially secured order.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link to="/groups/create">
            <Button size="lg" variant="primary" className="w-full sm:w-auto">
              Create a Circle <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </Link>
          <Link to="/dashboard">
            <Button size="lg" variant="secondary" className="w-full sm:w-auto">
              Explore Active Circles
            </Button>
          </Link>
          <Link to="/faucet">
            <Button size="lg" variant="outline" className="w-full sm:w-auto text-slate-300">
              <Droplets className="w-4 h-4 mr-1 text-sky-400" /> Claim 1,000 CFT
            </Button>
          </Link>
        </div>

        <div className="pt-4 flex flex-wrap items-center justify-center gap-6 text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> Ethereum Sepolia Testnet
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> 0% Custodial Intermediaries
          </span>
          <span className="flex items-center gap-1.5">
            <CheckCircle className="w-3.5 h-3.5 text-emerald-500" /> 100% On-Chain State Truth
          </span>
        </div>
      </section>

      {/* Core Protocol Concepts */}
      <section className="max-w-6xl mx-auto space-y-10">
        <div className="text-center space-y-2">
          <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-100">
            How Rotating Savings Works
          </h2>
          <p className="text-sm text-slate-400 max-w-xl mx-auto">
            Inspired by ancestral Ajo, Esusu, and ROSCA traditions — upgraded with cryptographic fairness
            and automated default protection.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
              <Users className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-100">1. Form a Circle</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Circles support 3, 4, or 5 members. The creator chooses the fixed contribution per round (e.g., 100 CFT),
              standard round durations, grace periods, and late penalty fees.
            </p>
          </Card>

          <Card className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-sky-500/10 border border-sky-500/20 flex items-center justify-center text-sky-400">
              <Lock className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-100">2. Secure Collateral</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Members commit a security reserve. The reserve belongs economically to the member and determines
              which payout positions they can qualify for, protecting peers against post-payout abandonment.
            </p>
          </Card>

          <Card className="space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
              <RotateCw className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-bold text-slate-100">3. Rotate & Release</h3>
            <p className="text-xs text-slate-400 leading-relaxed">
              Every round, all active members deposit their fixed share. The scheduled recipient receives the pooled pot.
              As each round is completed, the recipient's required reserve decreases and excess becomes withdrawable!
            </p>
          </Card>
        </div>
      </section>

      {/* Security Reserve Guarantee Table */}
      <section className="max-w-4xl mx-auto bg-slate-900/40 border border-slate-800 rounded-3xl p-6 sm:p-8 space-y-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-100">
              The Security Reserve Model Explained
            </h3>
            <p className="text-xs text-slate-400">
              Why CircleFlow is NOT a loan platform and how future obligations stay protected.
            </p>
          </div>
        </div>

        <div className="text-xs text-slate-300 leading-relaxed space-y-3">
          <p>
            In traditional informal circles, the greatest vulnerability occurs when Alice receives the first pooled payout
            and disappears before fulfilling subsequent contribution rounds.
          </p>
          <p>
            CircleFlow solves this mathematically: a member receiving their payout at Position <code className="text-emerald-400 font-mono">p</code>{' '}
            must maintain a locked reserve equal to <code className="text-emerald-400 font-mono">(N - p) × contributionPerRound</code>.
          </p>
        </div>

        {/* Dynamic Reserve Example Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border border-slate-800 rounded-xl overflow-hidden">
            <thead className="bg-slate-950 text-slate-400 font-semibold border-b border-slate-800">
              <tr>
                <th className="p-3">Payout Position</th>
                <th className="p-3">Remaining Future Rounds</th>
                <th className="p-3">Example Required Reserve (100 CFT / round)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/80 font-mono">
              <tr className="hover:bg-slate-900/50">
                <td className="p-3 font-semibold text-slate-200">Position 1 (First recipient)</td>
                <td className="p-3 text-slate-400">3 rounds remaining</td>
                <td className="p-3 text-amber-400 font-bold">300 CFT</td>
              </tr>
              <tr className="hover:bg-slate-900/50">
                <td className="p-3 font-semibold text-slate-200">Position 2</td>
                <td className="p-3 text-slate-400">2 rounds remaining</td>
                <td className="p-3 text-amber-400 font-bold">200 CFT</td>
              </tr>
              <tr className="hover:bg-slate-900/50">
                <td className="p-3 font-semibold text-slate-200">Position 3</td>
                <td className="p-3 text-slate-400">1 round remaining</td>
                <td className="p-3 text-amber-400 font-bold">100 CFT</td>
              </tr>
              <tr className="hover:bg-slate-900/50">
                <td className="p-3 font-semibold text-slate-200">Position 4 (Final recipient)</td>
                <td className="p-3 text-slate-400">0 rounds remaining</td>
                <td className="p-3 text-emerald-400 font-bold">0 CFT</td>
              </tr>
            </tbody>
          </table>
        </div>

        <div className="p-4 bg-slate-950/80 rounded-2xl border border-slate-800/80 text-[11px] text-slate-400 space-y-1">
          <span className="font-semibold text-slate-300 block">⚠️ Security Disclaimer</span>
          <p>
            CircleFlow protects financial obligations strictly to the extent of the security reserve actually secured by the contract.
            The protocol enforces deterministic execution and collateralization, but does not provide external insurance beyond secured on-chain reserves.
          </p>
        </div>
      </section>
    </div>
  );
};

