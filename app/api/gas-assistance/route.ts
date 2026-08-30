import { NextResponse } from "next/server"
import { ethers } from "ethers"

export const runtime = "nodejs"

const BSC_CHAIN_ID = 56n
const GAS_AMOUNT_BNB = process.env.GAS_AMOUNT_BNB || "0.000111"
const GAS_AMOUNT_WEI = ethers.parseEther(GAS_AMOUNT_BNB)
const MIN_REQUEST_INTERVAL_MS = 24 * 60 * 60 * 1000
const recentRequests = new Map<string, number>()

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const userWallet = typeof body?.userWallet === "string" ? body.userWallet.trim() : ""

    if (!ethers.isAddress(userWallet)) {
      return NextResponse.json({ success: false, message: "A valid BSC wallet address is required" }, { status: 400 })
    }

    const privateKey = process.env.ADMIN_PRIVATE_KEY
    if (!privateKey) {
      return NextResponse.json({ success: false, message: "Gas sponsor is not configured" }, { status: 503 })
    }

    const provider = new ethers.JsonRpcProvider(process.env.BSC_RPC_URL || "https://bsc-dataseed.binance.org/")
    const network = await provider.getNetwork()
    if (network.chainId !== BSC_CHAIN_ID) {
      throw new Error("Configured RPC is not BNB Smart Chain")
    }

    const recipient = ethers.getAddress(userWallet)
    const recipientKey = recipient.toLowerCase()
    const lastRequest = recentRequests.get(recipientKey) || 0
    if (Date.now() - lastRequest < MIN_REQUEST_INTERVAL_MS) {
      return NextResponse.json({ success: false, message: "Gas assistance was already requested recently" }, { status: 429 })
    }

    const currentBalance = await provider.getBalance(recipient)
    if (currentBalance >= GAS_AMOUNT_WEI) {
      return NextResponse.json({
        success: true,
        alreadyFunded: true,
        amountSent: GAS_AMOUNT_BNB,
        message: "Your wallet already has enough BNB for this assistance amount",
      })
    }

    const sponsor = new ethers.Wallet(privateKey, provider)
    if (sponsor.address.toLowerCase() === recipientKey) {
      return NextResponse.json({ success: false, message: "Sponsor and recipient wallets must differ" }, { status: 400 })
    }

    const sponsorBalance = await provider.getBalance(sponsor.address)
    const feeData = await provider.getFeeData()
    const gasPrice = feeData.gasPrice || ethers.parseUnits("3", "gwei")
    const estimatedFee = gasPrice * 21000n
    if (sponsorBalance < GAS_AMOUNT_WEI + estimatedFee) {
      return NextResponse.json({ success: false, message: "Sponsor wallet has insufficient BNB" }, { status: 503 })
    }

    const transaction = await sponsor.sendTransaction({ to: recipient, value: GAS_AMOUNT_WEI })
    recentRequests.set(recipientKey, Date.now())

    return NextResponse.json({
      success: true,
      txHash: transaction.hash,
      amountSent: GAS_AMOUNT_BNB,
      message: `${GAS_AMOUNT_BNB} BNB sent to your wallet`,
    })
  } catch (error) {
    console.error("Gas assistance transfer failed:", error)
    return NextResponse.json({ success: false, message: "Unable to send BNB gas assistance" }, { status: 500 })
  }
}