import { useRouter } from 'next/router';
import { useState } from 'react';
import WalletButton from '../components/WalletButton';

export default function DemoPage() {
  const router = useRouter();
  
  // Sample campaign data
  const campaign = {
    tokenAddress: "7xKXtg2CW87d97TXJSDpbD5jBkheTqA83TZRuJosgAsU",
    tokenName: "PEPE",
    targetAmount: 300,
    totalContributed: 187.50,
    contributors: [
      { address: "9WzDXwBbmkg8ZTbNMqUxvQRAyrZzDsGYdLVL9zYtAWWM", amount: 25.0, timestamp: "2 hours ago" },
      { address: "4vJ5JnMwKxrMeGq2QwT8bQc3rS6fDhK9pLmN8xWqR2sX", amount: 50.0, timestamp: "3 hours ago" },
      { address: "Hq7K2BnVwFx4RpT6sN8mL9dGhJ3cP5vR1nX7wQ9sY2eA", amount: 30.0, timestamp: "4 hours ago" },
      { address: "2sR8vK3nP6wQ9tY5mL7dF1hJ4cG6bN9xZ8vC2sA5rE3p", amount: 15.0, timestamp: "4 hours ago" },
      { address: "8nM5tY2sR6vK3pL9dF7hJ1cG4bN6xZ8vC2sA9rE5qW3p", amount: 42.50, timestamp: "5 hours ago" },
      { address: "3pL9dF7hJ1cG4bN6xZ8vC2sA9rE5qW3pM5tY2sR6vK8n", amount: 25.0, timestamp: "6 hours ago" }
    ],
    deadline: Date.now() + (1.5 * 60 * 60 * 1000), // 1.5 hours from now
    status: "active"
  };

  const progress = (campaign.totalContributed / campaign.targetAmount) * 100;
  const remaining = Math.max(0, campaign.deadline - Date.now());
  const hoursLeft = Math.floor(remaining / (1000 * 60 * 60));
  const minutesLeft = Math.floor((remaining % (1000 * 60 * 60)) / (1000 * 60));

  const [contributionAmount, setContributionAmount] = useState('10');

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
        <div style={{ 
          fontSize: '14px', 
          color: '#ffff00',
          fontFamily: 'Courier New, monospace',
          backgroundColor: 'rgba(255, 255, 0, 0.1)',
          padding: '8px 16px',
          borderRadius: '4px',
          border: '1px solid #ffff00'
        }}>
          🎮 DEMO MODE
        </div>
        <WalletButton />
      </div>

      <div style={{
        maxWidth: '1000px',
        margin: '0 auto'
      }}>
        {/* Main Campaign Terminal */}
        <div style={{
          background: 'rgba(0, 20, 0, 0.9)',
          border: '2px solid #00ff41',
          borderRadius: '8px',
          padding: '40px',
          marginBottom: '30px',
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
              [ACTIVE_CAMPAIGN] - {campaign.tokenName}: {campaign.tokenAddress.slice(0, 8)}...{campaign.tokenAddress.slice(-8)}
            </div>
          </div>

          {/* Token Info Header */}
          <div style={{ textAlign: 'center', marginBottom: '40px' }}>
            <div style={{
              fontSize: '24px',
              color: '#00ff41',
              fontWeight: 'bold',
              marginBottom: '10px',
              textShadow: '0 0 15px #00ff41'
            }}>
              🐸 {campaign.tokenName} TOKEN CAMPAIGN
            </div>
            <div style={{ fontSize: '14px', color: '#cccccc', fontFamily: 'monospace' }}>
              {campaign.tokenAddress}
            </div>
          </div>

          {/* Campaign Status */}
          <div style={{
            padding: '25px',
            backgroundColor: 'rgba(0, 255, 65, 0.1)',
            border: '2px solid #00ff41',
            borderRadius: '12px',
            marginBottom: '30px'
          }}>
            <div style={{ fontSize: '18px', color: '#00ff41', marginBottom: '20px', fontWeight: 'bold', textAlign: 'center' }}>
              ⚡ CAMPAIGN STATUS
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
                  {progress.toFixed(1)}%
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
                  width: `${Math.min(progress, 100)}%`,
                  height: '100%',
                  background: `linear-gradient(90deg, 
                    #00ff41 0%, 
                    #00ff41 ${progress < 50 ? 100 : 50}%, 
                    #ffff00 ${progress < 50 ? 100 : 50}%, 
                    #ffff00 ${progress < 80 ? 100 : 80}%, 
                    #ff4444 ${progress < 80 ? 100 : 80}%, 
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
                <span style={{ color: '#00ff41' }}>${campaign.totalContributed} raised</span>
                <span style={{ color: '#ffffff' }}>${campaign.targetAmount} goal</span>
              </div>
            </div>

            {/* Stats Grid */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
              gap: '20px',
              marginBottom: '20px'
            }}>
              <div style={{ 
                textAlign: 'center', 
                padding: '20px', 
                backgroundColor: 'rgba(0, 255, 65, 0.1)', 
                border: '1px solid #00ff41',
                borderRadius: '8px'
              }}>
                <div style={{ fontSize: '28px', fontWeight: '700', color: '#00ff41', marginBottom: '5px' }}>
                  ${campaign.totalContributed}
                </div>
                <div style={{ fontSize: '12px', color: '#cccccc' }}>Total Raised</div>
              </div>
              
              <div style={{ 
                textAlign: 'center', 
                padding: '20px', 
                backgroundColor: 'rgba(0, 255, 65, 0.1)', 
                border: '1px solid #00ff41',
                borderRadius: '8px'
              }}>
                <div style={{ fontSize: '28px', fontWeight: '700', color: '#00ff41', marginBottom: '5px' }}>
                  {campaign.contributors.length}
                </div>
                <div style={{ fontSize: '12px', color: '#cccccc' }}>Contributors</div>
              </div>
              
              <div style={{ 
                textAlign: 'center', 
                padding: '20px', 
                backgroundColor: 'rgba(255, 255, 0, 0.1)', 
                border: '1px solid #ffff00',
                borderRadius: '8px'
              }}>
                <div style={{ fontSize: '28px', fontWeight: '700', color: '#ffff00', marginBottom: '5px' }}>
                  {hoursLeft}h {minutesLeft}m
                </div>
                <div style={{ fontSize: '12px', color: '#cccccc' }}>Time Left</div>
              </div>
              
              <div style={{ 
                textAlign: 'center', 
                padding: '20px', 
                backgroundColor: 'rgba(0, 255, 65, 0.1)', 
                border: '1px solid #00ff41',
                borderRadius: '8px'
              }}>
                <div style={{ fontSize: '28px', fontWeight: '700', color: '#00ff41', marginBottom: '5px' }}>
                  ${(campaign.totalContributed / campaign.contributors.length).toFixed(1)}
                </div>
                <div style={{ fontSize: '12px', color: '#cccccc' }}>Avg. Contribution</div>
              </div>
            </div>
          </div>

          {/* Contributors List */}
          <div style={{
            padding: '25px',
            backgroundColor: 'rgba(0, 20, 0, 0.5)',
            border: '1px solid #00ff41',
            borderRadius: '12px',
            marginBottom: '30px'
          }}>
            <div style={{ fontSize: '18px', color: '#00ff41', marginBottom: '20px', fontWeight: 'bold', textAlign: 'center' }}>
              👥 RECENT CONTRIBUTORS
            </div>
            
            <div style={{ display: 'grid', gap: '12px' }}>
              {campaign.contributors.map((contributor, index) => (
                <div key={index} style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '12px 16px',
                  backgroundColor: 'rgba(0, 255, 65, 0.05)',
                  border: '1px solid rgba(0, 255, 65, 0.3)',
                  borderRadius: '6px'
                }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                      width: '8px',
                      height: '8px',
                      borderRadius: '50%',
                      backgroundColor: '#00ff41',
                      boxShadow: '0 0 8px #00ff41'
                    }}></div>
                    <div style={{ fontSize: '14px', color: '#ffffff', fontFamily: 'monospace' }}>
                      {contributor.address.slice(0, 6)}...{contributor.address.slice(-6)}
                    </div>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
                    <div style={{ fontSize: '16px', color: '#00ff41', fontWeight: 'bold' }}>
                      ${contributor.amount}
                    </div>
                    <div style={{ fontSize: '12px', color: '#cccccc' }}>
                      {contributor.timestamp}
                    </div>
                  </div>
                </div>
              ))}
            </div>
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
              {[5, 10, 25, 50, 100].map(amount => (
                <button
                  key={amount}
                  onClick={() => setContributionAmount(amount.toString())}
                  style={{
                    padding: '10px 20px',
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
              style={{
                width: '100%',
                background: 'linear-gradient(135deg, #00ff41 0%, #00cc33 100%)',
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
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 15px rgba(0, 255, 65, 0.4)'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 8px 25px rgba(0, 255, 65, 0.6)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = '0 4px 15px rgba(0, 255, 65, 0.4)';
              }}
            >
              Contribute ${contributionAmount} • Help Reach Goal! 🚀
            </button>
            
            <div style={{ fontSize: '12px', color: '#cccccc', textAlign: 'center', marginTop: '10px' }}>
              ${(campaign.targetAmount - campaign.totalContributed).toFixed(2)} more needed to reach the goal
            </div>
          </div>

          {/* Live Updates */}
          <div style={{
            padding: '15px 20px',
            backgroundColor: 'rgba(0, 0, 0, 0.3)',
            border: '1px solid #333333',
            borderRadius: '6px',
            fontSize: '12px',
            color: '#cccccc'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{
                width: '6px',
                height: '6px',
                borderRadius: '50%',
                backgroundColor: '#00ff41',
                animation: 'pulse 2s infinite'
              }}></div>
              <span>Live updates • Campaign refreshes automatically</span>
            </div>
          </div>
        </div>

        {/* What Happens Next */}
        <div style={{
          background: 'rgba(0, 20, 0, 0.9)',
          border: '2px solid #00ff41',
          borderRadius: '8px',
          padding: '30px',
          boxShadow: '0 0 30px rgba(0, 255, 65, 0.3), inset 0 0 20px rgba(0, 255, 65, 0.1)'
        }}>
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
            📋 What Happens Next
          </div>
          
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '20px'
          }}>
            <div style={{ 
              padding: '20px', 
              backgroundColor: 'rgba(0, 255, 65, 0.08)', 
              border: '1px solid #00ff41',
              borderRadius: '8px'
            }}>
              <div style={{ fontSize: '15px', color: '#00ff41', marginBottom: '10px', fontWeight: 'bold' }}>
                ⏰ Goal Reached
              </div>
              <div style={{ fontSize: '14px', color: '#ffffff', lineHeight: '1.5' }}>
                Once $300 is raised, the campaign creator can submit enhanced token metadata
              </div>
            </div>
            
            <div style={{ 
              padding: '20px', 
              backgroundColor: 'rgba(0, 255, 65, 0.08)', 
              border: '1px solid #00ff41',
              borderRadius: '8px'
            }}>
              <div style={{ fontSize: '15px', color: '#00ff41', marginBottom: '10px', fontWeight: 'bold' }}>
                📝 Metadata Submission
              </div>
              <div style={{ fontSize: '14px', color: '#ffffff', lineHeight: '1.5' }}>
                Token information gets uploaded to IPFS and submitted to DEX Screener
              </div>
            </div>
            
            <div style={{ 
              padding: '20px', 
              backgroundColor: 'rgba(0, 255, 65, 0.08)', 
              border: '1px solid #00ff41',
              borderRadius: '8px'
            }}>
              <div style={{ fontSize: '15px', color: '#00ff41', marginBottom: '10px', fontWeight: 'bold' }}>
                🎉 Enhanced Listing
              </div>
              <div style={{ fontSize: '14px', color: '#ffffff', lineHeight: '1.5' }}>
                Your token gets enhanced info displayed on DEX Screener platform
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* CSS for animations */}
      <style jsx>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
    </div>
  );
}
