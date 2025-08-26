#!/usr/bin/env node

import 'dotenv/config';
import { Connection, PublicKey } from '@solana/web3.js';
import { Program, AnchorProvider, Wallet } from '@coral-xyz/anchor';
import fs from 'fs';
import path from 'path';

const PROGRAM_ID = process.env.PROGRAM_ID;
const RPC = process.env.KEEPER_RPC_URL || process.env.SOLANA_RPC_URL;
const IDL_PATH = path.join(process.cwd(), 'apps/web/idl/cto_dex_escrow.json');

async function verifyProgram() {
  try {
    console.log('🔍 Verifying program configuration...');
    if (!PROGRAM_ID) {
      console.error('❌ PROGRAM_ID env var is required');
      process.exit(1);
    }
    if (!RPC) {
      console.error('❌ RPC env var is required (KEEPER_RPC_URL or SOLANA_RPC_URL)');
      process.exit(1);
    }
    console.log(`📋 Program ID: ${PROGRAM_ID}`);
    
    // Check if IDL file exists
    if (!fs.existsSync(IDL_PATH)) {
      console.error('❌ IDL file not found. Please build the program first.');
      process.exit(1);
    }
    
    // Load IDL
    const idl = JSON.parse(fs.readFileSync(IDL_PATH, 'utf8'));
    console.log('✅ IDL loaded successfully');
    
    // Connect to provided RPC
    const connection = new Connection(RPC, 'confirmed');
    console.log(`🌐 Connected to Solana RPC: ${RPC}`);
    
    // Check if program exists on-chain
    const programPubkey = new PublicKey(PROGRAM_ID);
    const programInfo = await connection.getAccountInfo(programPubkey);
    
    if (programInfo) {
      console.log('✅ Program found on-chain');
      console.log(`💰 Program balance: ${programInfo.lamports / 1e9} SOL`);
      console.log(`📊 Program data length: ${programInfo.data.length} bytes`);
    } else {
      console.log('⚠️  Program not found on-chain');
      console.log('💡 You may need to deploy the program first');
    }
    
    // Test program instantiation and IDL metadata address match
    try {
      // Create a dummy wallet for testing
      const dummyKeypair = { publicKey: new PublicKey('11111111111111111111111111111111') };
      const provider = new AnchorProvider(connection, new Wallet(dummyKeypair), { commitment: 'confirmed' });
      
      // Compare IDL metadata.address with env PROGRAM_ID
      const idlAddress = idl?.metadata?.address;
      if (idlAddress && idlAddress !== PROGRAM_ID) {
        console.error(`❌ IDL metadata address mismatch: idl=${idlAddress} env=${PROGRAM_ID}`);
        process.exit(2);
      }

      const program = new Program(idl, programPubkey, provider);
      console.log('✅ Program instantiation successful');
      console.log(`🔧 Program name: ${program.programId.programId}`);
      
    } catch (error) {
      console.error('❌ Program instantiation failed:', error.message);
      process.exit(3);
    }
    
    console.log('\n📝 Verification Summary:');
    console.log(`   Program ID: ${PROGRAM_ID}`);
    console.log(`   IDL Status: ✅ Loaded`);
    console.log(`   On-chain Status: ${programInfo ? '✅ Found' : '⚠️  Not Found'}`);
    console.log(`   Instantiation: ✅ Successful`);
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    process.exit(1);
  }
}

verifyProgram();
