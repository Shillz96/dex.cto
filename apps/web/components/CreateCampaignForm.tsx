"use client";
import { useCallback, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useConnection } from '@solana/wallet-adapter-react';
import { getProgram } from '../lib/anchorClient';
import { PublicKey } from '@solana/web3.js';
import { deriveCampaignPda } from '../lib/pdas';
import { BN } from '@coral-xyz/anchor';
import { getAssociatedTokenAddressSync } from '@solana/spl-token';
import { SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js';
import { TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';

export function CreateCampaignForm() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [target, setTarget] = useState<string>("300000000"); // 300 USDC in minor units (6dp)
  const [deadlineMin, setDeadlineMin] = useState<string>(process.env.NEXT_PUBLIC_DEADLINE_MINUTES_DEFAULT || '120');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string>('');

  const onSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wallet.publicKey || !wallet.signTransaction) {
      setMessage('Connect wallet');
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      const program = getProgram(connection, wallet as any);
      const payMint = new PublicKey(process.env.NEXT_PUBLIC_USDC_MINT!);
      const [campaignPda] = deriveCampaignPda(wallet.publicKey, program.programId);
      const vaultAta = getAssociatedTokenAddressSync(payMint, campaignPda, true);
      const nowSec = Math.floor(Date.now() / 1000);
      const deadline = nowSec + parseInt(deadlineMin, 10) * 60;

      await program.methods
        .initCampaign(new BN(target), new BN(deadline))
        .accounts({
          creator: wallet.publicKey,
          payMint,
          campaign: campaignPda,
          vault: vaultAta,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .rpc();
      setMessage('Campaign initialized');
    } catch (e: any) {
      setMessage(e.message || 'Failed to create campaign');
    } finally {
      setLoading(false);
    }
  }, [connection, wallet, target, deadlineMin]);

  return (
    <form onSubmit={onSubmit} style={{ display: 'grid', gap: 8 }}>
      <label>
        Target (USDC minor units):
        <input value={target} onChange={e => setTarget(e.target.value)} style={{ width: '100%' }} />
      </label>
      <label>
        Deadline (minutes):
        <input value={deadlineMin} onChange={e => setDeadlineMin(e.target.value)} style={{ width: '100%' }} />
      </label>
      <button type="submit" disabled={loading}>{loading ? 'Creating…' : 'Create Campaign'}</button>
      {message && <div>{message}</div>}
    </form>
  );
}


