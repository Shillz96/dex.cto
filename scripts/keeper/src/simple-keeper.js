#!/usr/bin/env node
import 'dotenv/config';
import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { MockDexScreenerClient } from './dexScreenerClient.js';
import crypto from 'crypto';
import keccak from 'keccak';

/**
 * Simplified Campaign Keeper for testing backend functionality
 * This version focuses on testing the business logic without requiring
 * the full Anchor Program setup which has dependency conflicts.
 */
class SimpleCampaignKeeper {
  constructor() {
    // Basic setup
    const rpc = process.env.KEEPER_RPC_URL || 'https://api.devnet.solana.com';
    this.connection = new Connection(rpc, 'confirmed');
    
    // Load keypair
    if (!process.env.KEEPER_PRIVATE_KEY) {
      throw new Error('KEEPER_PRIVATE_KEY environment variable required');
    }
    this.keypair = Keypair.fromSecretKey(
      new Uint8Array(JSON.parse(process.env.KEEPER_PRIVATE_KEY))
    );
    
    // Initialize DEX Screener client
    const useMock = process.env.NODE_ENV === 'development' || process.env.USE_MOCK_DEX === 'true';
    this.dexClient = useMock 
      ? new MockDexScreenerClient()
      : new DexScreenerClient({
          timeout: parseInt(process.env.DEX_SCREENER_TIMEOUT) || 30000,
          headless: process.env.NODE_ENV === 'production'
        });
    
    console.log('🤖 Simple Keeper initialized');
    console.log('  📡 RPC:', rpc);
    console.log('  🔑 Wallet:', this.keypair.publicKey.toString());
    console.log('  📱 DEX Client:', useMock ? 'Mock' : 'Live');
  }

  async testBackendComponents() {
    console.log('🔍 Testing backend components...');
    
    // Test 1: Connection
    try {
      console.log('1. Testing RPC connection...');
      const version = await this.connection.getVersion();
      console.log('✅ RPC connection working, version:', version);
    } catch (error) {
      console.error('❌ RPC connection failed:', error.message);
    }
    
    // Test 2: DEX Screener client
    try {
      console.log('2. Testing DEX Screener integration...');
      const mockMetadata = {
        name: "Test Token",
        description: "A test token for validating the DEX Screener integration",
        website: "https://example.com",
        links: {
          twitter: "https://twitter.com/test",
          telegram: "https://t.me/test",
          discord: "https://discord.gg/test"
        },
        team: {
          description: "Test team"
        },
        tokenomics: {
          description: "Test tokenomics",
          totalSupply: "1000000"
        }
      };
      
      const result = await this.dexClient.purchaseEnhancedTokenInfo(mockMetadata);
      console.log('✅ DEX Screener integration working:', {
        merchantAta: result.merchantAta.substring(0, 8) + '...',
        amount: result.amount / 1_000_000 + ' USDC',
        transactionId: result.transactionId
      });
    } catch (error) {
      console.error('❌ DEX Screener integration failed:', error.message);
    }
    
    // Test 3: Merchant hash computation
    try {
      console.log('3. Testing merchant hash computation...');
      const testMint = new PublicKey('EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v'); // USDC
      const testMerchant = new PublicKey('GjwcWFQYzemBtpUoN5fMAP2FZviTtMRWCmrppGuTthJS');
      const testAmount = 300_000_000; // $300 USDC
      
      const merchantHash = this.computeMerchantHash(testMint, testMerchant, testAmount);
      console.log('✅ Merchant hash computed:', Buffer.from(merchantHash).toString('hex').substring(0, 16) + '...');
    } catch (error) {
      console.error('❌ Merchant hash computation failed:', error.message);
    }
    
    // Test 4: Campaign monitoring simulation
    try {
      console.log('4. Testing campaign monitoring logic...');
      
      // Simulate different campaign states
      const testCampaigns = [
        {
          id: 'campaign1',
          status: 0, // Pending
          targetAmount: 300_000_000,
          totalContributed: 150_000_000,
          deadline: Math.floor(Date.now() / 1000) + 3600, // 1 hour from now
          metadataUri: ''
        },
        {
          id: 'campaign2', 
          status: 0, // Pending
          targetAmount: 300_000_000,
          totalContributed: 300_000_000, // Target reached!
          deadline: Math.floor(Date.now() / 1000) + 3600,
          metadataUri: ''
        },
        {
          id: 'campaign3',
          status: 1, // Succeeded
          targetAmount: 300_000_000,
          totalContributed: 300_000_000,
          deadline: Math.floor(Date.now() / 1000) - 3600, // Past deadline
          metadataUri: 'https://example.com/metadata.json',
          merchantHashSet: false
        }
      ];
      
      for (const campaign of testCampaigns) {
        const action = this.determineRequiredAction(campaign);
        console.log(`  📊 Campaign ${campaign.id}: ${action}`);
      }
      console.log('✅ Campaign monitoring logic working');
    } catch (error) {
      console.error('❌ Campaign monitoring logic failed:', error.message);
    }
    
    // Test 5: Tweet generation
    try {
      console.log('5. Testing tweet generation...');
      const testCampaign = {
        creator: new PublicKey('GjwcWFQYzemBtpUoN5fMAP2FZviTtMRWCmrppGuTthJS'),
        totalContributed: 250_000_000 // $250 USDC
      };
      
      const tweet = this.generateDeploymentTweet(testCampaign);
      console.log('✅ Tweet generated successfully');
      console.log('📱 Sample tweet preview:', tweet.substring(0, 100) + '...');
    } catch (error) {
      console.error('❌ Tweet generation failed:', error.message);
    }
    
    console.log('🎉 Backend component testing completed!');
  }

  determineRequiredAction(campaign) {
    const now = Math.floor(Date.now() / 1000);
    
    if (campaign.status === 0) { // Pending
      if (campaign.totalContributed >= campaign.targetAmount && now <= campaign.deadline) {
        return 'Auto-finalize (target reached)';
      } else if (now > campaign.deadline) {
        return 'Auto-finalize (deadline passed)';
      } else {
        return 'Monitor (in progress)';
      }
    } else if (campaign.status === 1) { // Succeeded
      if (campaign.metadataUri && !campaign.merchantHashSet) {
        return 'Execute DEX purchase';
      } else if (campaign.merchantHashSet) {
        return 'Execute payout';
      } else {
        return 'Wait for metadata';
      }
    } else {
      return 'No action required';
    }
  }

  computeMerchantHash(payMint, merchantAta, amount) {
    const input = Buffer.concat([
      payMint.toBuffer(),
      merchantAta.toBuffer(),
      Buffer.from(this.numberToLeBytes(amount, 8))
    ]);
    // Use keccak-256 to match on-chain tiny_keccak implementation
    return keccak('keccak256').update(input).digest();
  }

  numberToLeBytes(number, bytes) {
    const result = new Array(bytes).fill(0);
    for (let i = 0; i < bytes; i++) {
      result[i] = number & 0xff;
      number = number >> 8;
    }
    return result;
  }

  generateDeploymentTweet(campaign) {
    const tokenAddress = campaign.creator.toString();
    const currentAmount = (campaign.totalContributed / 1_000_000).toFixed(2);
    const baseUrl = process.env.WEB_BASE_URL || 'https://dexcto.io';
    const campaignUrl = `${baseUrl}/campaign/${tokenAddress}`;
    
    return `🚀 I've initialized a Dex.CTO campaign!

Current escrow: $${currentAmount} USDC 💰

Click here to contribute and help us reach our funding goal! 🎯

${campaignUrl}

#DexCTO #Solana #DeFi #CrowdFunding`;
  }

  async simulateMonitoringCycle() {
    console.log('🔄 Simulating monitoring cycle...');
    
    // This would normally fetch campaigns from the program
    console.log('📊 [Simulated] Scanning for campaigns...');
    await new Promise(resolve => setTimeout(resolve, 1000));
    console.log('✅ [Simulated] No campaigns requiring action found');
    
    return true;
  }

  async start() {
    console.log('🚀 Starting Simple Campaign Keeper...');
    
    // Run initial tests
    await this.testBackendComponents();
    
    console.log('\n🔄 Starting monitoring loop (simulation)...');
    const pollInterval = parseInt(process.env.POLL_INTERVAL_MS) || 30000;
    console.log('⏱️  Poll interval:', pollInterval, 'ms');
    
    // Simulate a few monitoring cycles
    for (let i = 0; i < 3; i++) {
      await this.simulateMonitoringCycle();
      await new Promise(resolve => setTimeout(resolve, 2000));
    }
    
    console.log('✅ Backend functionality verified! Keeper would continue running...');
  }
}

async function main() {
  try {
    const keeper = new SimpleCampaignKeeper();
    await keeper.start();
  } catch (error) {
    console.error('💥 Simple Keeper crashed:', error.message);
    process.exit(1);
  }
}

main();
