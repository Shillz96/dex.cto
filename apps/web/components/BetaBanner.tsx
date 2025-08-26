import React from 'react';

export const BetaBanner: React.FC = () => {
  return (
    <div
      style={{
        background: '#FFF3CD',
        color: '#664D03',
        border: '1px solid #FFEC9E',
        padding: '10px 16px',
        textAlign: 'center',
        fontSize: 14,
        lineHeight: 1.4,
        position: 'sticky',
        top: 0,
        zIndex: 1000,
      }}
      role="status"
      aria-live="polite"
    >
      <strong>Beta:</strong> This dApp is in a public beta. Mainnet program deployment is queued pending
      final wallet funding from creator rewards. Functionality is complete and will go live immediately after
      funding. Thank you for your patience!
    </div>
  );
};

export default BetaBanner;


