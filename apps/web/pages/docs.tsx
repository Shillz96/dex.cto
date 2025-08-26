import { useRouter } from 'next/router';
import WalletButton from '../components/WalletButton';

export default function DocsPage() {
  const router = useRouter();

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
        maxWidth: '1000px',
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
              [DOCUMENTATION_SYSTEM]
            </div>
          </div>

          {/* Title */}
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <div style={{
              fontSize: '24px',
              fontFamily: 'Courier New, monospace',
              color: '#00ff41',
              fontWeight: 'bold',
              letterSpacing: '3px',
              marginBottom: '15px',
              textShadow: '0 0 15px #00ff41'
            }}>
              ╔══════════════════════════════════╗<br/>
              ║         CTO.DEX DOCS             ║<br/>
              ║     TECHNICAL REFERENCE          ║<br/>
              ╚══════════════════════════════════╝
            </div>
          </div>

          {/* Intro */}
          <div style={{ marginBottom: '30px', textAlign: 'center' }}>
            <div style={{ fontSize: '18px', color: '#ffffff', fontFamily: 'Courier New, monospace' }}>
              Complete guide to using the CTO.DEX crowdfunding platform
            </div>
          </div>

          {/* Beta & Proof Note */}
          <div style={{
            padding: '16px',
            backgroundColor: 'rgba(255, 255, 0, 0.08)',
            border: '1px dashed #ffff00',
            borderRadius: '6px',
            marginBottom: '24px'
          }}>
            <div style={{ fontSize: '16px', color: '#ffff00', marginBottom: '8px', fontWeight: 'bold' }}>
              [BETA NOTICE]
            </div>
            <div style={{ fontSize: '14px', color: '#ffffff', lineHeight: 1.6 }}>
              The core protocol is built and ready for mainnet. We are currently in a beta phase while
              we fund the deployer wallet using creator reward earnings. As public proof of readiness,
              the repository contains complete program code, tests, and build artifacts. Deployment will
              occur immediately once the wallet is funded with sufficient SOL for rent and fees.
            </div>
          </div>

          {/* Documentation sections (public-safe) */}
          <div style={{ display: 'grid', gap: '30px' }}>
            
            {/* Overview */}
            <div style={{
              padding: '20px',
              backgroundColor: 'rgba(0, 255, 65, 0.05)',
              border: '1px solid #00ff41',
              borderRadius: '8px'
            }}>
              <div style={{ fontSize: '18px', color: '#00ff41', marginBottom: '15px', fontWeight: 'bold' }}>
                [SECTION_01] OVERVIEW
              </div>
              <div style={{ fontSize: '14px', color: '#ffffff', lineHeight: '1.6' }}>
                CTO.DEX is a decentralized crowdfunding protocol for funding DEX Screener Enhanced Token Info listings.
                Community members pool USDC to collectively pay for enhanced token metadata and social verification.
              </div>
            </div>

            {/* How it Works */}
            <div style={{
              padding: '20px',
              backgroundColor: 'rgba(0, 255, 65, 0.05)',
              border: '1px solid #00ff41',
              borderRadius: '8px'
            }}>
              <div style={{ fontSize: '18px', color: '#00ff41', marginBottom: '15px', fontWeight: 'bold' }}>
                [SECTION_02] HOW_IT_WORKS
              </div>
              <div style={{ fontSize: '14px', color: '#ffffff', lineHeight: '1.6' }}>
                <strong style={{ color: '#00ff41' }}>1. Campaign Creation:</strong><br/>
                • Token creators initialize a crowdfunding campaign<br/>
                • Set target amount ($300 USDC) and duration (2 hours max)<br/>
                • Smart contract escrows all contributions<br/><br/>
                
                <strong style={{ color: '#00ff41' }}>2. Community Funding:</strong><br/>
                • Community members contribute USDC to reach the goal<br/>
                • All funds are held in a time-locked escrow<br/>
                • Contributors can request refunds if goal isn't met<br/><br/>
                
                <strong style={{ color: '#00ff41' }}>3. Metadata Submission:</strong><br/>
                • Once funded, project team submits enhanced token info<br/>
                • Data includes: description, social links, team info, tokenomics<br/>
                • Metadata is uploaded to IPFS for decentralized storage<br/><br/>
                
                <strong style={{ color: '#00ff41' }}>4. DEX Screener Integration:</strong><br/>
                • Enhanced info appears on DEX Screener platform<br/>
                • Improves token visibility and credibility<br/>
                • Benefits entire community and token holders
              </div>
            </div>


            {/* Public Notice (for developers, point to repo docs) */}
            <div style={{
              padding: '20px',
              backgroundColor: 'rgba(0, 255, 65, 0.05)',
              border: '1px solid #00ff41',
              borderRadius: '8px'
            }}>
              <div style={{ fontSize: '18px', color: '#00ff41', marginBottom: '15px', fontWeight: 'bold' }}>
                [SECTION_03] DEVELOPER_DOCUMENTATION
              </div>
              <div style={{ fontSize: '14px', color: '#ffffff', lineHeight: '1.6' }}>
                Technical details (program IDs, instruction set, deployment guides) are not displayed on this
                public page. For full developer docs, please refer to the repository's documentation.
              </div>
            </div>

            {/* Quick Start */}
            <div style={{
              padding: '20px',
              backgroundColor: 'rgba(0, 255, 65, 0.05)',
              border: '1px solid #00ff41',
              borderRadius: '8px'
            }}>
              <div style={{ fontSize: '18px', color: '#00ff41', marginBottom: '15px', fontWeight: 'bold' }}>
                [SECTION_05] QUICK_START
              </div>
              <div style={{ fontSize: '14px', color: '#ffffff', lineHeight: '1.6' }}>
                <strong style={{ color: '#00ff41' }}>For Token Projects:</strong><br/>
                1. Connect your Solana wallet<br/>
                2. Enter your token contract address on the home page<br/>
                3. Click "Initialize Campaign" if no campaign exists<br/>
                4. Share the campaign with your community<br/>
                5. Submit metadata once the goal is reached<br/><br/>
                
                <strong style={{ color: '#00ff41' }}>For Contributors:</strong><br/>
                1. Connect your Solana wallet with USDC<br/>
                2. Navigate to a token's campaign page<br/>
                3. Enter contribution amount and confirm<br/>
                4. Track campaign progress<br/>
                5. Request refund if campaign fails<br/><br/>
                
                <strong style={{ color: '#00ff41' }}>Requirements:</strong><br/>
                • Solana wallet (Phantom, Solflare, etc.)<br/>
                • USDC tokens for contributions<br/>
                • SOL for transaction fees
              </div>
            </div>

            {/* Support */}
            <div style={{
              padding: '20px',
              backgroundColor: 'rgba(255, 255, 0, 0.1)',
              border: '1px solid #ffff00',
              borderRadius: '8px'
            }}>
              <div style={{ fontSize: '18px', color: '#ffff00', marginBottom: '15px', fontWeight: 'bold' }}>
                [SECTION_06] SUPPORT_&_RESOURCES
              </div>
              <div style={{ fontSize: '14px', color: '#ffffff', lineHeight: '1.6', textAlign: 'center' }}>
                For support, contact us on X:
                {' '}
                <a
                  href="https://x.com/ctodex"
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ color: '#ffff00', textDecoration: 'underline' }}
                >
                  @ctodex
                </a>
              </div>
            </div>
          </div>

          {/* Terminal cursor */}
          <div style={{
            marginTop: '40px',
            fontSize: '14px',
            color: '#00ff41',
            fontFamily: 'Courier New, monospace'
          }}>
            root@cto-dex:~$ <span style={{
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