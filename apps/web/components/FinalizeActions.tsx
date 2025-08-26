"use client";
import { useCallback, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useConnection } from '@solana/wallet-adapter-react';
import { getProgram } from '../lib/anchorClient';
import { deriveCampaignPda } from '../lib/pdas';

export function FinalizeActions() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const onFinalize = useCallback(async () => {
    if (!wallet.publicKey || !wallet.signTransaction) { setMessage('Connect wallet'); return; }
    setLoading(true); setMessage('');
    try {
      const program = getProgram(connection, wallet as any);
      const [campaignPda] = deriveCampaignPda(wallet.publicKey, program.programId);
      await program.methods.finalize().accounts({ campaign: campaignPda }).rpc();
      setMessage('Finalized');
    } catch (e: any) {
      setMessage(e.message || 'Failed to finalize');
    } finally { setLoading(false); }
  }, [connection, wallet]);

  return (
    <div style={{ display: 'flex', gap: 8 }}>
      <button onClick={onFinalize} disabled={loading}>{loading ? 'Finalizing…' : 'Finalize'}</button>
      {message && <div>{message}</div>}
    </div>
  );
}


