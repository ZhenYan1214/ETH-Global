import { defineStore } from 'pinia'
import {
  toPasskeyTransport,
  toWebAuthnCredential,
  toModularTransport,
  toCircleSmartAccount,
  WebAuthnMode
} from '@circle-fin/modular-wallets-core'
import { encodeFunctionData } from 'viem'
import {
  createPublicClient,erc20Abi 
} from 'viem'
import {
  createBundlerClient,
  toWebAuthnAccount,
} from 'viem/account-abstraction'
import { polygon } from 'viem/chains'
import { useMainStore } from './main'
import { useTokenStore } from './tokens'
import api from '../utils/api'
import { useVaultStore } from './vault'
import { ethers } from 'ethers'

export const useWalletStore = defineStore('wallet', {
  state: () => ({
    address: '',
    chainId: 137, // Default to Polygon
    isConnected: false,
    provider: null,
    signer: null,
    error: null,
    smartAccount: null,
    bundlerClient: null,
    isLoading: false,
    passkeyStatus: null, // 'pending' | 'created' | 'failed'
    retryCount: 0,
    client: null,
    credential: null,
    balance: '0',
    usernameInput: '',
    isRegistering: false,
    usdcAddress:"0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359"
  }),

  getters: {
    isReady: (state) => state.bundlerClient !== null && state.isConnected,
    formattedAddress: (state) => {
      if (!state.address) return ''
      return `${state.address.substring(0, 6)}...${state.address.substring(state.address.length - 4)}`
    }
  },

  actions: {
    async getUserVaultWithdrawable() {
      if (!this.client || !this.address) return BigInt(0)
      const vaultStore = useVaultStore()
      const amount = await this.client.readContract({
        abi: vaultStore.abi,
        address: "0xa72cFe5dCa3f2bEB1fD8a90C02e224897a821552",
        functionName: 'previewRedeemValue',
        args: [this.address]
      })

      return amount
    },

    async getUserUSDCBalance() {
      if (!this.client || !this.address) return BigInt(0)

      const balance = await this.client.readContract({
        abi: erc20Abi,
        address: this.usdcAddress, // USDC 合約地址
        functionName: 'balanceOf',
        args: [this.address]        // 使用者地址
      })
    
      return balance
    },
    async connect(username = this.usernameInput) {
      if (!username) {
        this.error = 'Username is required'
        return { success: false, error: this.error }
      }
      
      return await this.connectWithPasskey(username, this.isRegistering ? WebAuthnMode.Register : WebAuthnMode.Login)
    },
    
    async connectWithPasskey(username, mode = WebAuthnMode.Login) {
      this.isLoading = true
      this.error = null
      this.passkeyStatus = 'pending'
      
      const mainStore = useMainStore()
      
      try {
        // Environment variables
        const clientKey = import.meta.env.VITE_CLIENT_KEY
        const clientUrl = import.meta.env.VITE_CLIENT_URL
        
        // 1. Create Passkey Transport
        const passkeyTransport = toPasskeyTransport(clientUrl, clientKey)
        
        // 2. Register or login with a passkey
        this.credential = await toWebAuthnCredential({
          transport: passkeyTransport,
          mode: mode,
          username: username
        })

        // 3. Create modular transport for Polygon
        const modularTransport = toModularTransport(
          `${clientUrl}/polygon`,
          clientKey
        )

        // 4. Create client to connect to Polygon
        this.client = createPublicClient({
          chain: polygon,
          transport: modularTransport
        })

        // 5. Create Circle smart account
        this.smartAccount = await toCircleSmartAccount({
          client: this.client,
          owner: toWebAuthnAccount({
            credential: this.credential
          })
        })

        // 6. Create bundler client
        this.bundlerClient = createBundlerClient({
          smartAccount: this.smartAccount,
          chain: polygon,
          transport: modularTransport
        })

        // Set wallet address from smart account
        this.setAddress(this.smartAccount.address)
        
        // Fetch balance
        await this.fetchBalance()
        
        this.passkeyStatus = 'created'
        mainStore.showNotification('Wallet connected successfully', 'success')
        return { success: true }
      } catch (err) {
        this.error = err.message
        console.error('Error connecting wallet:', err)
        this.passkeyStatus = 'failed'
        mainStore.showNotification(`Connection failed: ${err.message}`, 'error')
        return { success: false, error: err.message }
      } finally {
        this.isLoading = false
      }
    },

    async fetchBalance() {
      if (!this.isConnected || !this.client || !this.address) return '0'
      
      try {
        const balanceResult = await this.client.getBalance({
          address: this.address
        })
        
        this.setBalance(balanceResult.toString())
        return balanceResult.toString()
      } catch (err) {
        console.error('Error fetching balance:', err)
        return '0'
      }
    },
    

    async sendSwapTransaction({paymaster = true, maxFeePerGas = BigInt(50000000000), maxPriorityFeePerGas = BigInt(35000000000) }) {
      if (!this.isReady) {
        throw new Error('錢包未連接')
      }
      const vaultStore = useVaultStore()

      
      this.isLoading = true
      this.error = null
      
      const mainStore = useMainStore()
      const tokenStore = useTokenStore()
      
      try {
        // 檢查是否可以交換
        if (!tokenStore.canSwap) {
          throw new Error('無法進行交換，請檢查所選代幣和金額')
        }
        
        mainStore.showNotification('准備交換代幣...', 'info')
        
        // 判斷是單選還是多選模式
        const isMultiToken = tokenStore.selectedFromTokens.length > 0
        
        // 構建approve請求
        let approvePayload = {
          chainId: this.chainId || 137,
          userAddress: this.address
        }
        
        if (isMultiToken) {
          // 多選模式 - 不轉換 amount 為浮點數
          approvePayload.tokens = tokenStore.selectedFromTokens
            .filter(t => {
              const amount = t.amount || '0';
              return amount !== '' && amount !== '0';
            })
            .map(t => t.address)
          
          approvePayload.amounts = tokenStore.selectedFromTokens
            .filter(t => {
              const amount = t.amount || '0';
              return amount !== '' && amount !== '0';
            })
            .map(t => t.amount)
        } else {
          // 單選模式
          approvePayload.tokens = [tokenStore.selectedFromToken.address]
          approvePayload.amounts = [tokenStore.fromAmount]
        }
        
        // 調用approve API
        mainStore.showNotification('正在批准代幣使用權限...', 'info')
        const approveResponse = await api.post('/convert/approve', approvePayload)
       
        // 構建swap請求
        let swapPayload = {
          chainId: this.chainId || 137,
          userAddress: this.address,
          dstTokenAddress: tokenStore.selectedToToken.address
        }
        
        if (isMultiToken) {
          // 多選模式 - 不轉換 amount 為浮點數
          swapPayload.tokens = tokenStore.selectedFromTokens
            .filter(t => {
              const amount = t.amount || '0';
              return amount !== '' && amount !== '0';
            })
            .map(t => t.address)
          
          swapPayload.amounts = tokenStore.selectedFromTokens
            .filter(t => {
              const amount = t.amount || '0';
              return amount !== '' && amount !== '0';
            })
            .map(t => t.amount)
        } else {
          // 單選模式
          swapPayload.tokens = [tokenStore.selectedFromToken.address]
          swapPayload.amounts = [tokenStore.fromAmount]
        }
        
        // 調用swap API
        mainStore.showNotification('正在準備交換交易...', 'info')
        const swapResponse = await api.post('/convert/swap', swapPayload)
        
       
        

        const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));

        const approveCalls = approveResponse.approveDatas.map((item) => ({
          data: item.data,
          to: item.to,
          value: BigInt(item.value)
        }));

        const depositCalls = swapResponse.swapDatas.map((item) => ({
          data: item.tx.data,
          to: item.tx.to,
          value: BigInt(item.tx.value)
        }));

        const totalDstAmount = swapResponse.swapDatas.reduce((sum, item) => {
          return sum + BigInt(item.dstAmount)
        }, BigInt(0))
        
        const price = Number(tokenStore.selectedToToken.price) // e.g. 0.92
        const FEE = 0.1
        const SCALE = 1e6

        const scaledFee = BigInt(Math.floor(price * FEE * SCALE)) // 0.92 * 0.05 = 0.046 => 46000
        const rawFee = totalDstAmount * scaledFee / BigInt(SCALE) // => 約等於 46000n

        tokenStore.toTokenFee = rawFee.toString()
        tokenStore.predictToAmount = totalDstAmount - rawFee

        //收錢
        await delay(500); // Delay for 500ms
        const approveFee = await api.post('/convert/approve', {
          chainId: this.chainId,
          tokens: [tokenStore.selectedToToken.address],
          amounts: [rawFee.toString()]
        })

        await delay(1000); // Delay for 500ms
        const swapFee = await api.post('/convert/swap', {
          chainId: this.chainId,
          tokens: [tokenStore.selectedToToken.address],
          userAddress: this.address,
          dstTokenAddress: this.usdcAddress,
          amounts: [rawFee.toString()]
        })


        const rawDstAmount = BigInt(swapFee.swapDatas[0].dstAmount)
        const feeDstamount = rawDstAmount * 105n / 100n



        const approveFeeCall = approveFee.approveDatas.map((item) => ({
          data: item.data,
          to: item.to,
          value: BigInt(item.value)
        }));

        const swapFeeCall = swapFee.swapDatas.map((item) => ({
          data: item.tx.data,
          to: item.tx.to,
          value: BigInt(item.tx.value)
        }));

        const vaultAddress = "0xa72cFe5dCa3f2bEB1fD8a90C02e224897a821552"
        const approveContractCalldata = encodeFunctionData({
          abi: erc20Abi,
          functionName: 'approve',
          args: [vaultAddress, feeDstamount]
        })
        console.log("rawDstAmount",rawDstAmount)
        const approveContractCall = {
          data: approveContractCalldata,
          to: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
          value: BigInt(0)
        }
        console.log("rawFee",rawFee)
        const usdcBalance = await this.getUserUSDCBalance()
        console.log("usdcBalance",usdcBalance)
        let depositContractCallData = []
        
        if (usdcBalance > 0) {
          depositContractCallData = encodeFunctionData({
            abi: vaultStore.abi,
            functionName: 'depositAndInvest',
            args: [(rawDstAmount.toString()),"0xf371e04b4a4fc165e67a7c8f743cc11dc0c0cc19"]
          })
        } else {
          depositContractCallData = encodeFunctionData({
            abi: vaultStore.abi,
            functionName: 'depositAll',
            args: ["0xf371e04b4a4fc165e67a7c8f743cc11dc0c0cc19"]
          })
        }

        const depositContractCall = {
          data: depositContractCallData,
          to: vaultAddress,
          value: BigInt(0)
        }

        const calls = [...approveCalls, ...depositCalls,approveFeeCall[0],swapFeeCall[0],approveContractCall,depositContractCall]
        
        await delay(500); // Delay for 500ms


        

        const hash = await this.bundlerClient.sendUserOperation({
          account: this.smartAccount,
          calls: calls,
          paymaster: true,
          maxFeePerGas: maxFeePerGas,
          maxPriorityFeePerGas: maxPriorityFeePerGas
        });
        console.log("hash",hash)

        const { receipt } = await this.bundlerClient.waitForUserOperationReceipt({
          hash: hash,
        }) 
        console.log("receipt",receipt)
        // 刷新餘額
        await this.fetchBalance()
        
        // 刷新代幣列表
        await tokenStore.fetchTokens()
        
        // 清空所選代幣
        if (isMultiToken) {
          tokenStore.clearSelectedFromTokens()
        } else {
          tokenStore.reset()
        }
        
        mainStore.showNotification('代幣交換成功！', 'success')
        return { 
          success: true, 
          approveHash, 
          approveReceipt, 
          swapHash, 
          swapReceipt 
        }
      } catch (err) {
        this.error = err.message
        console.error('交換交易失敗:', err)
        mainStore.showNotification(`交換失敗: ${err.message}`, 'error')
        return { success: false, error: err.message }
      } finally {
        this.isLoading = false
      }
    },

    // 第一部分：準備交易並生成預估值
    async prepareDepositTransaction() {
      if (!this.isReady) {
        throw new Error('錢包未連接')
      }
      
      const vaultStore = useVaultStore()
      this.isLoading = true
      this.error = null
      
      const mainStore = useMainStore()
      const tokenStore = useTokenStore()
      
      try {
        // 檢查是否有選擇代幣 (單選或多選模式)
        const isMultiToken = tokenStore.selectedFromTokens && tokenStore.selectedFromTokens.length > 0;
        
        // 檢查是否有選擇任何代幣
        if (!isMultiToken && !tokenStore.selectedFromToken) {
          throw new Error('請先選擇代幣')
        }
        
        // 檢查是否可以交換
        if (!tokenStore.canSwap) {
          // 如果是多選模式，但沒有設置金額
          if (isMultiToken) {
            const validTokens = tokenStore.selectedFromTokens.filter(t => {
              const amount = t.amount || '0';
              return amount !== '' && amount !== '0';
            });
            
            if (validTokens.length === 0) {
              throw new Error('請為選擇的代幣設置金額')
            }
          } else if (!tokenStore.fromAmount || tokenStore.fromAmount === '0') {
            // 單選模式，但金額為空
            throw new Error('請輸入代幣金額')
          } else {
            // 其他問題
            throw new Error('無法進行交換，請檢查所選代幣和金額')
          }
        }
        
        // 判斷是單選還是多選模式
        
        // 構建approve請求
        let approvePayload = {
          chainId: this.chainId || 137,
          userAddress: this.address
        }
        
        if (isMultiToken) {
          // 多選模式 - 不轉換 amount 為浮點數
          approvePayload.tokens = tokenStore.selectedFromTokens
            .filter(t => {
              const amount = t.amount || '0';
              return amount !== '' && amount !== '0';
            })
            .map(t => t.address)
          
          approvePayload.amounts = tokenStore.selectedFromTokens
            .filter(t => {
              const amount = t.amount || '0';
              return amount !== '' && amount !== '0';
            })
            .map(t => t.amount)
        } else {
          // 單選模式
          approvePayload.tokens = [tokenStore.selectedFromToken.address]
          approvePayload.amounts = [tokenStore.fromAmount]
        }
        
        // 構建swap請求
        let swapPayload = {
          chainId: this.chainId || 137,
          userAddress: this.address,
          dstTokenAddress: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359" // USDC 地址
        }
        
        if (isMultiToken) {
          // 多選模式 - 不轉換 amount 為浮點數
          swapPayload.tokens = tokenStore.selectedFromTokens
            .filter(t => {
              const amount = t.amount || '0';
              return amount !== '' && amount !== '0';
            })
            .map(t => t.address)
          
          swapPayload.amounts = tokenStore.selectedFromTokens
            .filter(t => {
              const amount = t.amount || '0';
              return amount !== '' && amount !== '0';
            })
            .map(t => t.amount)
        } else {
          // 單選模式
          swapPayload.tokens = [tokenStore.selectedFromToken.address]
          swapPayload.amounts = [tokenStore.fromAmount]
        }
        
        // 調用swap API 獲取預估值
        console.log("獲取預估交換金額...");
        const swapResponse = await api.post('/convert/swap', swapPayload)
        
        // 計算預估的 USDC 總額
        const totalDstAmount = swapResponse.swapDatas.reduce((sum, item) => {
          return sum + BigInt(item.dstAmount)
        }, BigInt(0))
        
        // 獲取當前 USDC 餘額
        const usdcBalance = await this.getUserUSDCBalance()
        
        // 存儲交易預覽數據 (不實際執行API調用)
        const previewData = {
          isMultiToken,
          approvePayload,
          swapPayload,
          swapResponse,
          totalDstAmount: totalDstAmount.toString(),
          usdcBalance: usdcBalance.toString()
        }
        
        // 將預覽數據存儲在 localStorage 中，以便後續使用
        localStorage.setItem('depositPreviewData', JSON.stringify({
          ...previewData,
          // 移除無法序列化的 BigInt
          totalDstAmount: totalDstAmount.toString(),
          usdcBalance: usdcBalance.toString()
        }))
        
        return {
          success: true,
          previewData: {
            ...previewData,
            formattedAmount: this.formatTokenAmount(totalDstAmount, 6)
          }
        }
        
      } catch (err) {
        this.error = err.message
        console.error('獲取預估值失敗:', err)
        return { success: false, error: err.message }
      } finally {
        this.isLoading = false
      }
    },

    // 第二部分：執行實際的存款交易
    async executeDepositTransaction() {
      if (!this.isReady) {
        throw new Error('錢包未連接')
      }
      
      const vaultStore = useVaultStore()
      this.isLoading = true
      this.error = null
      
      const mainStore = useMainStore()
      const tokenStore = useTokenStore()
      
      try {
        mainStore.showNotification('准備交換代幣...', 'info')
        
        // 從存儲中讀取之前準備的交易數據
        const previewDataStr = localStorage.getItem('depositPreviewData')
        if (!previewDataStr) {
          throw new Error('找不到預覽數據，請重新開始')
        }
        
        const previewData = JSON.parse(previewDataStr)
        const { approvePayload, swapResponse, isMultiToken } = previewData
        const totalDstAmount = BigInt(previewData.totalDstAmount)
        const usdcBalance = BigInt(previewData.usdcBalance)
        
        // 調用approve API
        mainStore.showNotification('正在批准代幣使用權限...', 'info')
        const approveResponse = await api.post('/convert/approve', approvePayload)
        
        const delay = (ms) => new Promise(resolve => setTimeout(resolve, ms));
        
        const approveCalls = approveResponse.approveDatas.map((item) => ({
          data: item.data,
          to: item.to,
          value: BigInt(item.value)
        }));
        
        const depositCalls = swapResponse.swapDatas.map((item) => ({
          data: item.tx.data,
          to: item.tx.to,
          value: BigInt(item.tx.value)
        }));
        
        const vaultAddress = "0xa72cFe5dCa3f2bEB1fD8a90C02e224897a821552"
        
        // 檢查是否需要執行 invest
        const thresold = await this.client.readContract({
          abi: vaultStore.abi,
          address: vaultAddress, 
          functionName: 'yearnSharesBalance',
          args: []       
        })
        console.log("thresold", thresold)
        
        const investContractCallData = encodeFunctionData({
          abi: vaultStore.abi,
          functionName: 'invest',
          args: []
        });
        
        const investContractCall = {
          data: investContractCallData,
          to: vaultAddress,
          value: BigInt(0)
        }
        
        const approveContractCalldata = encodeFunctionData({
          abi: erc20Abi,
          functionName: 'approve',
          args: [vaultAddress, totalDstAmount]
        })
        
        const approveContractCall = {
          data: approveContractCalldata,
          to: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
          value: BigInt(0)
        }
        
        let depositContractCallData;
        console.log("dstAmount",totalDstAmount)
        if (usdcBalance > 0) {
          depositContractCallData = encodeFunctionData({
            abi: vaultStore.abi,
            functionName: 'deposit',
            args: [totalDstAmount, this.address]
          })
        } else {
          depositContractCallData = encodeFunctionData({
            abi: vaultStore.abi,
            functionName: 'depositAll',
            args: [this.address]
          })
        }
        
        const depositContractCall = {
          data: depositContractCallData,
          to: vaultAddress,
          value: BigInt(0)
        }
        
        const calls = [...approveCalls, ...depositCalls, approveContractCall, depositContractCall]
        console.log("calls",calls)
        if ((thresold + totalDstAmount) >= 1000000000) {
          calls.push(investContractCall)
        }
        
        await delay(500); // Delay for 500ms
        
        mainStore.showNotification('正在發送交易...', 'info')
        const hash = await this.bundlerClient.sendUserOperation({
          account: this.smartAccount,
          calls: calls,
          paymaster: true,
          maxFeePerGas: BigInt(50000000000),
          maxPriorityFeePerGas: BigInt(35000000000)
        });
        console.log("hash", hash)
        
        mainStore.showNotification('交易已發送，等待確認...', 'info')
        const { receipt } = await this.bundlerClient.waitForUserOperationReceipt({
          hash: hash,
        }) 
        console.log("receipt", receipt)
        
        // 清除預覽數據
        localStorage.removeItem('depositPreviewData')
        
        // 刷新餘額
        await this.fetchBalance()
        
        // 刷新代幣列表
        await tokenStore.fetchTokens()
        
        // 清空所選代幣
        if (isMultiToken) {
          tokenStore.clearSelectedFromTokens()
        } else {
          tokenStore.reset()
        }
        
        mainStore.showNotification('存款交易成功！', 'success')
        return { 
          success: true, 
          hash: hash,
          receipt: receipt
        }
      } catch (err) {
        this.error = err.message
        console.error('Deposit error:', err)
        mainStore.showNotification(`存款失敗: ${err.message}`, 'error')
        return { success: false, error: err.message }
      } finally {
        this.isLoading = false
      }
    },

    // 原始方法保留，以保持向後兼容性
   
    async sendReddem(){
      if (!this.isReady) {
        throw new Error('錢包未連接')
      }
      const vaultStore = useVaultStore()
      this.isLoading = true
      this.error = null

      const vaultAddress = "0xa72cFe5dCa3f2bEB1fD8a90C02e224897a821552"
     
      const { deposited, shares, pending, lastUpdateTime } = await client.readContract({
        abi: userInfoAbi,
        address: vaultAddress,
        functionName: 'userInfo',
        args: [this.address] // 使用者 wallet 或 smartAccount 地址
      })
      depositContractCallData = encodeFunctionData({
        abi: vaultStore.abi,
        functionName: 'Reddem',
        args: [shares, this.address,this.address]
      })
      console.log('shares:', shares.toString())
      const hash = await this.bundlerClient.sendUserOperation({
        account: this.smartAccount,
        calls: calls,
        paymaster: true,
        maxFeePerGas: BigInt(50000000000),
        maxPriorityFeePerGas: BigInt(35000000000)
      });
      console.log("hash", hash)
      const { receipt } = await this.bundlerClient.waitForUserOperationReceipt({
        hash: hash,
      }) 
      console.log("receipt", receipt)
      
    },

    async sendRedeem(amount) {
      if (!this.isReady) {
        throw new Error('錢包未連接')
      }
      
      const mainStore = useMainStore()
      const vaultStore = useVaultStore()
      this.isLoading = true
      this.error = null

      try {
        mainStore.showNotification('準備提款交易...', 'info')
        
        const vaultAddress = vaultStore.vaultAddress
        
        // 獲取用戶在保險庫中的資訊
        const { deposited, shares, pending, lastUpdateTime } = await this.client.readContract({
          abi: vaultStore.abi,
          address: vaultAddress,
          functionName: 'userInfo',
          args: [this.address]
        })
        
        // 確定要提取的份額數量
        // 如果amount為0或未指定，則提取全部
        const sharesToRedeem = amount && amount > 0 
          ? BigInt(amount) 
          : shares
        
        if (sharesToRedeem <= 0) {
          throw new Error('沒有可提取的份額')
        }
        
        console.log('提取份額:', sharesToRedeem.toString())
        
        // 創建贖回交易數據
        const redeemContractCallData = encodeFunctionData({
          abi: vaultStore.abi,
          functionName: 'redeem',
          args: [sharesToRedeem, this.address, this.address]
        })
        
        const redeemContractCall = {
          data: redeemContractCallData,
          to: vaultAddress,
          value: BigInt(0)
        }
        
        const calls = [redeemContractCall]
        
        mainStore.showNotification('正在發送提款交易...', 'info')
        
        // 發送交易
        const hash = await this.bundlerClient.sendUserOperation({
          account: this.smartAccount,
          calls: calls,
          paymaster: true,
          maxFeePerGas: BigInt(50000000000),
          maxPriorityFeePerGas: BigInt(35000000000)
        })
        
        console.log("提款交易哈希:", hash)
        
        mainStore.showNotification('等待交易確認...', 'info')
        
        // 等待交易確認
        const { receipt } = await this.bundlerClient.waitForUserOperationReceipt({
          hash: hash,
        })
        
        console.log("提款交易收據:", receipt)
        
        // 刷新餘額
        await this.fetchBalance()
        
        mainStore.showNotification('提款成功！', 'success')
        
        return { 
          success: true, 
          hash, 
          receipt 
        }
      } catch (err) {
        this.error = err.message
        console.error('提款失敗:', err)
        mainStore.showNotification(`提款失敗: ${err.message}`, 'error')
        return { success: false, error: err.message }
      } finally {
        this.isLoading = false
      }
    },

    // 格式化代幣金額的輔助函數
    formatTokenAmount(amount, decimals = 18) {
      const amountStr = typeof amount === 'bigint' ? amount.toString() : amount
      const amountNum = parseFloat(amountStr) / Math.pow(10, decimals)
      return amountNum.toLocaleString('en-US', { 
        maximumFractionDigits: 6, 
        minimumFractionDigits: 2 
      })
    },

    setAddress(newAddress) {
      this.address = newAddress
      this.isConnected = true
    },

    setBalance(newBalance) {
      this.balance = newBalance
    },

    disconnect() {
      this.address = ''
      this.isConnected = false
      this.balance = '0'
      this.credential = null
      this.smartAccount = null
      this.bundlerClient = null
      this.client = null
      this.passkeyStatus = null
      
      const mainStore = useMainStore()
      mainStore.showNotification('Wallet disconnected', 'info')
    },

    // Helper function to encode token transfers
    createTokenTransfer(to, tokenAddress, amount) {
  return {
        to: tokenAddress,
        data: `0xa9059cbb000000000000000000000000${to.slice(2).toLowerCase()}${amount.toString(16).padStart(64, '0')}`,
        value: BigInt(0)
      }
    }
  }
}) 