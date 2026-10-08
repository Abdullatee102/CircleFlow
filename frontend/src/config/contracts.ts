import CircleFlowTokenAbi from '../abi/CircleFlowToken.json';
import CircleFlowAbi from '../abi/CircleFlow.json';

export const CHAIN_ID = Number(import.meta.env.VITE_CHAIN_ID || import.meta.env.VITE_TARGET_CHAIN_ID || '11155111');

export const CIRCLEFLOW_TOKEN_ADDRESS = (
  import.meta.env.VITE_CIRCLEFLOW_TOKEN_ADDRESS ||
  '0x4Fb8AFe76E931D44112CE4BFA2cBb801ED253805'
) as `0x${string}`;

export const CIRCLEFLOW_CONTRACT_ADDRESS = (
  import.meta.env.VITE_CIRCLEFLOW_CONTRACT_ADDRESS ||
  import.meta.env.VITE_CIRCLE_FLOW_CONTRACT_ADDRESS ||
  '0xC403086b54EcE2148e3b520FA83896aBE70A5Bd2'
) as `0x${string}`;

export const REOWN_PROJECT_ID = import.meta.env.VITE_REOWN_PROJECT_ID || 'b0ed2f41971704df2800043e6799378c';

export const RPC_URL = import.meta.env.VITE_RPC_URL || 'https://eth-sepolia.g.alchemy.com/v2/alch_ydAGy-RsnPpZC3p33So34';

export const EXPLORER_URL = import.meta.env.VITE_BLOCK_EXPLORER_URL || 'https://sepolia.etherscan.io';

export const TOKEN_ABI = CircleFlowTokenAbi;
export const CIRCLEFLOW_ABI = CircleFlowAbi;

export const formatAddress = (addr: string) => {
  if (!addr) return '';
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
};

export const formatCFT = (amountWei?: bigint | string | number): string => {
  if (amountWei === undefined || amountWei === null) return '0 CFT';
  try {
    const val = typeof amountWei === 'bigint' ? amountWei : BigInt(amountWei);
    const whole = val / 10n ** 18n;
    const fraction = (val % 10n ** 18n) / 10n ** 14n; // 4 decimals
    if (fraction === 0n) {
      return `${whole.toLocaleString()} CFT`;
    }
    const fracStr = fraction.toString().padStart(4, '0').replace(/0+$/, '');
    return `${whole.toLocaleString()}.${fracStr} CFT`;
  } catch {
    return '0 CFT';
  }
};

