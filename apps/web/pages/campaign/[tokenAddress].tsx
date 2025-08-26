import { useRouter } from 'next/router';
import { useCallback, useEffect, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useConnection } from '@solana/wallet-adapter-react';
import { PublicKey } from '@solana/web3.js';
import { getProgram } from '../../lib/anchorClient';
import { findCampaignsByToken } from '../../lib/pdas';
import { BN } from '@coral-xyz/anchor';
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';
import { SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js';
import Image from 'next/image';
import { UserFriendlyMetadataForm } from '../../components/UserFriendlyMetadataForm';
import WalletButton from '../../components/WalletButton';
import { ContributeCard } from '../../components/ContributeCard';
import { CampaignView } from '../../components/CampaignView';

type CampaignData = {
  creator: PublicKey;
  payMint: PublicKey;
  targetAmount: bigint;
  totalContributed: bigint;
  deadline: number;
  status: number;
};

function formatLamports(v: bigint, decimals = 6) {
  const s = v.toString();
  const pad = s.padStart(decimals + 1, '0');
  const i = pad.slice(0, -decimals);
  const d = pad.slice(-decimals);

  return `${i}.${d}`;
}

export default function CampaignPage() {
  const router = useRouter();
  const { tokenAddress } = router.query;
  const { connection } = useConnection();
  const wallet = useWallet();
  
  const [campaign, setCampaign] = useState<CampaignData | null>(null);
  const [campaignAddress, setCampaignAddress] = useState<PublicKey | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>('');
  const [contributionAmount, setContributionAmount] = useState<string>('10'); // Default 10 USDC
  const [message, setMessage] = useState<string>('');
  const [showMetadataForm, setShowMetadataForm] = useState(false);
  const [contributing, setContributing] = useState(false);
  const [searchingCampaigns, setSearchingCampaigns] = useState(false);

  // Find campaigns for the given token address
  const findCampaignsForToken = useCallback(async () => {
    if (!tokenAddress || !wallet.publicKey) return;
    
    try {
      setSearchingCampaigns(true);
      setError('');
      
      const program = getProgram(connection, wallet as any);
      const tokenMint = new PublicKey(tokenAddress as string);
      
      // Find all campaigns for this token
      const campaignAddresses = await findCampaignsByToken(connection, program.programId, tokenMint);
      
      if (campaignAddresses.length === 0) {
        setCampaign(null);
        setCampaignAddress(null);
        setError('No campaigns found for this token');
      } else {
        // For now, use the first campaign found
        // In the future, you might want to show a list of campaigns
        const firstCampaignAddress = campaignAddresses[0];
        setCampaignAddress(firstCampaignAddress);
        
        // Fetch the campaign data
        const acc = await (program.account as any).campaign.fetchNullable(firstCampaignAddress);
        if (acc) {
          const campaignData = {
            creator: acc.creator,
            payMint: acc.payMint,
            targetAmount: BigInt(acc.targetAmount.toString()),
            totalContributed: BigInt(acc.totalContributed.toString()),
            deadline: Number(acc.deadline.toString()),
            status: acc.status,
          };
          setCampaign(campaignData);
        }
      }
    } catch (e: any) {
      setError(e.message || 'Failed to find campaigns for this token');
      setCampaign(null);
      setCampaignAddress(null);
    } finally {
      setSearchingCampaigns(false);
    }
  }, [connection, wallet, tokenAddress]);

  useEffect(() => { 
    void findCampaignsForToken(); 
  }, [findCampaignsForToken]);

  const handleContribute = useCallback(async () => {
    if (!wallet.publicKey || !wallet.signTransaction || !campaign || !campaignAddress) {
      setMessage('Connect wallet to contribute');
      return;
    }
    
    setContributing(true);
    setMessage('');
    
    try {
      const program = getProgram(connection, wallet as any);
      const payMint = new PublicKey(process.env.NEXT_PUBLIC_USDC_MINT!);
      const contributorAta = getAssociatedTokenAddressSync(payMint, wallet.publicKey);
      const vault = getAssociatedTokenAddressSync(payMint, campaignAddress, true);
      
      // Derive contribution PDA using the campaign address
      const [contributionPda] = PublicKey.findProgramAddressSync([
        Buffer.from('contribution'),
        campaignAddress.toBuffer(),
        wallet.publicKey.toBuffer(),
      ], program.programId);
      
      const amount = parseFloat(contributionAmount) * 1_000_000; // Convert to minor units

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
        
      setMessage('Contribution successful!');
      await findCampaignsForToken(); // Refresh campaign data
    } catch (e: any) {
      setMessage(e.message || 'Failed to contribute');
    } finally {
      setContributing(false);
    }
  }, [connection, wallet, campaign, campaignAddress, contributionAmount, findCampaignsForToken]);

  if (!tokenAddress) {
    return <div>Loading...</div>;
  }

  const now = Math.floor(Date.now() / 1000);
  const remaining = campaign ? Math.max(0, campaign.deadline - now) : 0;
  const pct = campaign && campaign.targetAmount > 0n
    ? Number((campaign.totalContributed * 100n) / campaign.targetAmount)
    : 0;

  return (
    <div style={{
      minHeight: '100vh',
      backgroundColor: '#0a0a0a',
      backgroundImage: `
        radial-gradient(circle at 1px 1px, #00ff41 1px, transparent 0),
        linear-gradient(90deg, transparent 24px, rgba(0, 255, 65, 0.03) 25px, rgba(0, 255, 65, 0.03) 26px, transparent 27px),
        linear-gradient(transparent 24px, rgba(0, 255, 65, 0.03) 25px, rgba(0, 255, 65, 0.03) 26px, transparent 27px)
      `,
      backgroundSize: '25px 25px',
      fontFamily: 'Courier New, monospace',
      padding: '20px',
      color: '#00ff41'
    }}>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '40px'
      }}>
        <button
          onClick={() => router.push('/')}
          style={{
            background: 'transparent',
            border: '1px solid #00ff41',
            padding: '8px 16px',
            borderRadius: '4px',
            color: '#00ff41',
            fontSize: '12px',
            cursor: 'pointer',
            fontFamily: 'Courier New, monospace',
            textTransform: 'uppercase',
            letterSpacing: '1px'
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = '#00ff41';
            e.currentTarget.style.color = '#000000';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = 'transparent';
            e.currentTarget.style.color = '#00ff41';
          }}
        >
          [←] return
        </button>
        <WalletButton />
      </div>

      <div style={{
        maxWidth: '800px',
        margin: '0 auto'
      }}>
        {/* Terminal Window */}
        <div style={{
          background: 'rgba(0, 20, 0, 0.9)',
          border: '2px solid #00ff41',
          borderRadius: '8px',
          padding: '30px',
          marginBottom: '20px',
          boxShadow: '0 0 30px rgba(0, 255, 65, 0.3), inset 0 0 20px rgba(0, 255, 65, 0.1)'
        }}>
          {/* Terminal header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '20px',
            borderBottom: '1px solid #00ff41',
            paddingBottom: '15px'
          }}>
            <div style={{ display: 'flex', gap: '8px', marginRight: '20px' }}>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#ff0000' }}></div>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#ffff00' }}></div>
              <div style={{ width: '12px', height: '12px', borderRadius: '50%', backgroundColor: '#00ff00' }}></div>
            </div>
            <div style={{ 
              fontSize: '14px', 
              color: '#00ff41',
              fontFamily: 'Courier New, monospace',
              letterSpacing: '2px'
            }}>
              [CAMPAIGN_MONITOR] - TOKEN: {tokenAddress?.toString().slice(0, 8)}...{tokenAddress?.toString().slice(-8)}
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <div style={{ fontSize: '16px', color: '#ffffff', marginBottom: '10px', fontWeight: 'bold', textAlign: 'center' }}>
              Campaign Status for Token: {tokenAddress?.toString().slice(0, 8)}...{tokenAddress?.toString().slice(-8)}
            </div>
          </div>

          {searchingCampaigns && (
            <div style={{ padding: '30px 0', textAlign: 'center' }}>
              <div style={{ fontSize: '18px', color: '#00ff41', fontFamily: 'Courier New, monospace', marginBottom: '10px' }}>
                Searching for Campaigns...
              </div>
              <div style={{ fontSize: '14px', color: '#cccccc', fontFamily: 'Courier New, monospace' }}>
                Scanning blockchain for campaigns associated with this token
              </div>
            </div>
          )}

          {!searchingCampaigns && !campaign && !error && (
            <div style={{ padding: '30px 0', textAlign: 'center' }}>
              <div style={{ fontSize: '20px', color: '#ffffff', marginBottom: '15px', fontFamily: 'Courier New, monospace', fontWeight: 'bold' }}>
                No Campaign Found
              </div>
              <div style={{ fontSize: '16px', color: '#cccccc', marginBottom: '30px', fontFamily: 'Courier New, monospace' }}>
                This token doesn't have an active crowdfunding campaign yet.
              </div>
              <div style={{ fontSize: '16px', color: '#00ff41', marginBottom: '30px', fontFamily: 'Courier New, monospace' }}>
                Would you like to start one?
              </div>
              
              <div style={{
                padding: '20px',
                backgroundColor: 'rgba(0, 255, 65, 0.1)',
                border: '1px solid #00ff41',
                borderRadius: '8px',
                marginBottom: '25px'
              }}>
                <div style={{ fontSize: '15px', color: '#ffffff', marginBottom: '10px', fontWeight: 'bold' }}>
                  📋 CAMPAIGN PARAMETERS:
                </div>
                <div style={{ fontSize: '14px', color: '#cccccc', lineHeight: '1.6' }}>
                  • Target Amount: $300 USDC<br/>
                  • Duration: 2 hours max<br/>
                  • Purpose: DEX Screener Enhanced Token Info<br/>
                  • Escrow: Time-locked smart contract
                </div>
              </div>
              
              <button
                onClick={() => router.push(`/initialize/${tokenAddress}`)}
                disabled={!wallet.publicKey}
                style={{
                  background: 'transparent',
                  color: '#00ff41',
                  border: '3px solid #00ff41',
                  padding: '16px 32px',
                  fontSize: '16px',
                  fontWeight: 'bold',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontFamily: 'Courier New, monospace',
                  textTransform: 'uppercase',
                  letterSpacing: '2px',
                  transition: 'all 0.3s ease',
                  opacity: !wallet.publicKey ? 0.5 : 1
                }}
                onMouseEnter={(e) => {
                  if (wallet.publicKey) {
                    e.currentTarget.style.backgroundColor = '#00ff41';
                    e.currentTarget.style.color = '#000000';
                    e.currentTarget.style.boxShadow = '0 0 25px rgba(0, 255, 65, 0.7)';
                  }
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#00ff41';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {!wallet.publicKey ? 'Connect Wallet' : 'Start Campaign'}
              </button>
            </div>
          )}

          {error && (
            <div style={{
              marginTop: '20px',
              padding: '16px 20px',
              borderRadius: '8px',
              backgroundColor: 'rgba(255, 68, 68, 0.15)',
              color: '#ff4444',
              fontSize: '14px',
              fontFamily: 'Courier New, monospace',
              border: '2px solid #ff4444',
              fontWeight: 'bold'
            }}>
              ❌ ERROR: {error}
            </div>
          )}

          {!searchingCampaigns && campaign && campaignAddress && (
            <div>
              {/* Campaign Status */}
              <div style={{
                padding: '25px',
                backgroundColor: 'rgba(0, 255, 65, 0.1)',
                border: '2px solid #00ff41',
                borderRadius: '12px',
                marginBottom: '30px'
              }}>
                <div style={{ fontSize: '18px', color: '#00ff41', marginBottom: '20px', fontWeight: 'bold', textAlign: 'center' }}>
                  ⚡ ACTIVE CAMPAIGN
                </div>

                {/* Progress Bar */}
                <div style={{ marginBottom: '25px' }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '10px'
                  }}>
                    <span style={{ fontSize: '16px', fontWeight: '600', color: '#ffffff' }}>
                      Funding Progress
                    </span>
                    <span style={{ fontSize: '16px', color: '#00ff41', fontWeight: 'bold' }}>
                      {pct.toFixed(1)}%
                    </span>
                  </div>
                  
                  <div style={{
                    width: '100%',
                    height: '20px',
                    backgroundColor: '#1a1a1a',
                    borderRadius: '10px',
                    overflow: 'hidden',
                    border: '1px solid #00ff41'
                  }}>
                    <div style={{
                      width: `${Math.min(pct, 100)}%`,
                      height: '100%',
                      background: `linear-gradient(90deg, 
                        #00ff41 0%, 
                        #00ff41 ${pct < 50 ? 100 : 50}%, 
                        #ffff00 ${pct < 50 ? 100 : 50}%, 
                        #ffff00 ${pct < 80 ? 100 : 80}%, 
                        #ff4444 ${pct < 80 ? 100 : 80}%, 
                        #ff4444 100%)`,
                      transition: 'width 0.3s ease',
                      boxShadow: '0 0 20px rgba(0, 255, 65, 0.6)'
                    }} />
                  </div>
                  
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    marginTop: '8px',
                    fontSize: '14px'
                  }}>
                    <span style={{ color: '#00ff41' }}>${formatLamports(campaign.totalContributed)} raised</span>
                    <span style={{ color: '#ffffff' }}>${formatLamports(campaign.targetAmount)} goal</span>
                  </div>
                </div>

                {/* Stats Grid */}
                <div style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))',
                  gap: '15px',
                  marginBottom: '20px'
                }}>
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '15px', 
                    backgroundColor: 'rgba(0, 255, 65, 0.1)', 
                    border: '1px solid #00ff41',
                    borderRadius: '8px'
                  }}>
                    <div style={{ fontSize: '24px', fontWeight: '700', color: '#00ff41', marginBottom: '5px' }}>
                      ${formatLamports(campaign.totalContributed)}
                    </div>
                    <div style={{ fontSize: '11px', color: '#cccccc' }}>Raised</div>
                  </div>
                  
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '15px', 
                    backgroundColor: 'rgba(255, 255, 0, 0.1)', 
                    border: '1px solid #ffff00',
                    borderRadius: '8px'
                  }}>
                    <div style={{ fontSize: '24px', fontWeight: '700', color: '#ffff00', marginBottom: '5px' }}>
                      {remaining > 3600 ? Math.floor(remaining / 3600) + 'h' : Math.floor(remaining / 60) + 'm'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#cccccc' }}>Left</div>
                  </div>
                  
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '15px', 
                    backgroundColor: 'rgba(0, 255, 65, 0.1)', 
                    border: '1px solid #00ff41',
                    borderRadius: '8px'
                  }}>
                    <div style={{ fontSize: '24px', fontWeight: '700', color: '#00ff41', marginBottom: '5px' }}>
                      {campaign.status === 0 ? 'Active' : 'Complete'}
                    </div>
                    <div style={{ fontSize: '11px', color: '#cccccc' }}>Status</div>
                  </div>
                </div>
              </div>

              {/* Campaign View Component */}
              <div style={{
                padding: '25px',
                backgroundColor: 'rgba(0, 255, 65, 0.08)',
                border: '2px solid #00ff41',
                borderRadius: '12px',
                marginBottom: '20px'
              }}>
                <div style={{ fontSize: '18px', color: '#ffffff', marginBottom: '20px', fontWeight: 'bold', textAlign: 'center' }}>
                  📊 Campaign Details
                </div>
                <CampaignView 
                  campaignAddress={campaignAddress}
                  onCampaignLoaded={(campaignData) => {
                    if (campaignData) {
                      setCampaign(campaignData);
                    }
                  }}
                />
              </div>

              {/* Contribution Interface */}
              <div style={{
                padding: '25px',
                backgroundColor: 'rgba(0, 255, 65, 0.08)',
                border: '2px solid #00ff41',
                borderRadius: '12px',
                marginBottom: '20px'
              }}>
                <div style={{ fontSize: '18px', color: '#ffffff', marginBottom: '20px', fontWeight: 'bold', textAlign: 'center' }}>
                  💰 Join the Campaign
                </div>
                
                <div style={{ marginBottom: '20px' }}>
                  <div style={{ fontSize: '14px', color: '#ffffff', marginBottom: '8px', fontWeight: 'bold' }}>
                    Your Contribution Amount (USDC)
                  </div>
                  <input
                    type="number"
                    value={contributionAmount}
                    onChange={(e) => setContributionAmount(e.target.value)}
                    min="1"
                    step="1"
                    style={{
                      width: '100%',
                      padding: '16px 20px',
                      fontSize: '16px',
                      backgroundColor: '#000000',
                      border: '2px solid #00ff41',
                      borderRadius: '8px',
                      color: '#00ff41',
                      outline: 'none',
                      fontFamily: 'Courier New, monospace',
                      boxSizing: 'border-box'
                    }}
                    placeholder="Enter amount..."
                  />
                </div>
                
                <div style={{ display: 'flex', gap: '12px', marginBottom: '20px', flexWrap: 'wrap' }}>
                  {[5, 10, 25, 50].map(amount => (
                    <button
                      key={amount}
                      onClick={() => setContributionAmount(amount.toString())}
                      style={{
                        padding: '10px 16px',
                        border: '2px solid #00ff41',
                        backgroundColor: contributionAmount === amount.toString() ? '#00ff41' : 'transparent',
                        color: contributionAmount === amount.toString() ? '#000000' : '#00ff41',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 'bold',
                        fontFamily: 'Courier New, monospace',
                        transition: 'all 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        if (contributionAmount !== amount.toString()) {
                          e.currentTarget.style.backgroundColor = '#00ff41';
                          e.currentTarget.style.color = '#000000';
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (contributionAmount !== amount.toString()) {
                          e.currentTarget.style.backgroundColor = 'transparent';
                          e.currentTarget.style.color = '#00ff41';
                        }
                      }}
                    >
                      ${amount}
                    </button>
                  ))}
                </div>
                
                <button
                  onClick={handleContribute}
                  disabled={contributing || !wallet.publicKey}
                  style={{
                    width: '100%',
                    background: contributing || !wallet.publicKey ? 'rgba(0, 255, 65, 0.3)' : 'linear-gradient(135deg, #00ff41 0%, #00cc33 100%)',
                    color: contributing || !wallet.publicKey ? '#cccccc' : '#000000',
                    border: 'none',
                    padding: '16px 24px',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    borderRadius: '8px',
                    cursor: contributing || !wallet.publicKey ? 'not-allowed' : 'pointer',
                    fontFamily: 'Courier New, monospace',
                    textTransform: 'uppercase',
                    letterSpacing: '1px',
                    transition: 'all 0.3s ease',
                    boxShadow: contributing || !wallet.publicKey ? 'none' : '0 4px 15px rgba(0, 255, 65, 0.4)'
                  }}
                  onMouseEnter={(e) => {
                    if (!contributing && wallet.publicKey) {
                      e.currentTarget.style.transform = 'translateY(-2px)';
                      e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 255, 65, 0.6)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!contributing && wallet.publicKey) {
                      e.currentTarget.style.transform = 'translateY(0)';
                      e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 255, 65, 0.4)';
                    }
                  }}
                >
                  {contributing ? 'Contributing...' : 
                   !wallet.publicKey ? 'Connect Wallet' : 
                   `Contribute $${contributionAmount} • Help Reach Goal! 🚀`}
                </button>
                
                <div style={{ fontSize: '12px', color: '#cccccc', textAlign: 'center', marginTop: '10px' }}>
                  ${(parseFloat(formatLamports(campaign.targetAmount)) - parseFloat(formatLamports(campaign.totalContributed))).toFixed(2)} more needed to reach the goal
                </div>

                {pct >= 100 && (
                  <button
                    onClick={() => setShowMetadataForm(true)}
                    style={{
                      width: '100%',
                      background: 'linear-gradient(135deg, #ffff00 0%, #ffcc00 100%)',
                      color: '#000000',
                      border: 'none',
                      padding: '16px 24px',
                      fontSize: '16px',
                      fontWeight: 'bold',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontFamily: 'Courier New, monospace',
                      textTransform: 'uppercase',
                      letterSpacing: '1px',
                      marginTop: '15px',
                      boxShadow: '0 4px 15px rgba(255, 255, 0, 0.4)'
                    }}
                  >
                    Submit Token Info - Goal Reached! 🎉
                  </button>
                )}
              </div>

              {/* ContributeCard Component */}
              <div style={{
                padding: '25px',
                backgroundColor: 'rgba(0, 255, 65, 0.08)',
                border: '2px solid #00ff41',
                borderRadius: '12px',
                marginBottom: '20px'
              }}>
                <div style={{ fontSize: '18px', color: '#ffffff', marginBottom: '20px', fontWeight: 'bold', textAlign: 'center' }}>
                  🔧 Advanced Contribution (Raw)
                </div>
                <ContributeCard 
                  campaignAddress={campaignAddress}
                  payMint={campaign.payMint}
                />
              </div>

              {message && (
                <div style={{
                  marginTop: '20px',
                  padding: '16px 20px',
                  borderRadius: '8px',
                  backgroundColor: message.includes('successful') || message.includes('created') ? 'rgba(0, 255, 65, 0.15)' : 'rgba(255, 68, 68, 0.15)',
                  color: message.includes('successful') || message.includes('created') ? '#00ff41' : '#ff4444',
                  fontSize: '14px',
                  fontFamily: 'Courier New, monospace',
                  border: `2px solid ${message.includes('successful') || message.includes('created') ? '#00ff41' : '#ff4444'}`,
                  fontWeight: 'bold'
                }}>
                  {message.includes('successful') || message.includes('created') ? '✅ SUCCESS: ' : '❌ ERROR: '} {message}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
      
      {/* Metadata Form Modal */}
      {showMetadataForm && (
        <UserFriendlyMetadataForm onClose={() => setShowMetadataForm(false)} />
      )}
      
      {/* CSS for blinking cursor */}
      <style jsx>{`
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
