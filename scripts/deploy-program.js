#!/usr/bin/env node

import 'dotenv/config';
import { Connection, Keypair, PublicKey } from '@solana/web3.js';
import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const PROGRAM_ID = process.env.PROGRAM_ID;
const CLUSTER = process.env.SOLANA_CLUSTER;
const KEYPAIR_PATH = process.env.PROGRAM_KEYPAIR;

async function deployProgram() {
  try {
    console.log('🚀 Starting program deployment...');
    // Fail fast for required env vars
    if (!PROGRAM_ID) {
      console.error('❌ PROGRAM_ID env var is required');
      process.exit(1);
    }
    if (!CLUSTER) {
      console.error('❌ SOLANA_CLUSTER env var is required (e.g., devnet, mainnet-beta)');
      process.exit(1);
    }
    if (!KEYPAIR_PATH) {
      console.error('❌ PROGRAM_KEYPAIR env var is required (path to program keypair JSON)');
      process.exit(1);
    }

    console.log(`📋 Program ID: ${PROGRAM_ID}`);
    
    // Check if keypair file exists
    if (!fs.existsSync(KEYPAIR_PATH)) {
      console.error(`❌ Program keypair file not found at ${KEYPAIR_PATH}.`);
      process.exit(1);
    }
    
    // Check if Anchor is installed
    try {
      execSync('anchor --version', { stdio: 'pipe' });
    } catch (error) {
      console.error('❌ Anchor CLI not found. Please install Anchor first.');
      console.log('💡 Run: npm install -g @coral-xyz/anchor-cli');
      process.exit(1);
    }
    
    // Build the program
    console.log('🔨 Building program...');
    execSync('anchor build', { stdio: 'inherit' });
    
    // Deploy to configured cluster
    console.log(`🚀 Deploying to ${CLUSTER}...`);
    execSync(`anchor deploy --provider.cluster ${CLUSTER} --program-keypair ${KEYPAIR_PATH}` , { stdio: 'inherit' });
    
    console.log('✅ Program deployed successfully!');
    console.log(`🔑 Program ID: ${PROGRAM_ID}`);
    console.log('📝 Remember to update your environment variables with the new Program ID.');
    
  } catch (error) {
    console.error('❌ Deployment failed:', error.message);
    process.exit(1);
  }
}

deployProgram();
