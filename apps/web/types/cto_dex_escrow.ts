import { PublicKey } from '@solana/web3.js';
import { BN } from '@coral-xyz/anchor';

export interface Campaign {
  creator: PublicKey;
  payMint: PublicKey;
  bump: number;
  targetAmount: BN;
  totalContributed: BN;
  deadline: BN;
  status: number;
  topContributor: PublicKey;
  topContributorAmount: BN;
  metadataUri: string;
  metadataHash: number[];
  merchantHash: number[];
  merchantHashSet: boolean;
}

export interface Contribution {
  contributor: PublicKey;
  campaign: PublicKey;
  amount: BN;
  refunded: boolean;
}

export type CtoDexEscrowProgram = {
  version: '0.1.0';
  name: 'cto_dex_escrow';
  instructions: [
    {
      name: 'initCampaign';
      accounts: [
        { name: 'creator'; isMut: true; isSigner: true },
        { name: 'payMint'; isMut: false; isSigner: false },
        { name: 'campaign'; isMut: true; isSigner: false },
        { name: 'vault'; isMut: true; isSigner: false },
        { name: 'systemProgram'; isMut: false; isSigner: false },
        { name: 'tokenProgram'; isMut: false; isSigner: false },
        { name: 'associatedTokenProgram'; isMut: false; isSigner: false },
        { name: 'rent'; isMut: false; isSigner: false }
      ];
      args: [
        { name: 'targetAmount'; type: 'u64' },
        { name: 'deadlineUnix'; type: 'i64' }
      ];
    },
    {
      name: 'contribute';
      accounts: [
        { name: 'contributor'; isMut: true; isSigner: true },
        { name: 'campaign'; isMut: true; isSigner: false },
        { name: 'payMint'; isMut: false; isSigner: false },
        { name: 'contributorAta'; isMut: true; isSigner: false },
        { name: 'vault'; isMut: true; isSigner: false },
        { name: 'contribution'; isMut: true; isSigner: false },
        { name: 'systemProgram'; isMut: false; isSigner: false },
        { name: 'tokenProgram'; isMut: false; isSigner: false },
        { name: 'associatedTokenProgram'; isMut: false; isSigner: false },
        { name: 'rent'; isMut: false; isSigner: false }
      ];
      args: [{ name: 'amount'; type: 'u64' }];
    },
    {
      name: 'submitMetadata';
      accounts: [
        { name: 'submitter'; isMut: false; isSigner: true },
        { name: 'campaign'; isMut: true; isSigner: false }
      ];
      args: [
        { name: 'uri'; type: 'string' },
        { name: 'metadataHash'; type: { array: ['u8', 32] } }
      ];
    },
    {
      name: 'finalize';
      accounts: [{ name: 'campaign'; isMut: true; isSigner: false }];
      args: [];
    },
    {
      name: 'refund';
      accounts: [
        { name: 'contributor'; isMut: true; isSigner: true },
        { name: 'campaign'; isMut: true; isSigner: false },
        { name: 'payMint'; isMut: false; isSigner: false },
        { name: 'contributorAta'; isMut: true; isSigner: false },
        { name: 'vault'; isMut: true; isSigner: false },
        { name: 'contribution'; isMut: true; isSigner: false },
        { name: 'tokenProgram'; isMut: false; isSigner: false }
      ];
      args: [];
    },
    {
      name: 'setMerchantHash';
      accounts: [
        { name: 'authority'; isMut: false; isSigner: true },
        { name: 'campaign'; isMut: true; isSigner: false }
      ];
      args: [{ name: 'merchantHash'; type: { array: ['u8', 32] } }];
    },
    {
      name: 'payout';
      accounts: [
        { name: 'campaign'; isMut: true; isSigner: false },
        { name: 'payMint'; isMut: false; isSigner: false },
        { name: 'vault'; isMut: true; isSigner: false },
        { name: 'merchantAta'; isMut: true; isSigner: false },
        { name: 'tokenProgram'; isMut: false; isSigner: false }
      ];
      args: [{ name: 'amount'; type: 'u64' }];
    }
  ];
  accounts: [
    {
      name: 'campaign';
      type: {
        kind: 'struct';
        fields: [
          { name: 'creator'; type: 'publicKey' },
          { name: 'payMint'; type: 'publicKey' },
          { name: 'bump'; type: 'u8' },
          { name: 'targetAmount'; type: 'u64' },
          { name: 'totalContributed'; type: 'u64' },
          { name: 'deadline'; type: 'i64' },
          { name: 'status'; type: 'u8' },
          { name: 'topContributor'; type: 'publicKey' },
          { name: 'topContributorAmount'; type: 'u64' },
          { name: 'metadataUri'; type: 'string' },
          { name: 'metadataHash'; type: { array: ['u8', 32] } },
          { name: 'merchantHash'; type: { array: ['u8', 32] } },
          { name: 'merchantHashSet'; type: 'bool' }
        ];
      };
    },
    {
      name: 'contribution';
      type: {
        kind: 'struct';
        fields: [
          { name: 'contributor'; type: 'publicKey' },
          { name: 'campaign'; type: 'publicKey' },
          { name: 'amount'; type: 'u64' },
          { name: 'refunded'; type: 'bool' }
        ];
      };
    }
  ];
  types: [];
  errors: [
    { code: 6000; name: 'InvalidAmount'; msg: 'Invalid amount' },
    { code: 6001; name: 'InvalidDeadline'; msg: 'Invalid deadline' },
    { code: 6002; name: 'WrongStatus'; msg: 'Wrong status for this action' },
    { code: 6003; name: 'DeadlinePassed'; msg: 'Deadline passed' },
    { code: 6004; name: 'Overflow'; msg: 'Overflow' },
    { code: 6005; name: 'Unauthorized'; msg: 'Unauthorized' },
    { code: 6006; name: 'UriTooLong'; msg: 'URI too long' },
    { code: 6007; name: 'GoalNotMet'; msg: 'Goal not met' },
    { code: 6008; name: 'AlreadyRefunded'; msg: 'Already refunded' },
    { code: 6009; name: 'NothingToRefund'; msg: 'Nothing to refund' },
    { code: 6010; name: 'MerchantHashNotSet'; msg: 'Merchant hash not set' },
    { code: 6011; name: 'MerchantHashMismatch'; msg: 'Merchant hash mismatch' }
  ];
};
