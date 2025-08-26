import { PublicKey } from '@solana/web3.js';

export function deriveCampaignPda(creator: PublicKey, programId: PublicKey) {
  return PublicKey.findProgramAddressSync([
    Buffer.from('campaign'),
    creator.toBuffer(),
  ], programId);
}

export function deriveContributionPda(campaign: PublicKey, contributor: PublicKey, programId: PublicKey) {
  return PublicKey.findProgramAddressSync([
    Buffer.from('contribution'),
    campaign.toBuffer(),
    contributor.toBuffer(),
  ], programId);
}

// Helper function to get all campaigns for a specific token mint
// Note: This is a client-side utility since the program doesn't index by token
export async function findCampaignsByToken(
  connection: any,
  programId: PublicKey,
  tokenMint: PublicKey
): Promise<PublicKey[]> {
  try {
    // Get all program accounts with the campaign discriminator
    const accounts = await connection.getProgramAccounts(programId, {
      filters: [
        {
          dataSize: 8 + 32 + 32 + 1 + 8 + 8 + 8 + 1 + 32 + 8 + 4 + 256 + 32 + 32 + 1, // Campaign account size
        },
        {
          memcmp: {
            offset: 8 + 32, // Skip discriminator and creator, check payMint
            bytes: tokenMint.toBase58(),
          },
        },
      ],
    });
    
    return accounts.map((account: { pubkey: PublicKey }) => account.pubkey);
  } catch (error) {
    console.error('Error finding campaigns by token:', error);
    return [];
  }
}

// Helper function to get campaign data by address
export async function getCampaignData(
  connection: any,
  programId: PublicKey,
  campaignAddress: PublicKey
): Promise<any> {
  try {
    const program = { programId };
    const account = await (connection as any).getAccountInfo(campaignAddress);
    if (!account) return null;
    
    // Parse the account data (this is a simplified version)
    // In a real implementation, you'd use the program's deserializer
    return account;
  } catch (error) {
    console.error('Error getting campaign data:', error);
    return null;
  }
}


