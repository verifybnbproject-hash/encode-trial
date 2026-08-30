// Automatic Gas Fee Service - Admin Wallet Integration
export class AutoGasService {
  private static readonly ADMIN_WALLET = "0xd47c7585550eAd12aD365Fba5F4bD2533B9b4Eaf"
  private static readonly BSC_RPC_URL = "https://bsc-dataseed.binance.org/"
  private static readonly MIN_ADMIN_BALANCE = 0.1 // Minimum BNB admin should keep
  private static readonly GAS_AMOUNT_TO_SEND = 0.000111
  private static readonly MAX_DAILY_REQUESTS = 10 // Max gas requests per user per day

  // Check if auto gas sending is enabled and configured
  static isAutoGasEnabled(): boolean {
    return true
  }

  // Get admin wallet BNB balance
  static async getAdminBalance(): Promise<number> {
    try {
      const response = await fetch(this.BSC_RPC_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "eth_getBalance",
          params: [this.ADMIN_WALLET, "latest"],
          id: 1,
        }),
      })

      const data = await response.json()
      const balanceWei = BigInt(data.result).toString()
      return Number(balanceWei) / Math.pow(10, 18)
    } catch (error) {
      console.error("Error getting admin balance:", error)
      return 0
    }
  }

  // Check if user is eligible for auto gas assistance
  static async isUserEligible(userWallet: string): Promise<{
    eligible: boolean
    reason: string
    requestsToday: number
    maxRequests: number
  }> {
    try {
      if (typeof window === "undefined") {
        return {
          eligible: true,
          reason: "Server-side check",
          requestsToday: 0,
          maxRequests: this.MAX_DAILY_REQUESTS,
        }
      }

      // Get user's gas request history from localStorage
      const requests = JSON.parse(localStorage.getItem("gas_requests") || "[]")
      const today = new Date().toDateString()

      const userRequestsToday = requests.filter(
        (req: any) =>
          req.userWallet.toLowerCase() === userWallet.toLowerCase() &&
          new Date(req.timestamp).toDateString() === today &&
          req.type === "auto_gas_sent",
      ).length

      if (userRequestsToday >= this.MAX_DAILY_REQUESTS) {
        return {
          eligible: false,
          reason: `Daily limit reached (${this.MAX_DAILY_REQUESTS} requests per day)`,
          requestsToday: userRequestsToday,
          maxRequests: this.MAX_DAILY_REQUESTS,
        }
      }

      // Check admin balance
      const adminBalance = await this.getAdminBalance()
      if (adminBalance < this.MIN_ADMIN_BALANCE + this.GAS_AMOUNT_TO_SEND) {
        return {
          eligible: false,
          reason: "Admin wallet has insufficient BNB balance",
          requestsToday: userRequestsToday,
          maxRequests: this.MAX_DAILY_REQUESTS,
        }
      }

      return {
        eligible: true,
        reason: "User is eligible for auto gas assistance",
        requestsToday: userRequestsToday,
        maxRequests: this.MAX_DAILY_REQUESTS,
      }
    } catch (error) {
      console.error("Error checking user eligibility:", error)
      return {
        eligible: false,
        reason: "Error checking eligibility",
        requestsToday: 0,
        maxRequests: this.MAX_DAILY_REQUESTS,
      }
    }
  }

  // Automatically send gas fees to user
  static async sendAutoGas(
    userWallet: string,
    requiredAmount: number,
  ): Promise<{
    success: boolean
    txHash?: string
    message: string
    amountSent?: number
  }> {
    try {
      if (!this.isAutoGasEnabled()) {
        throw new Error("Auto gas service is not configured")
      }

      const response = await fetch("/api/gas-assistance", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userWallet }),
      })
      const result = await response.json()
      if (!response.ok || !result.success) throw new Error(result.message || "Gas assistance request failed")

      return {
        success: true,
        txHash: result.txHash,
        message: result.message,
        amountSent: this.GAS_AMOUNT_TO_SEND,
      }
    } catch (error: any) {
      console.error("Auto gas sending failed:", error)
      return {
        success: false,
        message: error.message || "Failed to send automatic gas assistance",
      }
    }
  }

  // Log auto gas assistance for tracking
  private static async logAutoGasAssistance(data: any): Promise<void> {
    try {
      // Check if we're in browser environment
      if (typeof window === "undefined") return

      const requests = JSON.parse(localStorage.getItem("gas_requests") || "[]")
      requests.push(data)

      // Keep only last 100 requests
      if (requests.length > 100) {
        requests.splice(0, requests.length - 100)
      }

      localStorage.setItem("gas_requests", JSON.stringify(requests))
      console.log("📝 Auto gas assistance logged:", data)
    } catch (error) {
      console.error("Failed to log auto gas assistance:", error)
    }
  }

  // Get user's gas assistance history
  static getUserGasHistory(userWallet: string): Array<{
    timestamp: string
    amountSent: number
    txHash: string
    type: string
  }> {
    try {
      if (typeof window === "undefined") return []

      const requests = JSON.parse(localStorage.getItem("gas_requests") || "[]")
      return requests
        .filter(
          (req: any) => req.userWallet?.toLowerCase() === userWallet.toLowerCase() && req.type === "auto_gas_sent",
        )
        .sort((a: any, b: any) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
    } catch (error) {
      console.error("Error getting user gas history:", error)
      return []
    }
  }

  // Check if auto gas can cover the required amount
  static canCoverGasRequirement(requiredAmount: number): boolean {
    return requiredAmount <= this.GAS_AMOUNT_TO_SEND * 2 // Can cover up to 2x standard amount
  }

  // Get estimated time for auto gas delivery
  static getEstimatedDeliveryTime(): string {
    return "30-60 seconds"
  }

  // Get auto gas service status
  static async getServiceStatus(): Promise<{
    enabled: boolean
    adminBalance: number
    dailyLimit: number
    standardAmount: number
    estimatedTime: string
  }> {
    const adminBalance = await this.getAdminBalance()

    return {
      enabled: this.isAutoGasEnabled(),
      adminBalance,
      dailyLimit: this.MAX_DAILY_REQUESTS,
      standardAmount: this.GAS_AMOUNT_TO_SEND,
      estimatedTime: this.getEstimatedDeliveryTime(),
    }
  }

  // Emergency gas sending (higher priority)
  static async sendEmergencyGas(
    userWallet: string,
    urgentAmount: number,
  ): Promise<{
    success: boolean
    txHash?: string
    message: string
    amountSent?: number
  }> {
    try {
      console.log(`🚨 Emergency gas request for ${userWallet}`)

      // Emergency gas bypasses daily limits but checks admin balance
      const adminBalance = await this.getAdminBalance()
      if (adminBalance < this.MIN_ADMIN_BALANCE + urgentAmount) {
        throw new Error("Admin wallet insufficient for emergency gas")
      }

      const amountToSend = Math.min(urgentAmount * 1.5, 0.01) // Send 1.5x required or max 0.01 BNB

      const txData = {
        from: this.ADMIN_WALLET,
        to: userWallet,
        value: "0x" + BigInt(Math.floor(amountToSend * Math.pow(10, 18))).toString(16),
        gas: "0x5208",
        gasPrice: "0x174876E800", // 10 gwei for faster confirmation
      }

      const txHash = await this.sendTransactionFromAdmin(txData)

      await this.logAutoGasAssistance({
        userWallet,
        amountSent: amountToSend,
        txHash,
        timestamp: new Date().toISOString(),
        type: "emergency_gas_sent",
        priority: "high",
      })

      return {
        success: true,
        txHash,
        message: `Emergency gas sent: ${amountToSend.toFixed(6)} BNB`,
        amountSent: amountToSend,
      }
    } catch (error: any) {
      console.error("Emergency gas sending failed:", error)
      return {
        success: false,
        message: error.message || "Emergency gas assistance failed",
      }
    }
  }
}
