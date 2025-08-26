import { useState } from 'react';
import { useRouter } from 'next/router';
import { PublicKey } from '@solana/web3.js';
import Image from 'next/image';
import WalletButton from '../components/WalletButton';

export default function Home() {
  const router = useRouter();
  const [tokenAddress, setTokenAddress] = useState<string>('');
  const [error, setError] = useState<string>('');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    
    if (!tokenAddress.trim()) {
      setError('Please enter a token contract address');
      return;
    }

    try {
      // Validate the address format
      new PublicKey(tokenAddress);
      
      // Navigate to the campaign page with the token address
      router.push(`/campaign/${encodeURIComponent(tokenAddress)}`);
    } catch (err) {
      setError('Please enter a valid Solana token address');
    }
  };

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
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      fontFamily: 'Courier New, monospace',
      padding: '20px',
      color: '#00ff41'
    }}>
      {/* Header with wallet connection, docs link, and Twitter */}
      <div style={{
        position: 'absolute',
        top: '20px',
        left: '20px',
        right: '20px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center'
      }}>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <a 
            href="/docs" 
            style={{
              color: '#00ff41',
              textDecoration: 'none',
              fontSize: '16px',
              fontFamily: 'Courier New, monospace',
              fontWeight: 'bold',
              padding: '12px 20px',
              border: '2px solid #00ff41',
              borderRadius: '6px',
              transition: 'all 0.3s ease',
              background: 'rgba(0, 20, 0, 0.9)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#00ff41';
              e.currentTarget.style.color = '#000000';
              e.currentTarget.style.boxShadow = '0 0 15px rgba(0, 255, 65, 0.6)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(0, 20, 0, 0.9)';
              e.currentTarget.style.color = '#00ff41';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            📚 DOCS
          </a>
          <a 
            href="https://x.com/ctodex" 
            target="_blank"
            rel="noopener noreferrer"
            style={{
              color: '#00ff41',
              textDecoration: 'none',
              fontSize: '16px',
              fontFamily: 'Courier New, monospace',
              fontWeight: 'bold',
              padding: '12px 20px',
              border: '2px solid #00ff41',
              borderRadius: '6px',
              transition: 'all 0.3s ease',
              background: 'rgba(0, 20, 0, 0.9)'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#00ff41';
              e.currentTarget.style.color = '#000000';
              e.currentTarget.style.boxShadow = '0 0 15px rgba(0, 255, 65, 0.6)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'rgba(0, 20, 0, 0.9)';
              e.currentTarget.style.color = '#00ff41';
              e.currentTarget.style.boxShadow = 'none';
            }}
          >
            🐦 TWITTER
          </a>
        </div>
        <WalletButton />
      </div>

      {/* Terminal-style main content */}
      <div style={{
        background: 'rgba(0, 20, 0, 0.9)',
        border: '2px solid #00ff41',
        borderRadius: '8px',
        padding: '40px',
        maxWidth: '700px',
        width: '100%',
        boxShadow: '0 0 30px rgba(0, 255, 65, 0.3), inset 0 0 20px rgba(0, 255, 65, 0.1)',
        position: 'relative'
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
            [CTO.DEX_TERMINAL]
          </div>
        </div>

        {/* Logo section */}
        <div style={{ textAlign: 'center', marginBottom: '40px' }}>
          <div style={{
            fontSize: '28px',
            fontFamily: 'Courier New, monospace',
            color: '#00ff41',
            fontWeight: 'bold',
            letterSpacing: '4px',
            marginBottom: '20px',
            textShadow: '0 0 15px #00ff41',
            lineHeight: '1.2'
          }}>
            ╔═══════════════════════════════╗<br/>
            ║         CTO.DEX               ║<br/>
            ║    CROWDFUND TERMINAL         ║<br/>
            ╚═══════════════════════════════╝
          </div>
          <div style={{
            fontSize: '18px',
            color: '#ffffff',
            fontFamily: 'Courier New, monospace',
            marginBottom: '10px'
          }}>
            Token Crowdfunding Protocol v2.1
          </div>
        </div>

        {/* Mission Objective */}
        <div style={{ marginBottom: '40px' }}>
          <div style={{
            padding: '25px',
            backgroundColor: 'rgba(0, 255, 65, 0.1)',
            border: '2px solid #00ff41',
            borderRadius: '8px',
            marginBottom: '25px'
          }}>
            <div style={{ fontSize: '18px', color: '#00ff41', marginBottom: '15px', fontWeight: 'bold', textAlign: 'center' }}>
              🎯 MISSION OBJECTIVE
            </div>
            <div style={{ fontSize: '16px', color: '#ffffff', lineHeight: '1.7', textAlign: 'center' }}>
              Collectively fund DEX Screener Enhanced Token Info for your project.<br/>
              Community members contribute USDC to reach the $300 goal.<br/>
              Once funded, enhanced metadata gets deployed to DEX Screener.
            </div>
          </div>

          {/* Refund notice */}
          <div style={{
            padding: '20px',
            backgroundColor: 'rgba(0, 20, 0, 0.95)',
            border: '2px dashed #00ff41',
            borderRadius: '8px',
            boxShadow: '0 0 20px rgba(0, 255, 65, 0.15) inset',
            textAlign: 'center'
          }}>
            <div style={{
              fontSize: '16px',
              color: '#00ff41',
              fontFamily: 'Courier New, monospace',
              letterSpacing: '1px',
              fontWeight: 'bold',
              marginBottom: '8px'
            }}>
              [REFUND_POLICY]
            </div>
            <div style={{ fontSize: '15px', color: '#ffffff', lineHeight: '1.6' }}>
              If the funding goal is not reached by the deadline, all contributed USDC will be
              fully refunded to contributors.
            </div>
          </div>
        </div>

        {/* Input form */}
        <form onSubmit={handleSubmit} style={{ marginBottom: '30px' }}>
          <div style={{ marginBottom: '25px' }}>
            <div style={{ 
              color: '#ffffff', 
              fontSize: '18px', 
              marginBottom: '15px',
              fontFamily: 'Courier New, monospace',
              fontWeight: 'bold',
              textAlign: 'center'
            }}>
              Enter Token Contract Address
            </div>
            <input
              type="text"
              placeholder="Paste your Solana token address here..."
              value={tokenAddress}
              onChange={(e) => setTokenAddress(e.target.value)}
              style={{
                width: '100%',
                padding: '16px 20px',
                fontSize: '16px',
                backgroundColor: '#000000',
                border: '2px solid #00ff41',
                borderRadius: '6px',
                color: '#00ff41',
                outline: 'none',
                fontFamily: 'Courier New, monospace',
                boxSizing: 'border-box',
                minHeight: '50px'
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#ffffff';
                e.target.style.boxShadow = '0 0 15px rgba(0, 255, 65, 0.6)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#00ff41';
                e.target.style.boxShadow = 'none';
              }}
            />
          </div>
          
          <button
            type="submit"
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
              minWidth: '200px'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.backgroundColor = '#00ff41';
              e.currentTarget.style.color = '#000000';
              e.currentTarget.style.boxShadow = '0 0 25px rgba(0, 255, 65, 0.7)';
              e.currentTarget.style.transform = 'translateY(-2px)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.backgroundColor = 'transparent';
              e.currentTarget.style.color = '#00ff41';
              e.currentTarget.style.boxShadow = 'none';
              e.currentTarget.style.transform = 'translateY(0)';
            }}
          >
            Get Started
          </button>
        </form>

        {error && (
          <div style={{
            color: '#ff4444',
            backgroundColor: 'rgba(255, 68, 68, 0.15)',
            padding: '16px 20px',
            border: '2px solid #ff4444',
            borderRadius: '6px',
            fontSize: '15px',
            marginTop: '20px',
            fontFamily: 'Courier New, monospace',
            fontWeight: 'bold'
          }}>
            [ERROR] {error}
          </div>
        )}

                {/* System features */}
        <div style={{ marginTop: '50px' }}>
          <div style={{
            fontSize: '18px',
            color: '#00ff41',
            marginBottom: '25px',
            fontFamily: 'Courier New, monospace',
            borderBottom: '2px solid #00ff41',
            paddingBottom: '15px',
            fontWeight: 'bold',
            textAlign: 'center'
          }}>
            [SYSTEM_FEATURES]
          </div>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '20px'
          }}>
            <div style={{ 
              padding: '20px', 
              backgroundColor: 'rgba(0, 255, 65, 0.08)', 
              border: '2px solid #00ff41',
              borderRadius: '8px'
            }}>
              <div style={{ fontSize: '14px', color: '#00ff41', marginBottom: '10px', fontWeight: 'bold' }}>
                [MODULE_01] ENHANCED_LISTING
              </div>
              <div style={{ fontSize: '14px', color: '#ffffff', lineHeight: '1.5' }}>
                Deploy token metadata to DEX Screener enhanced info system
              </div>
            </div>
            
            <div style={{ 
              padding: '20px', 
              backgroundColor: 'rgba(0, 255, 65, 0.08)', 
              border: '2px solid #00ff41',
              borderRadius: '8px'
            }}>
              <div style={{ fontSize: '14px', color: '#00ff41', marginBottom: '10px', fontWeight: 'bold' }}>
                [MODULE_02] COMMUNITY_FUNDING
              </div>
              <div style={{ fontSize: '14px', color: '#ffffff', lineHeight: '1.5' }}>
                Distributed payment protocol for collective funding
              </div>
            </div>
            
            <div style={{ 
              padding: '20px', 
              backgroundColor: 'rgba(0, 255, 65, 0.08)', 
              border: '2px solid #00ff41',
              borderRadius: '8px'
            }}>
              <div style={{ fontSize: '14px', color: '#00ff41', marginBottom: '10px', fontWeight: 'bold' }}>
                [MODULE_03] SECURE_ESCROW
              </div>
              <div style={{ fontSize: '14px', color: '#ffffff', lineHeight: '1.5' }}>
                Time-locked USDC escrow with automatic execution
      </div>
      </div>
      </div>
      </div>

                {/* Blinking cursor */}
        <div style={{
          marginTop: '40px',
          fontSize: '16px',
          color: '#00ff41',
          fontFamily: 'Courier New, monospace',
          textAlign: 'center'
        }}>
          root@cto-dex:~$ <span style={{
            animation: 'blink 1s infinite',
            backgroundColor: '#00ff41',
            color: '#000000',
            padding: '0 4px',
            fontWeight: 'bold'
          }}>_</span>
      </div>
      </div>

      {/* CSS for blinking cursor */}
      <style jsx>{`
        @keyframes blink {
          0%, 50% { opacity: 1; }
          51%, 100% { opacity: 0; }
        }
        
        @media (max-width: 768px) {
          .ascii-art {
            font-size: 8px !important;
          }
        }
      `}</style>
    </div>
  );
}


