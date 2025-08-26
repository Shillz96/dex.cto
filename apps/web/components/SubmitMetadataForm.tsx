"use client";
import { useCallback, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useConnection } from '@solana/wallet-adapter-react';
import { getProgram } from '../lib/anchorClient';
import { deriveCampaignPda } from '../lib/pdas';
import { PublicKey } from '@solana/web3.js';

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.startsWith('0x') ? hex.slice(2) : hex;
  if (clean.length !== 64) throw new Error('metadata hash must be 32 bytes hex');
  const out = new Uint8Array(32);
  for (let i = 0; i < 32; i++) {
    out[i] = parseInt(clean.slice(i * 2, i * 2 + 2), 16);
  }
  return out;
}

export function SubmitMetadataForm() {
  const { connection } = useConnection();
  const wallet = useWallet();
  const [uri, setUri] = useState<string>('');
  const [hashHex, setHashHex] = useState<string>('');
  const [message, setMessage] = useState<string>('');
  const [loading, setLoading] = useState(false);

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
      const [campaignPda] = deriveCampaignPda(wallet.publicKey, program.programId);

      await program.methods
        .submitMetadata(uri, Array.from(hexToBytes(hashHex)))
        .accounts({ submitter: wallet.publicKey, campaign: campaignPda })
        .rpc();
      setMessage('Metadata submitted');
    } catch (e: any) {
      setMessage(e.message || 'Failed to submit metadata');
    } finally {
      setLoading(false);
    }
  }, [connection, wallet, uri, hashHex]);

  return (
    <form onSubmit={onSubmit} style={{ display: 'grid', gap: 8 }}>
      <label>
        Metadata URI (IPFS/Arweave):
        <input value={uri} onChange={e => setUri(e.target.value)} style={{ width: '100%' }} />
      </label>
      <label>
        Metadata SHA-256 (32-byte hex):
        <input value={hashHex} onChange={e => setHashHex(e.target.value)} style={{ width: '100%' }} />
      </label>
      <button type="submit" disabled={loading}>{loading ? 'Submitting…' : 'Submit Metadata'}</button>
      {message && <div>{message}</div>}
    </form>
  );
}


