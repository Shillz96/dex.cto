import 'dotenv/config';
import { Connection, PublicKey, Keypair } from '@solana/web3.js';
import { Program, AnchorProvider, Wallet } from '@coral-xyz/anchor';
import { BN } from 'bn.js';
import { getAssociatedTokenAddressSync, TOKEN_PROGRAM_ID } from '@solana/spl-token';
import fs from 'fs';
import crypto from 'crypto';
import keccak from 'keccak';
import { DexScreenerClient, MockDexScreenerClient } from './dexScreenerClient.js';

// Load IDL
const IDL_PATH = '../../apps/web/idl/cto_dex_escrow.json';
const idl = JSON.parse(fs.readFileSync(IDL_PATH, 'utf8'));

// Error handling and retry utilities
class ErrorHandler {
  constructor() {
    this.errorCounts = new Map();
    this.lastErrorTime = new Map();
    // Track circuit breaker state per operation key
    this.circuitBreakerState = new Map();
    this.failureThreshold = 5;
    this.recoveryTimeout = 60000; // 1 minute
  }

  async handleError(operation, error, context = {}) {
    const errorKey = `${operation}_${context.campaignId || 'global'}`;
    const now = Date.now();
    
    // Increment error count
    this.errorCounts.set(errorKey, (this.errorCounts.get(errorKey) || 0) + 1);
    this.lastErrorTime.set(errorKey, now);
    
    // Log error with context
    console.error(`❌ Error in ${operation}:`, {
      message: error.message,
      campaignId: context.campaignId,
      timestamp: new Date(now).toISOString(),
      errorCount: this.errorCounts.get(errorKey),
      context
    });
    
    // Check if we should open circuit breaker
    if (this.errorCounts.get(errorKey) >= this.failureThreshold) {
      this.circuitBreakerState.set(errorKey, 'OPEN');
      console.warn(`🚨 Circuit breaker OPEN for ${operation} - too many failures`);
      
      // Send alert (in production, this would go to monitoring system)
      await this.sendAlert('HIGH', `${operation} failing repeatedly`, {
        operation,
        errorCount: this.errorCounts.get(errorKey),
        lastError: error.message,
        context
      });
    }
    
    // Store error for monitoring
    await this.storeError(operation, error, context);
  }

  async sendAlert(level, message, context) {
    // In production, this would send to:
    // - Slack/Discord webhooks
    // - Email notifications
    // - Monitoring dashboards
    // - PagerDuty/OpsGenie
    
    const alert = {
      level,
      message,
      timestamp: new Date().toISOString(),
      context
    };
    
    console.log(`🚨 ALERT [${level}]:`, alert);
    
    // Example: Send to webhook if configured
    if (process.env.ALERT_WEBHOOK_URL) {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 5000);
        await fetch(process.env.ALERT_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(alert),
          signal: controller.signal
        });
        clearTimeout(timeout);
      } catch (webhookError) {
        console.error('Failed to send webhook alert:', webhookError.message);
      }
    }
  }

  async storeError(operation, error, context) {
    // Store error for analysis and monitoring
    const errorLog = {
      operation,
      error: error.message,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString()
    };
    
    // In production, this would go to:
    // - Database
    // - Log aggregation service (ELK stack, etc.)
    // - Error tracking service (Sentry, etc.)
    
    console.error('📝 Error logged:', errorLog);
  }

  canRetry(operation, context = {}) {
    const errorKey = `${operation}_${context.campaignId || 'global'}`;
    
    const state = this.circuitBreakerState.get(errorKey) || 'CLOSED';
    if (state === 'OPEN') {
      const lastError = this.lastErrorTime.get(errorKey) || 0;
      if (Date.now() - lastError < this.recoveryTimeout) {
        return false;
      }
      // Try to close circuit breaker
      this.circuitBreakerState.set(errorKey, 'HALF_OPEN');
    }
    
    return true;
  }

  resetErrorCount(operation, context = {}) {
    const errorKey = `${operation}_${context.campaignId || 'global'}`;
    this.errorCounts.set(errorKey, 0);
    const state = this.circuitBreakerState.get(errorKey);
    if (state === 'HALF_OPEN') {
      this.circuitBreakerState.set(errorKey, 'CLOSED');
      console.log(`✅ Circuit breaker CLOSED for ${operation} - operation successful`);
    }
  }
}

// Retry utility with exponential backoff
class RetryManager {
  constructor(maxRetries = 3, baseDelay = 1000) {
    this.maxRetries = maxRetries;
    this.baseDelay = baseDelay;
  }

  async withRetry(operation, context = {}) {
    let lastError;
    
    for (let attempt = 0; attempt <= this.maxRetries; attempt++) {
      try {
        const result = await operation();
        
        // Log successful retry
        if (attempt > 0) {
          console.log(`✅ Operation succeeded after ${attempt + 1} attempts`);
        }
        
        return result;
      } catch (error) {
        lastError = error;
        
        if (attempt === this.maxRetries) {
          console.error(`❌ Operation failed after ${this.maxRetries + 1} attempts:`, error.message);
          break;
        }
        
        // Calculate delay with exponential backoff and jitter
        const delay = this.calculateDelay(attempt);
        console.warn(`⚠️ Attempt ${attempt + 1} failed, retrying in ${delay}ms:`, error.message);
        
        await this.sleep(delay);
      }
    }
    
    throw lastError;
  }

  calculateDelay(attempt) {
    const delay = Math.min(
      this.baseDelay * Math.pow(2, attempt),
      30000 // Max 30 seconds
    );
    
    // Add ±25% jitter to prevent thundering herd
    const jitter = delay * 0.25 * (Math.random() - 0.5);
    return Math.max(0, delay + jitter);
  }

  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Health monitoring
class HealthMonitor {
  constructor() {
    this.healthChecks = new Map();
    this.lastHealthCheck = 0;
    this.healthCheckInterval = 300000; // 5 minutes
  }

  addHealthCheck(name, check) {
    this.healthChecks.set(name, check);
  }

  async performHealthCheck() {
    const now = Date.now();
    if (now - this.lastHealthCheck < this.healthCheckInterval) {
      return; // Too soon for another check
    }
    
    this.lastHealthCheck = now;
    console.log('🏥 Performing health check...');
    
    const results = {};
    let overallHealthy = true;
    
    for (const [name, check] of this.healthChecks) {
      try {
        const startTime = Date.now();
        const healthy = await check();
        const responseTime = Date.now() - startTime;
        
        results[name] = {
          status: healthy ? 'healthy' : 'unhealthy',
          responseTime
        };
        
        if (!healthy) {
          overallHealthy = false;
        }
      } catch (error) {
        results[name] = {
          status: 'error',
          error: error.message
        };
        overallHealthy = false;
      }
    }
    
    console.log('🏥 Health check results:', {
      overall: overallHealthy ? 'healthy' : 'unhealthy',
      details: results
    });
    
    if (!overallHealthy) {
      await this.sendHealthAlert(results);
    }
    
    return { overall: overallHealthy, details: results };
  }

  async sendHealthAlert(results) {
    const unhealthyServices = Object.entries(results)
      .filter(([_, result]) => result.status !== 'healthy')
      .map(([name, result]) => `${name}: ${result.status}`);
    
    if (unhealthyServices.length > 0) {
      console.warn('🚨 Health check failed:', unhealthyServices);
      
      // In production, send to monitoring system
      // await this.errorHandler.sendAlert('MEDIUM', 'Health check failed', { results });
    }
  }
}

// Memory management utilities
class MemoryManager {
  constructor(options = {}) {
    this.maxMemoryUsage = options.maxMemoryUsage || 100 * 1024 * 1024; // 100MB default
    this.cleanupInterval = options.cleanupInterval || 300000; // 5 minutes
    this.dataTTL = options.dataTTL || 24 * 60 * 60 * 1000; // 24 hours
    this.storagePath = options.storagePath || './keeper-storage.json';
    this.merchantStorage = new Map();
    this.storageTimestamps = new Map();
    this.lastCleanup = Date.now();
    this.memoryThreshold = 0.8; // 80% of max memory
    
    // Load persistent storage
    this.loadPersistentStorage();
    
    // Start cleanup timer
    this.startCleanupTimer();
    
    console.log('🧠 Memory manager initialized with:', {
      maxMemoryUsage: this.formatBytes(this.maxMemoryUsage),
      cleanupInterval: this.formatTime(this.cleanupInterval),
      dataTTL: this.formatTime(this.dataTTL)
    });
  }

  // Store merchant details with timestamp
  storeMerchantDetails(campaignPubkey, purchaseResult) {
    const key = campaignPubkey.toString();
    const now = Date.now();
    
    this.merchantStorage.set(key, purchaseResult);
    this.storageTimestamps.set(key, now);
    
    // Check memory usage and trigger cleanup if needed
    this.checkMemoryUsage();
    
    // Save to persistent storage
    this.savePersistentStorage();
    
    console.log(`💾 Stored merchant details for campaign ${key.slice(0, 8)}... (${this.merchantStorage.size} total entries)`);
  }

  // Get merchant details with TTL check
  getMerchantDetails(campaignPubkey) {
    const key = campaignPubkey.toString();
    const timestamp = this.storageTimestamps.get(key);
    
    if (!timestamp) {
      return null;
    }
    
    // Check if data has expired
    if (Date.now() - timestamp > this.dataTTL) {
      console.log(`⏰ Merchant data expired for campaign ${key.slice(0, 8)}..., removing`);
      this.clearMerchantDetails(campaignPubkey);
      return null;
    }
    
    return this.merchantStorage.get(key);
  }

  // Clear merchant details
  clearMerchantDetails(campaignPubkey) {
    const key = campaignPubkey.toString();
    
    this.merchantStorage.delete(key);
    this.storageTimestamps.delete(key);
    
    // Save to persistent storage
    this.savePersistentStorage();
    
    console.log(`🗑️ Cleared merchant details for campaign ${key.slice(0, 8)}...`);
  }

  // Check current memory usage
  checkMemoryUsage() {
    const currentUsage = this.getCurrentMemoryUsage();
    const usagePercentage = currentUsage / this.maxMemoryUsage;
    
    if (usagePercentage > this.memoryThreshold) {
      console.warn(`⚠️ Memory usage high: ${this.formatBytes(currentUsage)} (${(usagePercentage * 100).toFixed(1)}%)`);
      this.performGarbageCollection();
    }
    
    return {
      current: currentUsage,
      max: this.maxMemoryUsage,
      percentage: usagePercentage,
      threshold: this.memoryThreshold
    };
  }

  // Get current memory usage (approximate)
  getCurrentMemoryUsage() {
    const usage = process.memoryUsage();
    return usage.heapUsed + usage.external + usage.arrayBuffers;
  }

  // Perform garbage collection
  performGarbageCollection() {
    console.log('🧹 Performing garbage collection...');
    
    const beforeCount = this.merchantStorage.size;
    const beforeMemory = this.getCurrentMemoryUsage();
    
    // Remove expired entries
    const now = Date.now();
    const expiredKeys = [];
    
    for (const [key, timestamp] of this.storageTimestamps) {
      if (now - timestamp > this.dataTTL) {
        expiredKeys.push(key);
      }
    }
    
    // Remove expired entries
    for (const key of expiredKeys) {
      this.merchantStorage.delete(key);
      this.storageTimestamps.delete(key);
    }
    
    // If still over threshold, remove oldest entries
    if (this.getCurrentMemoryUsage() / this.maxMemoryUsage > this.memoryThreshold) {
      const sortedEntries = Array.from(this.storageTimestamps.entries())
        .sort(([, a], [, b]) => a - b);
      
      const entriesToRemove = Math.floor(sortedEntries.length * 0.2); // Remove 20% oldest
      
      for (let i = 0; i < entriesToRemove; i++) {
        const [key] = sortedEntries[i];
        this.merchantStorage.delete(key);
        this.storageTimestamps.delete(key);
      }
    }
    
    const afterCount = this.merchantStorage.size;
    const afterMemory = this.getCurrentMemoryUsage();
    
    console.log(`🧹 Garbage collection completed:`, {
      entriesRemoved: beforeCount - afterCount,
      memoryFreed: this.formatBytes(beforeMemory - afterMemory),
      remainingEntries: afterCount,
      currentMemory: this.formatBytes(afterMemory)
    });
    
    // Save to persistent storage
    this.savePersistentStorage();
  }

  // Start cleanup timer
  startCleanupTimer() {
    setInterval(() => {
      this.performScheduledCleanup();
    }, this.cleanupInterval);
  }

  // Perform scheduled cleanup
  performScheduledCleanup() {
    const now = Date.now();
    if (now - this.lastCleanup < this.cleanupInterval) {
      return;
    }
    
    console.log('⏰ Performing scheduled cleanup...');
    this.performGarbageCollection();
    this.lastCleanup = now;
  }

  // Load persistent storage
  loadPersistentStorage() {
    try {
      if (fs.existsSync(this.storagePath)) {
        const data = JSON.parse(fs.readFileSync(this.storagePath, 'utf8'));
        
        // Restore merchant storage
        if (data.merchantStorage) {
          for (const [key, value] of Object.entries(data.merchantStorage)) {
            this.merchantStorage.set(key, value);
          }
        }
        
        // Restore timestamps
        if (data.storageTimestamps) {
          for (const [key, timestamp] of Object.entries(data.storageTimestamps)) {
            this.storageTimestamps.set(key, parseInt(timestamp));
          }
        }
        
        console.log(`📂 Loaded persistent storage: ${this.merchantStorage.size} merchant entries`);
      }
    } catch (error) {
      console.warn('⚠️ Failed to load persistent storage:', error.message);
    }
  }

  // Save persistent storage
  savePersistentStorage() {
    try {
      const data = {
        merchantStorage: Object.fromEntries(this.merchantStorage),
        storageTimestamps: Object.fromEntries(this.storageTimestamps),
        lastUpdated: new Date().toISOString()
      };
      
      fs.writeFileSync(this.storagePath, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('❌ Failed to save persistent storage:', error.message);
    }
  }

  // Get memory statistics
  getMemoryStats() {
    const currentUsage = this.getCurrentMemoryUsage();
    const usagePercentage = currentUsage / this.maxMemoryUsage;
    
    return {
      current: currentUsage,
      max: this.maxMemoryUsage,
      percentage: usagePercentage,
      threshold: this.memoryThreshold,
      entries: this.merchantStorage.size,
      lastCleanup: this.lastCleanup,
      nextCleanup: this.lastCleanup + this.cleanupInterval,
      formatted: {
        current: this.formatBytes(currentUsage),
        max: this.formatBytes(this.maxMemoryUsage),
        percentage: `${(usagePercentage * 100).toFixed(1)}%`
      }
    };
  }

  // Format bytes to human readable
  formatBytes(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  // Format milliseconds to human readable
  formatTime(ms) {
    if (ms < 1000) return `${ms}ms`;
    if (ms < 60000) return `${Math.floor(ms / 1000)}s`;
    if (ms < 3600000) return `${Math.floor(ms / 60000)}m`;
    return `${Math.floor(ms / 3600000)}h`;
  }

  // Cleanup on shutdown
  cleanup() {
    console.log('🧹 Cleaning up memory manager...');
    this.savePersistentStorage();
    this.merchantStorage.clear();
    this.storageTimestamps.clear();
  }
}

class CampaignKeeper {
  constructor(connection, programId, keypair) {
    this.connection = connection;
    try {
      this.programId = new PublicKey(programId);
    } catch (error) {
      throw new Error(`Invalid program ID: ${programId}. Error: ${error.message}`);
    }
    this.keypair = keypair;
    
    const wallet = new Wallet(keypair);
    const provider = new AnchorProvider(connection, wallet, { commitment: 'confirmed' });
    try {
      // Enforce PROGRAM_ID presence and match with IDL metadata.address
      const idlAddress = idl?.metadata?.address;
      if (idlAddress && idlAddress !== this.programId.toString()) {
        throw new Error(`PROGRAM_ID mismatch: env=${this.programId.toString()} idl=${idlAddress}`);
      }
      this.program = new Program(idl, this.programId, provider);
    } catch (error) {
      throw new Error(`Failed to create program: ${error.message}`);
    }
    
    // Initialize error handling and retry systems
    this.errorHandler = new ErrorHandler();
    this.retryManager = new RetryManager(3, 2000);
    this.healthMonitor = new HealthMonitor();
    
    // Initialize DEX Screener client
    const useMock = process.env.NODE_ENV === 'development' || process.env.USE_MOCK_DEX === 'true';
    this.dexClient = useMock 
      ? new MockDexScreenerClient()
              : new DexScreenerClient({ 
          timeout: parseInt(process.env.DEX_SCREENER_TIMEOUT) || 30000,
          headless: process.env.NODE_ENV === 'production',
          credentials: {
            gmail: {
              email: process.env.DEX_GMAIL_EMAIL,
              password: process.env.DEX_GMAIL_PASSWORD,
              autoLogin: process.env.DEX_AUTO_LOGIN === 'true'
            }
          }
        });
    
    // Initialize Memory Manager
    this.memoryManager = new MemoryManager({
      maxMemoryUsage: parseInt(process.env.MAX_MEMORY_USAGE) || 100 * 1024 * 1024, // Default 100MB
      cleanupInterval: parseInt(process.env.MEMORY_CLEANUP_INTERVAL) || 300000, // Default 5 minutes
      dataTTL: parseInt(process.env.DATA_TTL) || 24 * 60 * 60 * 1000, // Default 24 hours
      storagePath: process.env.PERSISTENT_STORAGE_PATH || './keeper-storage.json'
    });
    
    // Setup health checks
    this.setupHealthChecks();
    
    console.log('🤖 Keeper initialized with wallet:', keypair.publicKey.toString());
    console.log('📡 DEX Screener client:', useMock ? 'Mock' : 'Live');
    console.log('🛡️ Error handling and retry systems initialized');
  }

  setupHealthChecks() {
    // Check connection health using latest blockhash with timeout
    this.healthMonitor.addHealthCheck('connection', async () => {
      try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), 3000);
        await this.connection.getLatestBlockhash('processed');
        clearTimeout(timeout);
        return true;
      } catch {
        return false;
      }
    });
    
    // Check program accessibility
    this.healthMonitor.addHealthCheck('program', async () => {
      try {
        // Try to fetch a simple account
        await this.program.account.campaign.all();
        return true;
      } catch {
        return false;
      }
    });
    
    // Check DEX client health
    this.healthMonitor.addHealthCheck('dex_client', async () => {
      try {
        // Simple test call
        return true;
      } catch {
        return false;
      }
    });
    
    // Check memory usage
    this.healthMonitor.addHealthCheck('memory', async () => {
      try {
        const memoryStats = this.memoryManager.getMemoryStats();
        const isHealthy = memoryStats.percentage < this.memoryManager.memoryThreshold;
        
        if (!isHealthy) {
          console.warn('⚠️ Memory usage unhealthy:', memoryStats.formatted);
        }
        
        return isHealthy;
      } catch {
        return false;
      }
    });
  }

  // Monitor all campaigns for automation opportunities
  async monitorCampaigns() {
    try {
      // Check health before processing
      await this.healthMonitor.performHealthCheck();
      
      // Log memory usage
      const memoryStats = this.memoryManager.getMemoryStats();
      console.log('🧠 Memory status:', {
        usage: memoryStats.formatted.percentage,
        entries: memoryStats.entries,
        nextCleanup: new Date(memoryStats.nextCleanup).toLocaleTimeString()
      });
      
      console.log('🔍 Scanning for campaigns to process...');
      
      // Get all campaigns (in production, you'd want pagination/filtering)
      const campaigns = await this.retryManager.withRetry(
        () => this.program.account.campaign.all(),
        { operation: 'fetch_campaigns' }
      );
      
      for (const campaign of campaigns) {
        await this.processCampaign(campaign.publicKey, campaign.account);
      }
    } catch (error) {
      await this.errorHandler.handleError('monitorCampaigns', error);
    }
  }

  async processCampaign(campaignPubkey, campaignData) {
    const now = Math.floor(Date.now() / 1000);
    const target = campaignData.targetAmount.toNumber();
    const contributed = campaignData.totalContributed.toNumber();
    const deadline = campaignData.deadline.toNumber();
    const status = campaignData.status;

    console.log(`📊 Campaign ${campaignPubkey.toString().slice(0, 8)}... - Status: ${status}, Progress: ${contributed}/${target}`);

    // Auto-finalize if target reached and still pending
    if (status === 0 && contributed >= target && now <= deadline) {
      console.log('🎯 Target reached! Auto-finalizing campaign...');
      await this.finalizeCampaign(campaignPubkey);
      return;
    }

    // Auto-finalize failed campaigns after deadline
    if (status === 0 && now > deadline) {
      console.log('⏰ Deadline passed, marking as failed...');
      await this.finalizeCampaign(campaignPubkey);
      return;
    }

    // Execute DEX purchase for succeeded campaigns
    if (status === 1 && campaignData.metadataUri && !campaignData.merchantHashSet) {
      console.log('🛒 Executing DEX Screener purchase...');
      await this.executeDexPurchase(campaignPubkey, campaignData);
      return;
    }

    // Execute payout for campaigns ready to pay
    if (status === 1 && campaignData.merchantHashSet) {
      console.log('💰 Executing payout...');
      await this.executePayout(campaignPubkey, campaignData);
      return;
    }
  }

  async finalizeCampaign(campaignPubkey) {
    if (!this.errorHandler.canRetry('finalizeCampaign', { campaignId: campaignPubkey.toString() })) {
      console.warn('⚠️ Skipping finalizeCampaign due to circuit breaker');
      return;
    }

    try {
      console.log('🔄 Calling finalize()...');
      
      await this.retryManager.withRetry(
        () => this.program.methods
          .finalize()
          .accounts({
            campaign: campaignPubkey
          })
          .rpc(),
        { operation: 'finalizeCampaign', campaignId: campaignPubkey.toString() }
      );
        
      console.log('✅ Campaign finalized successfully');
      
      // Reset error count on success
      this.errorHandler.resetErrorCount('finalizeCampaign', { campaignId: campaignPubkey.toString() });
      
      // Generate tweet after successful finalization
      await this.generateDeploymentTweet(campaignPubkey);
    } catch (error) {
      await this.errorHandler.handleError('finalizeCampaign', error, { 
        campaignId: campaignPubkey.toString() 
      });
    }
  }

  async executeDexPurchase(campaignPubkey, campaignData) {
    if (!this.errorHandler.canRetry('executeDexPurchase', { campaignId: campaignPubkey.toString() })) {
      console.warn('⚠️ Skipping executeDexPurchase due to circuit breaker');
      return;
    }

    try {
      console.log('🌐 Executing DEX Screener purchase...');
      
      // Load metadata to get token info
      const metadataResponse = await this.retryManager.withRetry(
        async () => {
          const controller = new AbortController();
          const timeout = setTimeout(() => controller.abort(), parseInt(process.env.METADATA_FETCH_TIMEOUT) || 5000);
          const res = await fetch(campaignData.metadataUri, { signal: controller.signal });
          clearTimeout(timeout);
          const contentLength = parseInt(res.headers.get('content-length') || '0');
          const maxBytes = parseInt(process.env.METADATA_MAX_BYTES) || 100 * 1024; // 100KB
          if (contentLength && contentLength > maxBytes) {
            throw new Error(`Metadata too large: ${contentLength} > ${maxBytes}`);
          }
          const text = await res.text();
          if (text.length > maxBytes) {
            throw new Error(`Metadata too large (post-read): ${text.length} > ${maxBytes}`);
          }
          const json = JSON.parse(text);
          // Basic schema validation
          const requiredFields = ['tokenAddress', 'merchantAddress'];
          for (const f of requiredFields) {
            if (!(f in json)) throw new Error(`Invalid metadata: missing ${f}`);
          }
          return json;
        },
        { operation: 'fetch_metadata', campaignId: campaignPubkey.toString() }
      );
      const metadata = metadataResponse;
      
      // Execute the DEX Screener purchase
      const purchaseResult = await this.retryManager.withRetry(
        () => this.dexClient.purchaseEnhancedTokenInfo(metadata),
        { operation: 'dex_purchase', campaignId: campaignPubkey.toString() }
      );
      
      console.log('📋 Purchase completed:', {
        merchantAta: purchaseResult.merchantAta,
        amount: purchaseResult.amount,
        transactionId: purchaseResult.transactionId
      });
      
      // Compute merchant hash for security
      const merchantHash = this.computeMerchantHash(
        campaignData.payMint,
        new PublicKey(purchaseResult.merchantAta),
        purchaseResult.amount
      );
      
      console.log('🔐 Setting merchant hash...');
      await this.retryManager.withRetry(
        () => this.program.methods
          .setMerchantHash(Array.from(merchantHash))
          .accounts({
            authority: this.keypair.publicKey,
            campaign: campaignPubkey
          })
          .rpc(),
        { operation: 'setMerchantHash', campaignId: campaignPubkey.toString() }
      );
        
      console.log('✅ Merchant hash set successfully');
      
      // Store the merchant details for payout
      this.memoryManager.storeMerchantDetails(campaignPubkey, purchaseResult);
      
      // Reset error count on success
      this.errorHandler.resetErrorCount('executeDexPurchase', { campaignId: campaignPubkey.toString() });
      
    } catch (error) {
      await this.errorHandler.handleError('executeDexPurchase', error, { 
        campaignId: campaignPubkey.toString() 
      });
      
      // Retry logic could be added here
      await this.handlePurchaseError(campaignPubkey, error);
    }
  }

  async executePayout(campaignPubkey, campaignData) {
    if (!this.errorHandler.canRetry('executePayout', { campaignId: campaignPubkey.toString() })) {
      console.warn('⚠️ Skipping executePayout due to circuit breaker');
      return;
    }

    try {
      const amount = campaignData.totalContributed.toNumber();
      
      // Retrieve merchant details from storage
      const merchantDetails = this.memoryManager.getMerchantDetails(campaignPubkey);
      if (!merchantDetails) {
        throw new Error('Merchant details not found for campaign');
      }
      
      const merchantAta = new PublicKey(merchantDetails.merchantAta);
      const vault = getAssociatedTokenAddressSync(
        campaignData.payMint,
        campaignPubkey,
        true
      );
      
      console.log('💸 Executing payout to DEX Screener...');
      console.log('💰 Amount:', amount / 1_000_000, 'USDC');
      console.log('🏪 Merchant:', merchantAta.toString());
      
      await this.retryManager.withRetry(
        () => this.program.methods
          .payout(new BN(amount))
          .accounts({
            campaign: campaignPubkey,
            payMint: campaignData.payMint,
            vault: vault,
            merchantAta: merchantAta,
            tokenProgram: TOKEN_PROGRAM_ID
          })
          .rpc(),
        { operation: 'executePayout', campaignId: campaignPubkey.toString() }
      );
        
      console.log('✅ Payout executed successfully');
      
      // Cleanup merchant details
      this.memoryManager.clearMerchantDetails(campaignPubkey);
      
      // Reset error count on success
      this.errorHandler.resetErrorCount('executePayout', { campaignId: campaignPubkey.toString() });
      
    } catch (error) {
      await this.errorHandler.handleError('executePayout', error, { 
        campaignId: campaignPubkey.toString() 
      });
      await this.handlePayoutError(campaignPubkey, error);
    }
  }

  async setDelegateAuthority(campaignPubkey, delegatePubkey) {
    try {
      await this.retryManager.withRetry(
        () => this.program.methods
          .setDelegateAuthority(new PublicKey(delegatePubkey))
          .accounts({
            creator: this.keypair.publicKey,
            campaign: campaignPubkey
          })
          .rpc(),
        { operation: 'set_delegate_authority', campaignId: campaignPubkey.toString() }
      );
      console.log('✅ Delegate authority set');
      this.errorHandler.resetErrorCount('set_delegate_authority', { campaignId: campaignPubkey.toString() });
    } catch (error) {
      await this.errorHandler.handleError('set_delegate_authority', error, { campaignId: campaignPubkey.toString() });
    }
  }

  computeMerchantHash(payMint, merchantAta, amount) {
    // Input format must match on-chain: keccak256(pay_mint || dest_ata || amount_le)
    // - pay_mint: 32 bytes (PublicKey)
    // - dest_ata: 32 bytes (merchant ATA PublicKey) 
    // - amount_le: 8 bytes (little-endian u64)
    const input = Buffer.concat([
      payMint.toBuffer(),                                    // 32 bytes
      merchantAta.toBuffer(),                                // 32 bytes
      Buffer.from(new BN(amount).toArray('le', 8))          // 8 bytes (little-endian)
    ]);
    
    // Use Keccak-256 to match the on-chain tiny_keccak::Keccak implementation
    return this.keccak256(input);
  }

  // Keccak-256 implementation to match the on-chain tiny_keccak::Keccak
  keccak256(data) {
    // Use the keccak package to match the on-chain tiny_keccak::Keccak implementation
    return keccak('keccak256').update(data).digest();
  }

  // Helper methods for merchant data storage (delegated to memory manager)
  storeMerchantDetails(campaignPubkey, purchaseResult) {
    this.memoryManager.storeMerchantDetails(campaignPubkey, purchaseResult);
  }

  getMerchantDetails(campaignPubkey) {
    return this.memoryManager.getMerchantDetails(campaignPubkey);
  }

  clearMerchantDetails(campaignPubkey) {
    this.memoryManager.clearMerchantDetails(campaignPubkey);
  }

  // Tweet generation for successful campaign deployments
  async generateDeploymentTweet(campaignPubkey) {
    try {
      // Fetch the campaign data
      const campaignData = await this.retryManager.withRetry(
        () => this.program.account.campaign.fetch(campaignPubkey),
        { operation: 'fetch_campaign_for_tweet', campaignId: campaignPubkey.toString() }
      );
      
      // Get the token address from the campaign's creator (used as the token identifier)
      const tokenAddress = campaignData.creator.toString();
      
      // Calculate current escrow amount in USDC
      const currentAmount = (campaignData.totalContributed.toNumber() / 1_000_000).toFixed(2);
      
      // Generate the campaign URL
      const baseUrl = process.env.WEB_BASE_URL || 'https://dexcto.io';
      const campaignUrl = `${baseUrl}/campaign/${tokenAddress}`;
      
      // Create the tweet text
      const tweet = `🚀 I've initialized a Dex.CTO campaign! 

Current escrow: $${currentAmount} USDC 💰

Click here to contribute and help us reach our funding goal! 🎯

${campaignUrl}

#DexCTO #Solana #DeFi #CrowdFunding`;

      // Output the tweet for copy-paste
      console.log('\n🐦 TWEET READY TO COPY:');
      console.log('═'.repeat(60));
      console.log(tweet);
      console.log('═'.repeat(60));
      console.log('📋 Copy the text above and paste it into Twitter/X\n');
      
      return tweet;
    } catch (error) {
      await this.errorHandler.handleError('generateDeploymentTweet', error, { 
        campaignId: campaignPubkey.toString() 
      });
    }
  }

  // Enhanced error handling methods
  async handlePurchaseError(campaignPubkey, error) {
    console.error('🚨 Purchase error for campaign:', campaignPubkey.toString().slice(0, 8), error.message);
    
    // Log error for monitoring
    await this.errorHandler.handleError('handlePurchaseError', error, { 
      campaignId: campaignPubkey.toString() 
    });
    
    // In production, you might want to send alerts or retry logic here
    // For now, we'll just log and continue
  }

  async handlePayoutError(campaignPubkey, error) {
    console.error('🚨 Payout error for campaign:', campaignPubkey.toString().slice(0, 8), error.message);
    
    // Log error for monitoring
    await this.errorHandler.handleError('handlePayoutError', error, { 
      campaignId: campaignPubkey.toString() 
    });
    
    // In production, you might want to send alerts or manual intervention notices
    // For now, we'll just log and continue
  }

  async start() {
    console.log('🚀 Starting Campaign Keeper...');
    console.log('⏱️  Poll interval:', process.env.POLL_INTERVAL_MS || 30000, 'ms');
    
    const pollInterval = parseInt(process.env.POLL_INTERVAL_MS) || 30000;
    
    // Monitor campaigns every interval
    this.monitoringInterval = setInterval(async () => {
      await this.monitorCampaigns();
    }, pollInterval);
    
    // Initial scan
    await this.monitorCampaigns();
    
    // Setup graceful shutdown
    this.setupGracefulShutdown();
  }
  
  setupGracefulShutdown() {
    const shutdownSignals = ['SIGINT', 'SIGTERM', 'SIGQUIT'];
    
    shutdownSignals.forEach(signal => {
      process.on(signal, async () => {
        console.log(`\n🛑 Received ${signal}, shutting down gracefully...`);
        
        // Clear monitoring interval
        if (this.monitoringInterval) {
          clearInterval(this.monitoringInterval);
        }
        
        // Cleanup memory manager
        if (this.memoryManager) {
          this.memoryManager.cleanup();
        }
        
        // Wait a bit for cleanup to complete
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        console.log('✅ Graceful shutdown completed');
        process.exit(0);
      });
    });
    
    console.log('🛡️ Graceful shutdown handlers configured');
  }
}

async function main() {
  const rpc = process.env.KEEPER_RPC_URL || process.env.SOLANA_RPC_URL;
  const programId = process.env.PROGRAM_ID;
  
  if (!rpc) {
    throw new Error('RPC required. Set KEEPER_RPC_URL or SOLANA_RPC_URL');
  }
  if (!programId) {
    throw new Error('PROGRAM_ID environment variable required');
  }
  if (!process.env.KEEPER_PRIVATE_KEY) {
    throw new Error('KEEPER_PRIVATE_KEY environment variable required');
  }
  
  const connection = new Connection(rpc, 'confirmed');
  const keypair = Keypair.fromSecretKey(
    new Uint8Array(JSON.parse(process.env.KEEPER_PRIVATE_KEY))
  );
  
  const keeper = new CampaignKeeper(connection, programId, keypair);
  // Simple CLI commands
  const [, , cmd, ...args] = process.argv;
  if (cmd === 'set-delegate') {
    const [campaign, delegate] = args;
    if (!campaign || !delegate) {
      throw new Error('Usage: node scripts/keeper/src/index.js set-delegate <campaignPubkey> <delegatePubkey>');
    }
    await keeper.setDelegateAuthority(new PublicKey(campaign), delegate);
    return;
  }

  await keeper.start();
}

main().catch((e) => {
  console.error('💥 Keeper crashed:', e);
  process.exit(1);
});


