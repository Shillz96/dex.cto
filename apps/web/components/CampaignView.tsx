"use client";
import { useCallback, useEffect, useMemo, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useConnection } from '@solana/wallet-adapter-react';
import { getProgram } from '../lib/anchorClient';
import { PublicKey } from '@solana/web3.js';

type CampaignData = {
  creator: PublicKey;
  payMint: PublicKey;
  targetAmount: bigint;
  totalContributed: bigint;
  deadline: number;
  status: number;
};

interface CampaignViewProps {
  campaignAddress: PublicKey;
  onCampaignLoaded?: (campaign: CampaignData | null) => void;
}

function formatLamports(v: bigint, decimals = 6) {
  const s = v.toString();
  const pad = s.padStart(decimals + 1, '0');
  const i = pad.slice(0, -decimals);
  const d = pad.slice(-decimals);
  return `${i}.${d}`;
}

export function CampaignView({ campaignAddress, onCampaignLoaded }: CampaignViewProps) {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [campaign, setCampaign] = useState<CampaignData | null>(null);

  const fetchCampaign = useCallback(async () => {
    if (!wallet.publicKey) return;
    try {
      setLoading(true);
      setError('');
      const program = getProgram(connection, wallet as any);
      
      // Use the provided campaign address directly
      const acc = await (program.account as any).campaign.fetchNullable(campaignAddress);
      if (!acc) {
        setCampaign(null);
        onCampaignLoaded?.(null);
      } else {
        const campaignData = {
          creator: acc.creator,
          payMint: acc.payMint,
          targetAmount: BigInt(acc.targetAmount.toString()),
          totalContributed: BigInt(acc.totalContributed.toString()),
          deadline: Number(acc.deadline.toString()),
          status: acc.status,
        };
        setCampaign(campaignData);
        onCampaignLoaded?.(campaignData);
      }
    } catch (e: any) {
      setError(e.message || 'Failed to load campaign');
      onCampaignLoaded?.(null);
    } finally {
      setLoading(false);
    }
  }, [connection, wallet, campaignAddress, onCampaignLoaded]);

  useEffect(() => { void fetchCampaign(); }, [fetchCampaign]);

  const now = Math.floor(Date.now() / 1000);
  const remaining = campaign ? Math.max(0, campaign.deadline - now) : 0;
  const pct = campaign && campaign.targetAmount > 0n
    ? Number((campaign.totalContributed * 100n) / campaign.targetAmount)
    : 0;

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
        <div style={{ flex: 1, fontSize: '14px', color: '#666' }}>
          Campaign: {campaignAddress.toString().slice(0, 8)}...{campaignAddress.toString().slice(-8)}
        </div>
        <button onClick={() => void fetchCampaign()} disabled={loading}>Refresh</button>
      </div>
      {error && <div style={{ color: 'crimson' }}>{error}</div>}
      {!campaign && !loading && <div>No campaign found for this address.</div>}
      {campaign && (
        <div style={{ border: '1px solid #ddd', borderRadius: 8, padding: 12 }}>
          <div>Creator: {campaign.creator.toString().slice(0, 8)}...{campaign.creator.toString().slice(-8)}</div>
          <div>Target: {formatLamports(campaign.targetAmount)}</div>
          <div>Raised: {formatLamports(campaign.totalContributed)} ({pct}%)</div>
          <div>Deadline: {new Date(campaign.deadline * 1000).toLocaleString()} ({remaining}s left)</div>
          <div>Status: {campaign.status}</div>
        </div>
      )}
    </div>
  );
}


