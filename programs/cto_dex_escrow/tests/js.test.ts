import { Connection, PublicKey } from '@solana/web3.js';
import { AnchorProvider, Program, Idl } from '@coral-xyz/anchor';
import fs from 'fs';

describe('cto_dex_escrow basic', () => {
  const IDL_PATH = '../../../apps/web/idl/cto_dex_escrow.json';
  const PROGRAM_ID = new PublicKey(process.env.PROGRAM_ID || 'CfzHBxVGRyVC6TythNtmDkXVX1k9iJQvwzBasFDDbLsY');
  const RPC_URL = process.env.RPC_URL || 'https://api.devnet.solana.com';

  it('loads IDL and derives campaign PDA', async () => {
    const idl = JSON.parse(fs.readFileSync(IDL_PATH, 'utf8')) as Idl;
    const connection = new Connection(RPC_URL, 'confirmed');
    // Use a dummy wallet-less provider; we won’t send txs in this test
    const provider = new AnchorProvider(connection, {} as any, { commitment: 'confirmed' });
    const program = new Program(idl, PROGRAM_ID, provider);

    const creator = new PublicKey('11111111111111111111111111111111');
    const [campaignPda] = PublicKey.findProgramAddressSync([
      Buffer.from('campaign'),
      creator.toBuffer(),
    ], PROGRAM_ID);

    expect(campaignPda).toBeTruthy();
    // Ensure program is constructed and has accounts namespace
    expect((program as any).account).toBeTruthy();
  });

  it('exposes new fields and methods in IDL', async () => {
    const idl = JSON.parse(fs.readFileSync(IDL_PATH, 'utf8')) as Idl;
    // has setDelegateAuthority instruction
    expect(idl.instructions.some(i => i.name === 'setDelegateAuthority')).toBe(true);
    // has delegateAuthority field on campaign
    const campaign = (idl.accounts as any[]).find(a => a.name === 'campaign');
    expect(campaign).toBeTruthy();
    const hasDelegate = campaign.type.fields.some((f: any) => f.name === 'delegateAuthority');
    expect(hasDelegate).toBe(true);
  });
});


