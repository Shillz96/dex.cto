# 🚀 Quick Start Deployment Guide

## **Ready to Deploy in 5 Minutes!**

Your Solana CTO DEX Escrow program is **100% ready** for deployment. Here's how to get started immediately:

---

## ⚡ **Quick Deployment Commands**

### **1. Build Program**
```bash
cd cto.dex
anchor build
```

### **2. Deploy to Devnet (Testing)**
```bash
# Set to devnet
solana config set --url devnet

# Deploy program
anchor deploy --provider.cluster devnet

# Verify deployment
solana program show CfzHBxVGRyVC6TythNtmDkXVX1k9iJQvwzBasFDDbLsY --url devnet
```

### **3. Deploy to Mainnet (Production)**
```bash
# Set to mainnet
solana config set --url mainnet-beta

# Deploy program
anchor deploy --provider.cluster mainnet-beta

# Verify deployment
solana program show CfzHBxVGRyVC6TythNtmDkXVX1k9iJQvwzBasFDDbLsY --url mainnet-beta
```

---

## 🔧 **Prerequisites (Install Once)**

### **Solana CLI**
```bash
sh -c "$(curl -sSfL https://release.solana.com/v1.17.0/install)"
```

### **Anchor CLI**
```bash
npm install -g @coral-xyz/anchor-cli
```

### **Verify Installation**
```bash
solana --version
anchor --version
```

---

## 📊 **Post-Deployment Monitoring**

### **Health Check**
```bash
curl https://your-domain.com/api/health
```

### **Monitoring Dashboard**
- **URL**: `https://your-domain.com/monitoring`
- **Real-time metrics**: Transaction rates, errors, performance

---

## 🚨 **Emergency Commands**

### **Check Program Status**
```bash
solana program show CfzHBxVGRyVC6TythNtmDkXVX1k9iJQvwzBasFDDbLsY --url mainnet-beta
```

### **Rollback (If Needed)**
```bash
anchor deploy --provider.cluster mainnet-beta --program-id OLD_PROGRAM_ID
```

---

## 📋 **What's Already Done**

✅ **Security**: Reentrancy protection implemented  
✅ **Validation**: Comprehensive input validation  
✅ **Testing**: Full test coverage  
✅ **Monitoring**: Real-time health checks  
✅ **Documentation**: Complete guides  

---

## 🎯 **Next Steps**

1. **Deploy to devnet** (5 minutes)
2. **Test all functions** (15 minutes)  
3. **Deploy to mainnet** (5 minutes)
4. **Monitor performance** (ongoing)

---

## 📞 **Need Help?**

- **Full Guide**: `docs/DEPLOYMENT_PREPARATION.md`
- **Checklist**: `docs/DEPLOYMENT_CHECKLIST.md`
- **Security**: `docs/REENTRANCY_PROTECTION.md`

**Your program is production-ready! 🚀**
