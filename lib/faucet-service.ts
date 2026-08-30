// BSC Faucet and Gas Fee Assistance Service
export class FaucetService {
  private static readonly FAUCET_ENDPOINTS = [
    {
      name: "BSC Testnet Faucet",
      url: "https://testnet.bnbchain.org/faucet-smart",
      network: "testnet",
      amount: "0.1 BNB",
      description: "Official BSC testnet faucet",
    },
    {
      name: "QuickNode BSC Faucet",
      url: "https://faucet.quicknode.com/binance-smart-chain",
      network: "testnet",
      amount: "0.05 BNB",
      description: "QuickNode BSC faucet service",
    },
    {
      name: "Chainlink BSC Faucet",
      url: "https://faucets.chain.link/bnb-chain-testnet",
      network: "testnet",
      amount: "0.1 BNB",
      description: "Chainlink faucet for BSC testnet",
    },
  ]

  private static readonly ADMIN_WALLET = "0xd47c7585550eAd12aD365Fba5F4bD2533B9b4Eaf"
  private static readonly TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN
  private static readonly TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID

  // Get available faucets for current network
  static getAvailableFaucets(isMainnet = true) {
    if (isMainnet) {
      return [] // No faucets for mainnet
    }
    return this.FAUCET_ENDPOINTS
  }

  // Check if user is on testnet (where faucets work)
  static isTestnetAvailable(chainId: string): boolean {
    return chainId === "0x61" // BSC Testnet
  }

  // Request BNB from faucet
  static async requestFromFaucet(
    walletAddress: string,
    faucetUrl: string,
  ): Promise<{
    success: boolean
    message: string
    txHash?: string
  }> {
    try {
      // Most faucets require manual interaction, so we'll guide users
      return {
        success: true,
        message: "Please visit the faucet website and request BNB manually. It may take a few minutes to receive.",
      }
    } catch (error) {
      return {
        success: false,
        message: "Faucet request failed. Please try manually visiting the faucet website.",
      }
    }
  }

  // Send real-time notification to admin about gas fee assistance needed
  static async notifyAdminForGasAssistance(
    userWallet: string,
    requiredAmount: number,
    shortfall: number,
  ): Promise<{
    success: boolean
    message: string
    requestId?: string
  }> {
    try {
      const requestId = `gas_${Date.now()}_${userWallet.slice(-6)}`

      // Prepare notification data
      const notificationData = {
        type: "gas_assistance_request",
        requestId,
        userWallet,
        requiredAmount: requiredAmount.toFixed(6),
        shortfall: shortfall.toFixed(6),
        timestamp: new Date().toISOString(),
        urgency: shortfall > 0.01 ? "high" : "medium",
      }

      // Send to multiple notification channels
      const results = await Promise.allSettled([
        this.sendTelegramNotification(notificationData),
        this.sendWebhookNotification(notificationData),
        this.logGasRequest(notificationData),
      ])

      const successCount = results.filter((r) => r.status === "fulfilled").length

      if (successCount > 0) {
        return {
          success: true,
          message: `Gas assistance request sent to admin. Request ID: ${requestId}`,
          requestId,
        }
      } else {
        throw new Error("All notification methods failed")
      }
    } catch (error) {
      console.error("Failed to notify admin:", error)
      return {
        success: false,
        message: "Failed to send gas assistance request. Please try alternative methods.",
      }
    }
  }

  // Send Telegram notification to admin
  private static async sendTelegramNotification(data: any): Promise<void> {
    if (!this.TELEGRAM_BOT_TOKEN || !this.TELEGRAM_CHAT_ID) {
      throw new Error("Telegram credentials not configured")
    }

    const message = `
🚨 *Gas Fee Assistance Needed*

👤 *User:* \`${data.userWallet}\`
⛽ *Required:* ${data.requiredAmount} BNB
💰 *Shortfall:* ${data.shortfall} BNB
🆔 *Request ID:* ${data.requestId}
⏰ *Time:* ${new Date(data.timestamp).toLocaleString()}
🔥 *Urgency:* ${data.urgency.toUpperCase()}

*Quick Actions:*
• Send ${data.shortfall} BNB to user wallet
• Or guide user to faucet/exchange
• Reply with: /gas_sent ${data.requestId}
    `

    const response = await fetch(`https://api.telegram.org/bot${this.TELEGRAM_BOT_TOKEN}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: this.TELEGRAM_CHAT_ID,
        text: message,
        parse_mode: "Markdown",
      }),
    })

    if (!response.ok) {
      throw new Error("Telegram notification failed")
    }
  }

  // Send webhook notification (for Discord, Slack, etc.)
  private static async sendWebhookNotification(data: any): Promise<void> {
    const webhookUrl = process.env.NEXT_PUBLIC_ADMIN_WEBHOOK_URL

    if (!webhookUrl) {
      throw new Error("Webhook URL not configured")
    }

    const payload = {
      embeds: [
        {
          title: "⛽ Gas Fee Assistance Request",
          color: data.urgency === "high" ? 0xff0000 : 0xffa500,
          fields: [
            { name: "👤 User Wallet", value: `\`${data.userWallet}\``, inline: false },
            { name: "⛽ Required BNB", value: `${data.requiredAmount} BNB`, inline: true },
            { name: "💰 Shortfall", value: `${data.shortfall} BNB`, inline: true },
            { name: "🆔 Request ID", value: data.requestId, inline: false },
            { name: "⏰ Timestamp", value: new Date(data.timestamp).toLocaleString(), inline: false },
          ],
          footer: { text: "BNB Chain Asset Verifier - Gas Assistance" },
          timestamp: data.timestamp,
        },
      ],
    }

    const response = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    })

    if (!response.ok) {
      throw new Error("Webhook notification failed")
    }
  }

  // Log gas assistance request for tracking
  private static async logGasRequest(data: any): Promise<void> {
    try {
      // Check if we're in browser environment
      if (typeof window === "undefined") {
        console.log("🚨 Gas Assistance Request (Server):", data)
        return
      }

      // Store in localStorage for client-side tracking
      const requests = JSON.parse(localStorage.getItem("gas_requests") || "[]")
      requests.push(data)

      // Keep only last 50 requests
      if (requests.length > 50) {
        requests.splice(0, requests.length - 50)
      }

      localStorage.setItem("gas_requests", JSON.stringify(requests))

      // Also log to console for debugging
      console.log("🚨 Gas Assistance Request:", data)
    } catch (error) {
      console.error("Failed to log gas request:", error)
    }
  }

  // Check if admin has responded to gas request
  static async checkGasRequestStatus(requestId: string): Promise<{
    status: "pending" | "sent" | "expired"
    message: string
  }> {
    try {
      if (typeof window === "undefined") {
        return { status: "pending", message: "Server-side check pending" }
      }

      const requests = JSON.parse(localStorage.getItem("gas_requests") || "[]")
      const request = requests.find((r: any) => r.requestId === requestId)

      if (!request) {
        return { status: "expired", message: "Request not found or expired" }
      }

      // Check if request is older than 1 hour
      const requestTime = new Date(request.timestamp).getTime()
      const now = Date.now()
      const hourInMs = 60 * 60 * 1000

      if (now - requestTime > hourInMs) {
        return { status: "expired", message: "Request expired after 1 hour" }
      }

      // In a real implementation, you'd check with your backend/admin system
      return { status: "pending", message: "Request is being processed by admin" }
    } catch (error) {
      return { status: "expired", message: "Failed to check request status" }
    }
  }

  // Get gas assistance alternatives
  static getGasAssistanceOptions(isMainnet = true): Array<{
    type: "faucet" | "exchange" | "admin" | "bridge"
    name: string
    description: string
    url?: string
    available: boolean
  }> {
    return [
      {
        type: "admin",
        name: "Admin Gas Assistance",
        description: "Request BNB directly from admin wallet (fastest)",
        available: true,
      },
      {
        type: "exchange",
        name: "Buy BNB on Binance",
        description: "Purchase BNB and transfer to your wallet",
        url: "https://www.binance.com/en/trade/BNB_USDT",
        available: true,
      },
      {
        type: "bridge",
        name: "BSC Bridge",
        description: "Bridge BNB from other networks",
        url: "https://www.bnbchain.org/en/bridge",
        available: true,
      },
      {
        type: "faucet",
        name: "BSC Testnet Faucet",
        description: "Free BNB for testing (testnet only)",
        url: "https://testnet.bnbchain.org/faucet-smart",
        available: !isMainnet,
      },
    ]
  }

  // Estimate time for different gas assistance methods
  static getEstimatedTime(method: string): string {
    const times = {
      admin: "1-5 minutes",
      exchange: "5-30 minutes",
      bridge: "10-60 minutes",
      faucet: "1-10 minutes",
    }
    return times[method as keyof typeof times] || "Unknown"
  }
}
