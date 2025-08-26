#!/usr/bin/env node
import 'dotenv/config';
import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { Program, AnchorProvider, Wallet } from '@coral-xyz/anchor';
import fs from 'fs';

console.log('🔍 Testing keeper initialization step by step...');

async function testKeeper() {
  try {
    // Test 1: Environment variables
    console.log('1. Testing environment variables...');
    const rpc = process.env.KEEPER_RPC_URL || 'https://api.devnet.solana.com';
    const programId = process.env.PROGRAM_ID || 'Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS';
    console.log('✅ RPC:', rpc);
    console.log('✅ Program ID:', programId);
    
    // Test 2: Connection
    console.log('2. Testing connection...');
    const connection = new Connection(rpc, 'confirmed');
    console.log('✅ Connection created');
    
    // Test 3: Keypair
    console.log('3. Testing keypair...');
    if (!process.env.KEEPER_PRIVATE_KEY) {
      throw new Error('KEEPER_PRIVATE_KEY not found');
    }
    const keypair = Keypair.fromSecretKey(
      new Uint8Array(JSON.parse(process.env.KEEPER_PRIVATE_KEY))
    );
    console.log('✅ Keypair loaded:', keypair.publicKey.toString());
    
    // Test 4: Program ID parsing
    console.log('4. Testing program ID parsing...');
    const programPublicKey = new PublicKey(programId);
    console.log('✅ Program PublicKey created:', programPublicKey.toString());
    
    // Test 5: IDL loading
    console.log('5. Testing IDL loading...');
    const IDL_PATH = '../../apps/web/idl/cto_dex_escrow.json';
    if (!fs.existsSync(IDL_PATH)) {
      throw new Error(`IDL file not found at: ${IDL_PATH}`);
    }
    const idl = JSON.parse(fs.readFileSync(IDL_PATH, 'utf8'));
    console.log('✅ IDL loaded, version:', idl.version);
    
    // Test 6: Provider
    console.log('6. Testing provider...');
    const wallet = new Wallet(keypair);
    const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' });
    console.log('✅ Provider created');
    
    // Test 7: Program creation
    console.log('7. Testing program creation...');
    const program = new Program(idl, programPublicKey, provider);
    console.log('✅ Program created successfully');
    
    // Test 8: Basic program operations (if possible)
    console.log('8. Testing program account fetching...');
    try {
      const campaigns = await program.account.campaign.all();
      console.log('✅ Found', campaigns.length, 'campaigns');
    } catch (error) {
      console.log('⚠️ Could not fetch campaigns (expected on first run):', error.message);
    }
    
    console.log('🎉 All tests passed! Keeper initialization should work.');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

testKeeper();
