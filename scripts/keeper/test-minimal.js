#!/usr/bin/env node
import 'dotenv/config';
import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { Program, AnchorProvider, Wallet } from '@coral-xyz/anchor';

console.log('Testing minimal Program creation...');

// Simple test IDL
const simpleIdl = {
  "version": "0.1.0",
  "name": "test_program",
  "instructions": [],
  "accounts": [],
  "types": []
};

async function testMinimal() {
  try {
    const rpc = 'https://api.devnet.solana.com';
    const connection = new Connection(rpc, 'confirmed');
    
    const keypair = Keypair.generate();
    const wallet = new Wallet(keypair);
    const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' });
    
    const programId = new PublicKey('Fg6PaFpoGXkYsidMpWTK6W2BeZ7FEfcYkg476zPFsLnS');
    
    console.log('Creating program with simple IDL...');
    const program = new Program(simpleIdl, programId, provider);
    console.log('✅ Success! Program created with simple IDL');
    
  } catch (error) {
    console.error('❌ Failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testMinimal();
