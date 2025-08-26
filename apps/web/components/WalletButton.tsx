import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';

// Dynamically import the wallet button to avoid SSR issues
const WalletMultiButtonDynamic = dynamic(
  async () => (await import('@solana/wallet-adapter-react-ui')).WalletMultiButton,
  { 
    ssr: false,
    loading: () => (
      <button style={{
        background: 'transparent',
        border: '2px solid #00ff41',
        padding: '10px 20px',
        borderRadius: '6px',
        color: '#00ff41',
        fontSize: '14px',
        fontFamily: 'Courier New, monospace',
        textTransform: 'uppercase',
        letterSpacing: '1px',
        fontWeight: 'bold',
        cursor: 'pointer',
        transition: 'all 0.3s ease'
      }}>
        [LOADING...]
      </button>
    )
  }
);

export default function WalletButton() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <button style={{
        background: 'transparent',
        border: '2px solid #00ff41',
        padding: '10px 20px',
        borderRadius: '6px',
        color: '#00ff41',
        fontSize: '14px',
        fontFamily: 'Courier New, monospace',
        textTransform: 'uppercase',
        letterSpacing: '1px',
        fontWeight: 'bold',
        cursor: 'pointer',
        transition: 'all 0.3s ease'
      }}>
        [LOADING...]
      </button>
    );
  }

  return (
    <div suppressHydrationWarning>
      <WalletMultiButtonDynamic />
      
      {/* Custom CSS to override default wallet button styles */}
      <style jsx global>{`
        .wallet-adapter-button {
          background: transparent !important;
          border: 2px solid #00ff41 !important;
          border-radius: 6px !important;
          color: #00ff41 !important;
          font-family: 'Courier New', monospace !important;
          font-size: 14px !important;
          font-weight: bold !important;
          text-transform: uppercase !important;
          letter-spacing: 1px !important;
          padding: 10px 20px !important;
          transition: all 0.3s ease !important;
          box-shadow: none !important;
          height: auto !important;
          min-height: auto !important;
        }
        
        .wallet-adapter-button:not([disabled]):hover {
          background: #00ff41 !important;
          color: #000000 !important;
          border-color: #00ff41 !important;
          box-shadow: 0 0 15px rgba(0, 255, 65, 0.6) !important;
          transform: translateY(-1px) !important;
        }
        
        .wallet-adapter-button:not([disabled]):focus {
          background: #00ff41 !important;
          color: #000000 !important;
          border-color: #00ff41 !important;
          box-shadow: 0 0 15px rgba(0, 255, 65, 0.6) !important;
        }
        
        .wallet-adapter-button[disabled] {
          background: rgba(0, 255, 65, 0.2) !important;
          color: #666666 !important;
          border-color: #666666 !important;
          cursor: not-allowed !important;
        }
        
        .wallet-adapter-button-trigger {
          background: transparent !important;
          border: 2px solid #00ff41 !important;
          border-radius: 6px !important;
          color: #00ff41 !important;
          font-family: 'Courier New', monospace !important;
          font-size: 14px !important;
          font-weight: bold !important;
          text-transform: uppercase !important;
          letter-spacing: 1px !important;
          padding: 10px 20px !important;
        }
        
        .wallet-adapter-modal-wrapper {
          background: rgba(0, 0, 0, 0.9) !important;
        }
        
        .wallet-adapter-modal {
          background: #0a0a0a !important;
          border: 2px solid #00ff41 !important;
          border-radius: 12px !important;
          box-shadow: 0 0 30px rgba(0, 255, 65, 0.3) !important;
        }
        
        .wallet-adapter-modal-title {
          color: #00ff41 !important;
          font-family: 'Courier New', monospace !important;
          font-size: 18px !important;
          font-weight: bold !important;
          text-transform: uppercase !important;
          letter-spacing: 2px !important;
        }
        
        .wallet-adapter-modal-list {
          background: transparent !important;
        }
        
        .wallet-adapter-modal-list li {
          background: rgba(0, 255, 65, 0.05) !important;
          border: 1px solid rgba(0, 255, 65, 0.3) !important;
          border-radius: 8px !important;
          margin-bottom: 8px !important;
        }
        
        .wallet-adapter-modal-list li:hover {
          background: rgba(0, 255, 65, 0.1) !important;
          border-color: #00ff41 !important;
        }
        
        .wallet-adapter-modal-list-more {
          color: #00ff41 !important;
          font-family: 'Courier New', monospace !important;
        }
        
        .wallet-adapter-modal-middle {
          color: #ffffff !important;
          font-family: 'Courier New', monospace !important;
        }
        
        .wallet-adapter-modal-container {
          background: #0a0a0a !important;
        }
        
        /* Dropdown menu styling */
        .wallet-adapter-dropdown {
          background: #0a0a0a !important;
          border: 2px solid #00ff41 !important;
          border-radius: 8px !important;
          box-shadow: 0 0 20px rgba(0, 255, 65, 0.3) !important;
        }
        
        .wallet-adapter-dropdown-list {
          background: transparent !important;
        }
        
        .wallet-adapter-dropdown-list-item {
          background: transparent !important;
          color: #ffffff !important;
          font-family: 'Courier New', monospace !important;
          font-size: 14px !important;
          padding: 12px 16px !important;
          border-bottom: 1px solid rgba(0, 255, 65, 0.2) !important;
        }
        
        .wallet-adapter-dropdown-list-item:hover {
          background: rgba(0, 255, 65, 0.1) !important;
          color: #00ff41 !important;
        }
        
        .wallet-adapter-dropdown-list-item:last-child {
          border-bottom: none !important;
        }
      `}</style>
    </div>
  );
}
