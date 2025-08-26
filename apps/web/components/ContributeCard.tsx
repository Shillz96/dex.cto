"use client";
import { useCallback, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useConnection } from '@solana/wallet-adapter-react';
import { getProgram } from '../lib/anchorClient';
import { BN } from '@coral-xyz/anchor';
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js';
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';

interface ContributeCardProps {
  campaignAddress: PublicKey;
  payMint: PublicKey;
}

export function ContributeCard({ campaignAddress, payMint }: ContributeCardProps) {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [amount, setAmount] = useState<string>("1000000"); // 1 USDC minor units
  const [message, setMessage] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const onContribute = useCallback(async () => {
    if (!wallet.publicKey || !wallet.signTransaction) {
      setMessage('Connect wallet');
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      const program = getProgram(connection, wallet as any);
      const contributorAta = getAssociatedTokenAddressSync(payMint, wallet.publicKey);
      const vault = getAssociatedTokenAddressSync(payMint, campaignAddress, true);
      
      // Derive contribution PDA using the campaign address
      const [contributionPda] = PublicKey.findProgramAddressSync([
        Buffer.from('contribution'),
        campaignAddress.toBuffer(),
        wallet.publicKey.toBuffer(),
      ], program.programId);

      await program.methods
        .contribute(new BN(amount))
        .accounts({
          contributor: wallet.publicKey,
          campaign: campaignAddress,
          payMint,
          contributorAta,
          vault,
          contribution: contributionPda,
          systemProgram: SystemProgram.programId,
          tokenProgram: TOKEN_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
          rent: SYSVAR_RENT_PUBKEY,
        })
        .rpc();
      setMessage('Contribution sent');
    } catch (e: any) {
      setMessage(e.message || 'Failed to contribute');
    } finally {
      setLoading(false);
    }
  }, [connection, wallet, amount, campaignAddress, payMint]);

  const onRefund = useCallback(async () => {
    if (!wallet.publicKey || !wallet.signTransaction) {
      setMessage('Connect wallet');
      return;
    }
    setLoading(true);
    setMessage('');
    try {
      const program = getProgram(connection, wallet as any);
      const contributorAta = getAssociatedTokenAddressSync(payMint, wallet.publicKey);
      const vault = getAssociatedTokenAddressSync(payMint, campaignAddress, true);
      
      // Derive contribution PDA using the campaign address
      const [contributionPda] = PublicKey.findProgramAddressSync([
        Buffer.from('contribution'),
        campaignAddress.toBuffer(),
        wallet.publicKey.toBuffer(),
      ], program.programId);

      await program.methods
        .refund()
        .accounts({
          contributor: wallet.publicKey,
          campaign: campaignAddress,
          payMint,
          contributorAta,
          vault,
          contribution: contributionPda,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();
      setMessage('Refund completed');
    } catch (e: any) {
      setMessage(e.message || 'Failed to refund');
    } finally {
      setLoading(false);
    }
  }, [connection, wallet, campaignAddress, payMint]);

  return (
    <div style={{ display: 'grid', gap: 8 }}>
      <label>
        Amount (USDC minor units):
        <input value={amount} onChange={e => setAmount(e.target.value)} style={{ width: '100%' }} />
      </label>
      <div style={{ display: 'flex', gap: 8 }}>
        <button onClick={onContribute} disabled={loading}>{loading ? 'Sending…' : 'Contribute'}</button>
        <button onClick={onRefund} disabled={loading}>Refund</button>
      </div>
      {message && <div>{message}</div>}
    </div>
  );
}


