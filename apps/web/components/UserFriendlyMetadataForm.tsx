"use client";
import { useCallback, useState } from 'react';
import { useWallet } from '@solana/wallet-adapter-react';
import { useConnection } from '@solana/wallet-adapter-react';
import { getProgram } from '../lib/anchorClient';
import { deriveCampaignPda } from '../lib/pdas';

// This would typically be done server-side for security
async function uploadToIPFS(metadata: any): Promise<{ uri: string; hash: string }> {
  // Placeholder implementation - in production, this should use a proper IPFS service
  const metadataString = JSON.stringify(metadata);
  
  // For now, return a mock response
  // In production, you'd upload to IPFS and get the hash
  return {
    uri: `https://ipfs.io/ipfs/QmMockHash${Date.now()}`,
    hash: '0x' + Array.from(new TextEncoder().encode(metadataString).slice(0, 32))
      .map(b => b.toString(16).padStart(2, '0')).join('')
  };
}

export function UserFriendlyMetadataForm({ onClose }: { onClose?: () => void }) {
  const { connection } = useConnection();
  const wallet = useWallet();
  
  // Basic project info
  const [projectName, setProjectName] = useState<string>('');
  const [description, setDescription] = useState<string>('');
  const [website, setWebsite] = useState<string>('');
  const [twitter, setTwitter] = useState<string>('');
  const [telegram, setTelegram] = useState<string>('');
  const [discord, setDiscord] = useState<string>('');
  
  // Team info
  const [teamDescription, setTeamDescription] = useState<string>('');
  
  // Tokenomics
  const [totalSupply, setTotalSupply] = useState<string>('');
  const [supplyDescription, setSupplyDescription] = useState<string>('');
  
  const [message, setMessage] = useState<string>('');
  const [loading, setLoading] = useState(false);

  const onSubmit = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    if (!wallet.publicKey || !wallet.signTransaction) {
      setMessage('Connect wallet to submit');
      return;
    }
    
    if (!projectName || !description) {
      setMessage('Please fill in at least the project name and description');
      return;
    }
    
    setLoading(true);
    setMessage('');
    
    try {
      // Create metadata object based on DEX Screener requirements
      const metadata = {
        name: projectName,
        description: description,
        website: website || undefined,
        links: {
          twitter: twitter ? `https://twitter.com/${twitter.replace('@', '')}` : undefined,
          telegram: telegram ? `https://t.me/${telegram}` : undefined,
          discord: discord || undefined,
        },
        team: teamDescription ? {
          description: teamDescription
        } : undefined,
        tokenomics: {
          totalSupply: totalSupply || undefined,
          description: supplyDescription || undefined,
        },
        submittedAt: new Date().toISOString(),
      };

      // Upload to IPFS (in production, this should be done server-side)
      setMessage('Uploading metadata to IPFS...');
      const { uri, hash } = await uploadToIPFS(metadata);
      
      // Submit to blockchain
      setMessage('Submitting to blockchain...');
      const program = getProgram(connection, wallet as any);
      const [campaignPda] = deriveCampaignPda(wallet.publicKey, program.programId);

      // Convert hex string to byte array for hash
      const hashBytes = Array.from(
        new Uint8Array(
          hash.slice(2).match(/.{1,2}/g)?.map(byte => parseInt(byte, 16)) || []
        )
      );

      await program.methods
        .submitMetadata(uri, hashBytes)
        .accounts({ submitter: wallet.publicKey, campaign: campaignPda })
        .rpc();
        
      setMessage('Metadata submitted successfully! Your token info will be reviewed and appear on DEX Screener soon.');
      
      // Clear form
      setProjectName('');
      setDescription('');
      setWebsite('');
      setTwitter('');
      setTelegram('');
      setDiscord('');
      setTeamDescription('');
      setTotalSupply('');
      setSupplyDescription('');
      
    } catch (e: any) {
      setMessage(e.message || 'Failed to submit metadata');
    } finally {
      setLoading(false);
    }
  }, [connection, wallet, projectName, description, website, twitter, telegram, discord, teamDescription, totalSupply, supplyDescription]);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '20px',
        padding: '40px',
        maxWidth: '600px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto',
        position: 'relative'
      }}>
        {onClose && (
          <button
            onClick={onClose}
            style={{
              position: 'absolute',
              top: '20px',
              right: '20px',
              background: 'none',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#718096'
            }}
          >
            ×
          </button>
        )}
        
        <h2 style={{ marginTop: 0, marginBottom: '30px', color: '#2d3748' }}>
          Submit Token Information
        </h2>
        
        <p style={{ color: '#718096', marginBottom: '30px', fontSize: '14px' }}>
          Provide basic information about your token project. This information will be displayed on DEX Screener 
          to help users understand your project better.
        </p>

        <form onSubmit={onSubmit} style={{ display: 'grid', gap: '20px' }}>
          {/* Basic Information */}
          <div>
            <h3 style={{ margin: '0 0 15px 0', color: '#2d3748', fontSize: '18px' }}>Basic Information</h3>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '6px', color: '#4a5568', fontWeight: '600' }}>
                Project Name *
              </label>
              <input
                type="text"
                value={projectName}
                onChange={(e) => setProjectName(e.target.value)}
                placeholder="e.g., My Awesome Token"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '16px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
                required
              />
            </div>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '6px', color: '#4a5568', fontWeight: '600' }}>
                Description *
              </label>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe your project, its purpose, and what makes it unique..."
                rows={4}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '16px',
                  outline: 'none',
                  resize: 'vertical',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit'
                }}
                required
              />
            </div>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '6px', color: '#4a5568', fontWeight: '600' }}>
                Website
              </label>
              <input
                type="url"
                value={website}
                onChange={(e) => setWebsite(e.target.value)}
                placeholder="https://yourproject.com"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '16px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* Social Links */}
          <div>
            <h3 style={{ margin: '0 0 15px 0', color: '#2d3748', fontSize: '18px' }}>Social Links</h3>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '6px', color: '#4a5568', fontWeight: '600' }}>
                Twitter Handle
              </label>
              <input
                type="text"
                value={twitter}
                onChange={(e) => setTwitter(e.target.value)}
                placeholder="yourproject (without @)"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '16px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '6px', color: '#4a5568', fontWeight: '600' }}>
                Telegram
              </label>
              <input
                type="text"
                value={telegram}
                onChange={(e) => setTelegram(e.target.value)}
                placeholder="yourproject"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '16px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '6px', color: '#4a5568', fontWeight: '600' }}>
                Discord Invite
              </label>
              <input
                type="url"
                value={discord}
                onChange={(e) => setDiscord(e.target.value)}
                placeholder="https://discord.gg/yourinvite"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '16px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
          </div>

          {/* Team Information */}
          <div>
            <h3 style={{ margin: '0 0 15px 0', color: '#2d3748', fontSize: '18px' }}>Team Information</h3>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '6px', color: '#4a5568', fontWeight: '600' }}>
                Team Description
              </label>
              <textarea
                value={teamDescription}
                onChange={(e) => setTeamDescription(e.target.value)}
                placeholder="Tell users about your team, experience, and background..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '16px',
                  outline: 'none',
                  resize: 'vertical',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit'
                }}
              />
            </div>
          </div>

          {/* Tokenomics */}
          <div>
            <h3 style={{ margin: '0 0 15px 0', color: '#2d3748', fontSize: '18px' }}>Tokenomics</h3>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '6px', color: '#4a5568', fontWeight: '600' }}>
                Total Supply
              </label>
              <input
                type="text"
                value={totalSupply}
                onChange={(e) => setTotalSupply(e.target.value)}
                placeholder="e.g., 1,000,000,000"
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '16px',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '6px', color: '#4a5568', fontWeight: '600' }}>
                Supply & Distribution Notes
              </label>
              <textarea
                value={supplyDescription}
                onChange={(e) => setSupplyDescription(e.target.value)}
                placeholder="Explain token distribution, any locked supplies, etc..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '8px',
                  fontSize: '16px',
                  outline: 'none',
                  resize: 'vertical',
                  boxSizing: 'border-box',
                  fontFamily: 'inherit'
                }}
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading || !wallet.publicKey}
            style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              padding: '16px 32px',
              fontSize: '16px',
              fontWeight: '600',
              borderRadius: '12px',
              cursor: 'pointer',
              opacity: (loading || !wallet.publicKey) ? 0.7 : 1,
              marginTop: '10px'
            }}
          >
            {loading ? 'Submitting...' : 
             !wallet.publicKey ? 'Connect Wallet to Submit' : 
             'Submit Token Information'}
          </button>

          {message && (
            <div style={{
              padding: '12px 16px',
              borderRadius: '8px',
              backgroundColor: message.includes('successfully') ? '#c6f6d5' : '#fed7d7',
              color: message.includes('successfully') ? '#2f855a' : '#c53030',
              fontSize: '14px'
            }}>
              {message}
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
