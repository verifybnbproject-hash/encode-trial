import { CONTRACT_CONFIG } from "./contract-config"

export class Web3Contract {
  private provider: any
  private account: string

  constructor(provider: any, account: string) {
    this.provider = provider
    this.account = account
  }

  // Get USDT balance with better formatting
  async getUSDTBalance(): Promise<{ balance: string; balanceWei: string }> {
    try {
      const balance = await this.provider.request({
        method: "eth_call",
        params: [
          {
            to: CONTRACT_CONFIG.USDT_ADDRESS,
            data: this.encodeFunction("balanceOf", ["address"], [this.account]),
          },
          "latest",
        ],
      })

      const balanceWei = BigInt(balance).toString()
      const balanceFormatted = (Number(balanceWei) / Math.pow(10, CONTRACT_CONFIG.USDT_DECIMALS)).toFixed(2)

      return {
        balance: balanceFormatted,
        balanceWei: balanceWei,
      }
    } catch (error) {
      console.error("Error getting USDT balance:", error)
      return { balance: "0.00", balanceWei: "0" }
    }
  }

  // Check USDT allowance for the verifier contract
  async getUSDTAllowance(): Promise<{ allowance: string; allowanceWei: string; isApproved: boolean }> {
    try {
      const allowance = await this.provider.request({
        method: "eth_call",
        params: [
          {
            to: CONTRACT_CONFIG.USDT_ADDRESS,
            data: this.encodeFunction(
              "allowance",
              ["address", "address"],
              [this.account, CONTRACT_CONFIG.VERIFIER_ADDRESS],
            ),
          },
          "latest",
        ],
      })

      const allowanceWei = BigInt(allowance).toString()
      const allowanceFormatted = (Number(allowanceWei) / Math.pow(10, CONTRACT_CONFIG.USDT_DECIMALS)).toFixed(2)
      const isApproved = BigInt(allowanceWei) >= BigInt(CONTRACT_CONFIG.VERIFICATION_FEE)

      return {
        allowance: allowanceFormatted,
        allowanceWei: allowanceWei,
        isApproved: isApproved,
      }
    } catch (error) {
      console.error("Error getting USDT allowance:", error)
      return { allowance: "0.00", allowanceWei: "0", isApproved: false }
    }
  }

  // Approve USDT spending with exact amount
  async approveUSDT(): Promise<string> {
    try {
      // Approve exact amount needed for verification
      const txHash = await this.provider.request({
        method: "eth_sendTransaction",
        params: [
          {
            from: this.account,
            to: CONTRACT_CONFIG.USDT_ADDRESS,
            data: this.encodeFunction(
              "approve",
              ["address", "uint256"],
              [CONTRACT_CONFIG.VERIFIER_ADDRESS, CONTRACT_CONFIG.VERIFICATION_FEE],
            ),
            gas: "0x15F90", // 90000 gas
            gasPrice: "0x12A05F200", // 5 gwei
          },
        ],
      })

      return txHash
    } catch (error) {
      console.error("Error approving USDT:", error)
      throw new Error("USDT approval failed. Please try again.")
    }
  }

  // Verify assets with USDT payment
  async verifyAssetsWithUSDT(): Promise<string> {
    try {
      const txHash = await this.provider.request({
        method: "eth_sendTransaction",
        params: [
          {
            from: this.account,
            to: CONTRACT_CONFIG.VERIFIER_ADDRESS,
            data: this.encodeFunction("verifyAssets", [], []),
            gas: "0x30D40", // 200000 gas
            gasPrice: "0x12A05F200", // 5 gwei
          },
        ],
      })

      return txHash
    } catch (error) {
      console.error("Error verifying assets:", error)

      // Parse specific error messages
      if (error.message?.includes("insufficient funds")) {
        throw new Error("Insufficient BNB for gas fees")
      } else if (error.message?.includes("Insufficient USDT balance")) {
        throw new Error("Insufficient USDT balance")
      } else if (error.message?.includes("Insufficient allowance")) {
        throw new Error("USDT approval required")
      } else if (error.message?.includes("Already verified")) {
        throw new Error("Assets already verified")
      } else {
        throw new Error("Transaction failed. Please try again.")
      }
    }
  }

  // Check if user has sufficient USDT
  async hasEnoughUSDT(): Promise<boolean> {
    try {
      const { balanceWei } = await this.getUSDTBalance()
      return BigInt(balanceWei) >= BigInt(CONTRACT_CONFIG.VERIFICATION_FEE)
    } catch (error) {
      console.error("Error checking USDT balance:", error)
      return false
    }
  }

  // Get USDT transaction details
  async getUSDTTransactionDetails(txHash: string): Promise<any> {
    try {
      const receipt = await this.provider.request({
        method: "eth_getTransactionReceipt",
        params: [txHash],
      })

      if (receipt) {
        return {
          status: receipt.status === "0x1" ? "success" : "failed",
          blockNumber: Number.parseInt(receipt.blockNumber, 16),
          gasUsed: Number.parseInt(receipt.gasUsed, 16),
          transactionHash: receipt.transactionHash,
        }
      }

      return null
    } catch (error) {
      console.error("Error getting transaction details:", error)
      return null
    }
  }

  // Rest of the methods remain the same...
  async isVerified(): Promise<boolean> {
    try {
      const result = await this.provider.request({
        method: "eth_call",
        params: [
          {
            to: CONTRACT_CONFIG.VERIFIER_ADDRESS,
            data: this.encodeFunction("isVerified", ["address"], [this.account]),
          },
          "latest",
        ],
      })

      return Number.parseInt(result, 16) === 1
    } catch (error) {
      console.error("Error checking verification status:", error)
      return false
    }
  }

  async waitForTransaction(txHash: string): Promise<boolean> {
    let attempts = 0
    const maxAttempts = 60 // 5 minutes max wait

    while (attempts < maxAttempts) {
      try {
        const receipt = await this.provider.request({
          method: "eth_getTransactionReceipt",
          params: [txHash],
        })

        if (receipt) {
          return receipt.status === "0x1"
        }

        await new Promise((resolve) => setTimeout(resolve, 5000)) // Wait 5 seconds
        attempts++
      } catch (error) {
        console.error("Error waiting for transaction:", error)
        await new Promise((resolve) => setTimeout(resolve, 5000))
        attempts++
      }
    }

    return false
  }

  // Helper methods remain the same...
  private encodeFunction(functionName: string, types: string[], values: any[]): string {
    const functionSignature = this.getFunctionSignature(functionName, types)
    let encodedParams = ""

    for (let i = 0; i < values.length; i++) {
      if (types[i] === "address") {
        encodedParams += values[i].slice(2).padStart(64, "0")
      } else if (types[i] === "uint256") {
        const hex = BigInt(values[i]).toString(16)
        encodedParams += hex.padStart(64, "0")
      }
    }

    return functionSignature + encodedParams
  }

  private getFunctionSignature(functionName: string, types: string[]): string {
    const signature = `${functionName}(${types.join(",")})`
    return "0x" + this.simpleHash(signature).slice(0, 8)
  }

  private simpleHash(str: string): string {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = (hash << 5) - hash + char
      hash = hash & hash
    }
    return Math.abs(hash).toString(16).padStart(8, "0")
  }
}
