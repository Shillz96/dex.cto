import { useRouter } from 'next/router';
import { useCallback, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useConnection } from '@solana/wallet-adapter-react';
import WalletButton from '../../components/WalletButton';
import { PublicKey, SystemProgram, SYSVAR_RENT_PUBKEY } from '@solana/web3.js';
import { getProgram } from '../../lib/anchorClient';
import { deriveCampaignPda } from '../../lib/pdas';
import { BN } from '@coral-xyz/anchor';
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID, ASSOCIATED_TOKEN_PROGRAM_ID } from '@solana/spl-token';

export default function InitializeCampaignPage() {
  const router = useRouter();
  const { tokenAddress } = router.query;
  const { connection } = useConnection();
  const wallet = useWallet();
  
  const [targetAmount, setTargetAmount] = useState<string>('300');
  const [durationHours, setDurationHours] = useState<string>('2');
  const [creating, setCreating] = useState(false);
  const [message, setMessage] = useState<string>('');
  const [step, setStep] = useState<number>(1);

  const createCampaign = useCallback(async () => {
    if (!wallet.publicKey || !wallet.signTransaction || !tokenAddress) {
      setMessage('[ERROR] Connect wallet and provide token address');
      return;
    }
    
    if (!process.env.NEXT_PUBLIC_USDC_MINT || !process.env.NEXT_PUBLIC_PROGRAM_ID) {
      setMessage('[ERROR] Missing environment configuration');
      return;
    }
    
    setCreating(true);
    setMessage('');
    
    try {
      setMessage('[INFO] Initializing smart contract...');
      
      // Validate inputs
      const targetAmountNum = parseFloat(targetAmount);
      const durationHoursNum = parseInt(durationHours);
      
      if (isNaN(targetAmountNum) || targetAmountNum <= 0) {
        throw new Error('Invalid target amount');
      }
      
      if (isNaN(durationHoursNum) || durationHoursNum <= 0) {
        throw new Error('Invalid duration');
      }
      
      const program = getProgram(connection, wallet as any);
      const payMint = new PublicKey(process.env.NEXT_PUBLIC_USDC_MINT);
      const [campaignPda] = deriveCampaignPda(wallet.publicKey, program.programId);
      const vaultAta = getAssociatedTokenAddressSync(payMint, campaignPda, true);
      
      const nowSec = Math.floor(Date.now() / 1000);
      const deadline = nowSec + (durationHoursNum * 60 * 60);
      const targetLamports = Math.floor(targetAmountNum * 1_000_000); // Convert to USDC minor units
      
      console.log('Campaign params:', {
        targetLamports,
        deadline,
        creator: wallet.publicKey.toString(),
        payMint: payMint.toString(),
        campaign: campaignPda.toString(),
        vault: vaultAta.toString()
      });

      setMessage('[INFO] Creating BigNumber values...');
      
      // Create BN values with explicit error handling
      let targetBN: BN;
      let deadlineBN: BN;
      
      try {
        targetBN = new BN(targetLamports);
        deadlineBN = new BN(deadline);
        console.log('BN values created:', { targetBN: targetBN.toString(), deadlineBN: deadlineBN.toString() });
      } catch (bnError: any) {
        throw new Error(`Failed to create BigNumber values: ${bnError.message}`);
      }

      setMessage('[INFO] Submitting transaction to blockchain...');
      
      const txSignature = await program.methods
        .initCampaign(targetBN, deadlineBN)
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
        
      console.log('Transaction signature:', txSignature);
      setMessage('[SUCCESS] Campaign initialized! Redirecting...');
      
      // Redirect to campaign page after 2 seconds
      setTimeout(() => {
        router.push(`/campaign/${tokenAddress}`);
      }, 2000);
      
    } catch (e: any) {
      console.error('Campaign creation error:', e);
      setMessage(`[ERROR] ${e.message || 'Failed to create campaign'}`);
    } finally {
      setCreating(false);
    }
  }, [connection, wallet, tokenAddress, targetAmount, durationHours, router]);

  const nextStep = () => {
    if (step < 3) setStep(step + 1);
  };

  const prevStep = () => {
    if (step > 1) setStep(step - 1);
  };

  if (!tokenAddress) {
    return <div>Loading...</div>;
  }

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
        {/* Main Terminal Window */}
        <div style={{
          background: 'rgba(0, 20, 0, 0.9)',
          border: '2px solid #00ff41',
          borderRadius: '8px',
          padding: '40px',
          boxShadow: '0 0 30px rgba(0, 255, 65, 0.3), inset 0 0 20px rgba(0, 255, 65, 0.1)'
        }}>
          {/* Terminal header */}
          <div style={{
            display: 'flex',
            alignItems: 'center',
            marginBottom: '30px',
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
              [CAMPAIGN_INITIALIZER] - TOKEN: {tokenAddress.toString().slice(0, 8)}...{tokenAddress.toString().slice(-8)}
            </div>
          </div>

          {/* Step Indicator */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '40px'
          }}>
            {[1, 2, 3].map(stepNum => (
              <div key={stepNum} style={{
                display: 'flex',
                alignItems: 'center',
                margin: '0 10px'
              }}>
                <div style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  backgroundColor: step >= stepNum ? '#00ff41' : 'transparent',
                  border: '2px solid #00ff41',
                  color: step >= stepNum ? '#000000' : '#00ff41',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontWeight: 'bold',
                  fontSize: '16px'
                }}>
                  {stepNum}
                </div>
                {stepNum < 3 && (
                  <div style={{
                    width: '60px',
                    height: '2px',
                    backgroundColor: step > stepNum ? '#00ff41' : '#333333',
                    marginLeft: '10px'
                  }}></div>
                )}
              </div>
            ))}
          </div>

          {/* Step Content */}
          {step === 1 && (
            <div>
              <div style={{ fontSize: '18px', color: '#00ff41', marginBottom: '20px', fontWeight: 'bold', textAlign: 'center' }}>
                [STEP_01] CAMPAIGN_PARAMETERS
              </div>
              
              <div style={{ marginBottom: '25px' }}>
                <div style={{ fontSize: '16px', color: '#ffffff', marginBottom: '10px', fontWeight: 'bold' }}>
                  Target Amount (USDC)
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <span style={{ color: '#00ff41' }}>$</span>
                  <input
                    type="number"
                    value={targetAmount}
                    onChange={(e) => setTargetAmount(e.target.value)}
                    min="1"
                    max="1000"
                    style={{
                      flex: 1,
                      padding: '12px 16px',
                      fontSize: '16px',
                      backgroundColor: '#000000',
                      border: '2px solid #00ff41',
                      borderRadius: '6px',
                      color: '#00ff41',
                      outline: 'none',
                      fontFamily: 'Courier New, monospace'
                    }}
                  />
                  <span style={{ color: '#ffffff' }}>USDC</span>
                </div>
                <div style={{ fontSize: '12px', color: '#cccccc', marginTop: '5px' }}>
                  Recommended: $300 for DEX Screener Enhanced Token Info
                </div>
              </div>

              <div style={{ marginBottom: '30px' }}>
                <div style={{ fontSize: '16px', color: '#ffffff', marginBottom: '10px', fontWeight: 'bold' }}>
                  Campaign Duration
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                  <input
                    type="number"
                    value={durationHours}
                    onChange={(e) => setDurationHours(e.target.value)}
                    min="1"
                    max="24"
                    style={{
                      flex: 1,
                      padding: '12px 16px',
                      fontSize: '16px',
                      backgroundColor: '#000000',
                      border: '2px solid #00ff41',
                      borderRadius: '6px',
                      color: '#00ff41',
                      outline: 'none',
                      fontFamily: 'Courier New, monospace'
                    }}
                  />
                  <span style={{ color: '#ffffff' }}>hours</span>
                </div>
                <div style={{ fontSize: '12px', color: '#cccccc', marginTop: '5px' }}>
                  Maximum: 2 hours for urgency
                </div>
              </div>

              <button
                onClick={nextStep}
                style={{
                  width: '100%',
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
                  letterSpacing: '2px'
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
                Continue
              </button>
            </div>
          )}

          {step === 2 && (
            <div>
              <div style={{ fontSize: '18px', color: '#00ff41', marginBottom: '20px', fontWeight: 'bold', textAlign: 'center' }}>
                [STEP_02] REVIEW_CONFIGURATION
              </div>
              
              <div style={{
                padding: '20px',
                backgroundColor: 'rgba(0, 255, 65, 0.1)',
                border: '1px solid #00ff41',
                borderRadius: '8px',
                marginBottom: '30px'
              }}>
                <div style={{ fontSize: '16px', color: '#ffffff', marginBottom: '15px', fontWeight: 'bold' }}>
                  📋 CAMPAIGN CONFIGURATION:
                </div>
                <div style={{ fontSize: '14px', color: '#cccccc', lineHeight: '1.6' }}>
                  • Token Address: {tokenAddress.toString().slice(0, 20)}...{tokenAddress.toString().slice(-20)}<br/>
                  • Target Amount: ${targetAmount} USDC<br/>
                  • Duration: {durationHours} hours<br/>
                  • Creator: {wallet.publicKey?.toString().slice(0, 20)}...{wallet.publicKey?.toString().slice(-20)}<br/>
                  • Escrow: Time-locked smart contract
                </div>
              </div>

              <div style={{
                padding: '15px',
                backgroundColor: 'rgba(255, 255, 0, 0.1)',
                border: '1px solid #ffff00',
                borderRadius: '8px',
                marginBottom: '30px'
              }}>
                <div style={{ fontSize: '14px', color: '#ffff00', fontWeight: 'bold', marginBottom: '8px' }}>
                  ⚠️ WARNING:
                </div>
                <div style={{ fontSize: '13px', color: '#ffffff', lineHeight: '1.5' }}>
                  This will create a new campaign on the Solana blockchain. Transaction fees will apply.
                  Make sure your wallet has sufficient SOL for transaction fees.
                </div>
              </div>

              <div style={{ display: 'flex', gap: '15px' }}>
                <button
                  onClick={prevStep}
                  style={{
                    flex: 1,
                    background: 'transparent',
                    color: '#cccccc',
                    border: '2px solid #cccccc',
                    padding: '12px 24px',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontFamily: 'Courier New, monospace',
                    textTransform: 'uppercase'
                  }}
                >
                                      Back
                </button>
                <button
                  onClick={nextStep}
                  style={{
                    flex: 2,
                    background: 'transparent',
                    color: '#00ff41',
                    border: '3px solid #00ff41',
                    padding: '12px 24px',
                    fontSize: '16px',
                    fontWeight: 'bold',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontFamily: 'Courier New, monospace',
                    textTransform: 'uppercase',
                    letterSpacing: '2px'
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
                                      Deploy Campaign
                </button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div>
              <div style={{ fontSize: '18px', color: '#00ff41', marginBottom: '20px', fontWeight: 'bold', textAlign: 'center' }}>
                [STEP_03] DEPLOYMENT
              </div>
              
              {!creating && !message && (
                <div style={{ textAlign: 'center', marginBottom: '30px' }}>
                  <div style={{ fontSize: '16px', color: '#ffffff', marginBottom: '20px' }}>
                    Ready to deploy your crowdfunding campaign?
                  </div>
                  <button
                    onClick={createCampaign}
                    disabled={!wallet.publicKey}
                    style={{
                      background: 'transparent',
                      color: '#00ff41',
                      border: '3px solid #00ff41',
                      padding: '20px 40px',
                      fontSize: '18px',
                      fontWeight: 'bold',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontFamily: 'Courier New, monospace',
                      textTransform: 'uppercase',
                      letterSpacing: '2px',
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
                    {!wallet.publicKey ? 'Connect Wallet' : 'Initialize Campaign'}
                  </button>
                </div>
              )}

              {(creating || message) && (
                <div style={{ marginBottom: '30px' }}>
                  <div style={{ fontSize: '16px', color: '#00ff41', marginBottom: '15px', fontWeight: 'bold' }}>
                    Deploying Campaign...
                  </div>
                  
                  {creating && (
                    <div>
                      <div style={{ fontSize: '14px', color: '#ffffff', marginBottom: '10px' }}>
                        • Connecting to Solana network...
                      </div>
                      <div style={{ fontSize: '14px', color: '#ffffff', marginBottom: '10px' }}>
                        • Preparing smart contract deployment...
                      </div>
                    </div>
                  )}
                  
                  {message && (
                    <div style={{
                      fontSize: '14px',
                      color: message.includes('[ERROR]') ? '#ff4444' : 
                             message.includes('[SUCCESS]') ? '#00ff41' : '#ffffff',
                      marginBottom: '10px',
                      fontFamily: 'Courier New, monospace',
                      fontWeight: 'bold'
                    }}>
                      {message}
                    </div>
                  )}
                </div>
              )}

              {!creating && (
                <div style={{ display: 'flex', gap: '15px' }}>
                  <button
                    onClick={prevStep}
                    disabled={creating}
                    style={{
                      flex: 1,
                      background: 'transparent',
                      color: '#cccccc',
                      border: '2px solid #cccccc',
                      padding: '12px 24px',
                      fontSize: '14px',
                      fontWeight: 'bold',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontFamily: 'Courier New, monospace',
                      textTransform: 'uppercase',
                      opacity: creating ? 0.5 : 1
                    }}
                  >
                    Back
                  </button>
                </div>
              )}
            </div>
          )}

          {/* Terminal cursor */}
          <div style={{
            marginTop: '30px',
            fontSize: '14px',
            color: '#00ff41',
            fontFamily: 'Courier New, monospace',
            textAlign: 'center'
          }}>
            <span style={{
              animation: 'blink 1s infinite',
              backgroundColor: '#00ff41',
              color: '#000000',
              padding: '0 2px'
            }}>_</span>
          </div>
        </div>
      </div>

      {/* CSS for animations */}
      <style jsx>{`
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
      `}</style>
    </div>
  );
}
