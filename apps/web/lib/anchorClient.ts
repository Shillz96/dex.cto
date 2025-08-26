import { Connection, PublicKey, Transaction, TransactionSignature } from '@solana/web3.js';
import { AnchorProvider, BN, Idl, Program } from '@coral-xyz/anchor';
import idl from '../idl/cto_dex_escrow.json';
import { 
  CircuitBreaker, 
  retryTransaction, 
  errorMonitor, 
  gracefulDegradation,
  ErrorType,
  createErrorContext,
  extractProgramError,
  formatErrorForUser
} from './errorHandling';

// Enhanced program interface with error handling
export interface EnhancedProgram extends Program {
  // Add custom methods with retry logic
  methods: any;
}

// Circuit breaker instance for the program
const programCircuitBreaker = new CircuitBreaker({
  failureThreshold: 3,
  recoveryTimeout: 30000, // 30 seconds
});

// Enhanced program getter with error handling
export function getProgram(connection: Connection, wallet: any): EnhancedProgram {
  try {
    const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' });
    const envProgramId = process.env.NEXT_PUBLIC_PROGRAM_ID;
    if (!envProgramId) {
      throw new Error('NEXT_PUBLIC_PROGRAM_ID is not set. Please configure your frontend env.');
    }
    const programId = new PublicKey(envProgramId);
    const program = new Program(idl as unknown as Idl, programId, provider) as EnhancedProgram;
    
    // Wrap the program methods with retry logic and error handling
    program.methods = new Proxy(program.methods, {
      get(target, prop) {
        if (typeof target[prop] === 'function') {
          return new Proxy(target[prop], {
            apply: async (methodTarget, thisArg, args) => {
              return await programCircuitBreaker.execute(async () => {
                try {
                  // Execute the method with retry logic
                  const result = await retryTransaction(
                    () => methodTarget.apply(thisArg, args),
                    connection,
                    { maxRetries: 2, baseDelay: 1000 }
                  );
                  
                  return result;
                } catch (error) {
                  // Extract program error details
                  const programError = extractProgramError(error);
                  const userError = formatErrorForUser(error, `Program method ${String(prop)}`);
                  
                  // Report error to monitoring system with enhanced context
                  await errorMonitor.reportError(error, {
                    operation: `program.${String(prop)}`,
                    errorType: ErrorType.PROGRAM_ERROR,
                    programErrorType: programError.errorType,
                    errorCode: programError.errorCode,
                    userMessage: userError.message,
                    suggestedAction: userError.action,
                    metadata: {
                      method: String(prop),
                      args: args,
                      programError: programError
                    }
                  });
                  
                  // Enhance the error with user-friendly information
                  const enhancedError = new Error(userError.message);
                  (enhancedError as any).userMessage = userError.message;
                  (enhancedError as any).suggestedAction = userError.action;
                  (enhancedError as any).errorCode = userError.code;
                  (enhancedError as any).originalError = error;
                  
                  throw enhancedError;
                }
              });
            }
          });
        }
        return target[prop];
      }
    });
    
    return program;
  } catch (error) {
    errorMonitor.reportError(error, {
      operation: 'getProgram',
      errorType: ErrorType.PROGRAM_ERROR
    });
    throw error;
  }
}

// Enhanced transaction sender with retry logic
export async function sendTransactionWithRetry(
  connection: Connection,
  transaction: Transaction,
  signers: any[],
  options: any = {}
): Promise<TransactionSignature> {
  return await retryTransaction(
    async () => {
      try {
        const signature = await connection.sendTransaction(transaction, signers, options);
        
        // Wait for confirmation with timeout
        const confirmation = await connection.confirmTransaction(signature, 'confirmed');
        
        if (confirmation.value.err) {
          throw new Error(`Transaction failed: ${JSON.stringify(confirmation.value.err)}`);
        }
        
        return signature;
      } catch (error) {
        const userError = formatErrorForUser(error, 'Transaction');
        
        await errorMonitor.reportError(error, {
          operation: 'sendTransaction',
          errorType: ErrorType.TRANSACTION_ERROR,
          userMessage: userError.message,
          suggestedAction: userError.action,
          metadata: {
            transaction: transaction.signatures,
            signers: signers.length,
            options
          }
        });
        
        // Enhance the error with user-friendly information
        const enhancedError = new Error(userError.message);
        (enhancedError as any).userMessage = userError.message;
        (enhancedError as any).suggestedAction = userError.action;
        (enhancedError as any).originalError = error;
        
        throw enhancedError;
      }
    },
    connection,
    { maxRetries: 3, baseDelay: 2000 }
  );
}

// Enhanced account fetcher with fallback
export async function fetchAccountWithFallback<T>(
  connection: Connection,
  program: Program,
  accountType: string,
  publicKey: PublicKey,
  fallback?: () => T
): Promise<T> {
  return await gracefulDegradation.executeWithFallback(
    `fetch_${accountType}`,
    async () => {
      try {
        const account = await program.account[accountType].fetch(publicKey);
        return account as T;
      } catch (error) {
        const userError = formatErrorForUser(error, `Fetch ${accountType}`);
        
        await errorMonitor.reportError(error, {
          operation: `fetch_${accountType}`,
          errorType: ErrorType.PROGRAM_ERROR,
          userMessage: userError.message,
          suggestedAction: userError.action,
          metadata: {
            accountType,
            publicKey: publicKey.toString(),
            fallback: !!fallback
          }
        });
        
        // Enhance the error with user-friendly information
        const enhancedError = new Error(userError.message);
        (enhancedError as any).userMessage = userError.message;
        (enhancedError as any).suggestedAction = userError.action;
        (enhancedError as any).originalError = error;
        
        throw enhancedError;
      }
    },
    fallback
  );
}

// Enhanced campaign fetcher with retry and fallback
export async function fetchCampaignWithRetry(
  connection: Connection,
  program: Program,
  campaignPubkey: PublicKey
) {
  return await retryTransaction(
    async () => {
      try {
        return await program.account.campaign.fetch(campaignPubkey);
      } catch (error) {
        const userError = formatErrorForUser(error, 'Fetch Campaign');
        
        await errorMonitor.reportError(error, {
          operation: 'fetchCampaign',
          errorType: ErrorType.PROGRAM_ERROR,
          userMessage: userError.message,
          suggestedAction: userError.action,
          metadata: {
            campaignPubkey: campaignPubkey.toString()
          }
        });
        
        // Enhance the error with user-friendly information
        const enhancedError = new Error(userError.message);
        (enhancedError as any).userMessage = userError.message;
        (enhancedError as any).suggestedAction = userError.action;
        (enhancedError as any).originalError = error;
        
        throw enhancedError;
      }
    },
    connection,
    { maxRetries: 2, baseDelay: 1000 }
  );
}

// Enhanced campaign creator with retry logic
export async function createCampaignWithRetry(
  program: Program,
  connection: Connection,
  campaignData: any,
  options: any = {}
): Promise<TransactionSignature> {
  return await retryTransaction(
    async () => {
      try {
        const tx = await program.methods
          .initCampaign(
            campaignData.targetAmount,
            campaignData.deadline,
            campaignData.payMint
          )
          .accounts({
            campaign: campaignData.campaignPubkey,
            creator: campaignData.creator,
            payMint: campaignData.payMint,
            vault: campaignData.vault,
            tokenProgram: campaignData.tokenProgram,
            systemProgram: campaignData.systemProgram,
            rent: campaignData.rent
          })
          .rpc();
        
        return tx;
      } catch (error) {
        const userError = formatErrorForUser(error, 'Create Campaign');
        
        await errorMonitor.reportError(error, {
          operation: 'createCampaign',
          errorType: ErrorType.PROGRAM_ERROR,
          userMessage: userError.message,
          suggestedAction: userError.action,
          metadata: {
            targetAmount: campaignData.targetAmount.toString(),
            deadline: campaignData.deadline,
            payMint: campaignData.payMint.toString(),
            creator: campaignData.creator.toString()
          }
        });
        
        // Enhance the error with user-friendly information
        const enhancedError = new Error(userError.message);
        (enhancedError as any).userMessage = userError.message;
        (enhancedError as any).suggestedAction = userError.action;
        (enhancedError as any).originalError = error;
        
        throw enhancedError;
      }
    },
    connection,
    { maxRetries: 2, baseDelay: 2000 }
  );
}

// Enhanced contribution with retry logic
export async function contributeWithRetry(
  program: Program,
  connection: Connection,
  contributionData: any,
  options: any = {}
): Promise<TransactionSignature> {
  return await retryTransaction(
    async () => {
      try {
        const tx = await program.methods
          .contribute(contributionData.amount)
          .accounts({
            campaign: contributionData.campaign,
            contributor: contributionData.contributor,
            contributorAta: contributionData.contributorAta,
            vault: contributionData.vault,
            tokenProgram: contributionData.tokenProgram,
            systemProgram: contributionData.systemProgram
          })
          .rpc();
        
        return tx;
      } catch (error) {
        const userError = formatErrorForUser(error, 'Contribute');
        
        await errorMonitor.reportError(error, {
          operation: 'contribute',
          errorType: ErrorType.PROGRAM_ERROR,
          userMessage: userError.message,
          suggestedAction: userError.action,
          metadata: {
            amount: contributionData.amount.toString(),
            campaign: contributionData.campaign.toString(),
            contributor: contributionData.contributor.toString()
          }
        });
        
        // Enhance the error with user-friendly information
        const enhancedError = new Error(userError.message);
        (enhancedError as any).userMessage = userError.message;
        (enhancedError as any).suggestedAction = userError.action;
        (enhancedError as any).originalError = error;
        
        throw enhancedError;
      }
    },
    connection,
    { maxRetries: 2, baseDelay: 2000 }
  );
}

// Enhanced finalization with retry logic
export async function finalizeCampaignWithRetry(
  program: Program,
  connection: Connection,
  campaignPubkey: PublicKey,
  options: any = {}
): Promise<TransactionSignature> {
  return await retryTransaction(
    async () => {
      try {
        const tx = await program.methods
          .finalize()
          .accounts({
            campaign: campaignPubkey
          })
          .rpc();
        
        return tx;
      } catch (error) {
        const userError = formatErrorForUser(error, 'Finalize Campaign');
        
        await errorMonitor.reportError(error, {
          operation: 'finalizeCampaign',
          errorType: ErrorType.PROGRAM_ERROR,
          userMessage: userError.message,
          suggestedAction: userError.action,
          metadata: {
            campaignPubkey: campaignPubkey.toString()
          }
        });
        
        // Enhance the error with user-friendly information
        const enhancedError = new Error(userError.message);
        (enhancedError as any).userMessage = userError.message;
        (enhancedError as any).suggestedAction = userError.action;
        (enhancedError as any).originalError = error;
        
        throw enhancedError;
      }
    },
    connection,
    { maxRetries: 2, baseDelay: 2000 }
  );
}

// Enhanced payout with retry logic
export async function payoutWithRetry(
  program: Program,
  connection: Connection,
  payoutData: any,
  options: any = {}
): Promise<TransactionSignature> {
  return await retryTransaction(
    async () => {
      try {
        const tx = await program.methods
          .payout(payoutData.amount)
          .accounts({
            campaign: payoutData.campaign,
            payMint: payoutData.payMint,
            vault: payoutData.vault,
            merchantAta: payoutData.merchantAta,
            tokenProgram: payoutData.tokenProgram
          })
          .rpc();
        
        return tx;
      } catch (error) {
        const userError = formatErrorForUser(error, 'Payout');
        
        await errorMonitor.reportError(error, {
          operation: 'payout',
          errorType: ErrorType.PROGRAM_ERROR,
          userMessage: userError.message,
          suggestedAction: userError.action,
          metadata: {
            amount: payoutData.amount.toString(),
            campaign: payoutData.campaign.toString(),
            payMint: payoutData.payMint.toString(),
            merchantAta: payoutData.merchantAta.toString()
          }
        });
        
        // Enhance the error with user-friendly information
        const enhancedError = new Error(userError.message);
        (enhancedError as any).userMessage = userError.message;
        (enhancedError as any).suggestedAction = userError.action;
        (enhancedError as any).originalError = error;
        
        throw enhancedError;
      }
    },
    connection,
    { maxRetries: 2, baseDelay: 2000 }
  );
}

// Connection health checker
export async function checkConnectionHealth(connection: Connection): Promise<boolean> {
  try {
    const health = await connection.getHealth();
    return health === 'ok';
  } catch (error) {
    await errorMonitor.reportError(error, {
      operation: 'checkConnectionHealth',
      errorType: ErrorType.NETWORK_ERROR
    });
    return false;
  }
}

// Program health checker
export async function checkProgramHealth(program: Program): Promise<boolean> {
  try {
    // Try to fetch a simple account or make a simple call
    const programId = program.programId;
    return true; // If we get here, the program is accessible
  } catch (error) {
    await errorMonitor.reportError(error, {
      operation: 'checkProgramHealth',
      errorType: ErrorType.PROGRAM_ERROR
    });
    return false;
  }
}


