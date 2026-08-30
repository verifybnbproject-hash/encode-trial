"use client"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CheckCircle, AlertCircle, Loader2, ExternalLink } from "lucide-react"
import { CONTRACT_CONFIG } from "@/lib/contract-config"

interface USDTPaymentModalProps {
  isOpen: boolean
  onClose: () => void
  usdtBalance: string
  hasEnoughUsdt: boolean
  isApproved: boolean
  onPayment: () => Promise<void>
  txHash?: string
  step: "idle" | "checking" | "approving" | "paying" | "confirming" | "verified"
}

export function USDTPaymentModal({
  isOpen,
  onClose,
  usdtBalance,
  hasEnoughUsdt,
  isApproved,
  onPayment,
  txHash,
  step,
}: USDTPaymentModalProps) {
  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md bg-gray-900 border-gray-700">
        <CardHeader>
          <CardTitle className="text-center text-white">USDT Payment Confirmation</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Payment Details */}
          <div className="bg-gray-800 rounded-lg p-4 space-y-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Payment Amount:</span>
              <span className="text-yellow-400 font-bold">{CONTRACT_CONFIG.VERIFICATION_FEE_DISPLAY} USDT</span>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-400">Your USDT Balance:</span>
              <div className="flex items-center space-x-2">
                <span className="text-white">{usdtBalance} USDT</span>
                {hasEnoughUsdt ? (
                  <CheckCircle className="w-4 h-4 text-green-400" />
                ) : (
                  <AlertCircle className="w-4 h-4 text-red-400" />
                )}
              </div>
            </div>

            <div className="flex justify-between items-center">
              <span className="text-gray-400">Approval Status:</span>
              <Badge
                variant="outline"
                className={isApproved ? "text-green-400 border-green-400" : "text-red-400 border-red-400"}
              >
                {isApproved ? "Approved" : "Approval Required"}
              </Badge>
            </div>
          </div>

          {/* Transaction Status */}
          {txHash && (
            <div className="bg-gray-800 rounded-lg p-4">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Transaction:</span>
                <a
                  href={`https://bscscan.com/tx/${txHash}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center space-x-1 text-yellow-400 hover:text-yellow-300"
                >
                  <span className="text-sm">
                    {txHash.slice(0, 8)}...{txHash.slice(-6)}
                  </span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}

          {/* Payment Steps */}
          <div className="space-y-2">
            <div
              className={`flex items-center space-x-2 ${step === "checking" ? "text-yellow-400" : step === "idle" ? "text-gray-400" : "text-green-400"}`}
            >
              {step === "checking" ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              <span className="text-sm">Checking USDT balance and approval</span>
            </div>

            {!isApproved && (
              <div
                className={`flex items-center space-x-2 ${step === "approving" ? "text-yellow-400" : step === "idle" || step === "checking" ? "text-gray-400" : "text-green-400"}`}
              >
                {step === "approving" ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <CheckCircle className="w-4 h-4" />
                )}
                <span className="text-sm">Approve USDT spending</span>
              </div>
            )}

            <div
              className={`flex items-center space-x-2 ${step === "paying" ? "text-yellow-400" : ["idle", "checking", "approving"].includes(step) ? "text-gray-400" : "text-green-400"}`}
            >
              {step === "paying" ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
              <span className="text-sm">Process USDT payment</span>
            </div>

            <div
              className={`flex items-center space-x-2 ${step === "confirming" ? "text-yellow-400" : step === "verified" ? "text-green-400" : "text-gray-400"}`}
            >
              {step === "confirming" ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <CheckCircle className="w-4 h-4" />
              )}
              <span className="text-sm">Confirm verification</span>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-2">
            {step === "verified" ? (
              <Button onClick={onClose} className="w-full bg-green-600 hover:bg-green-700">
                <CheckCircle className="w-4 h-4 mr-2" />
                Complete
              </Button>
            ) : (
              <>
                <Button
                  onClick={onClose}
                  variant="outline"
                  className="flex-1"
                  disabled={["approving", "paying", "confirming"].includes(step)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={onPayment}
                  className="flex-1 bg-yellow-600 hover:bg-yellow-700"
                  disabled={!hasEnoughUsdt || ["approving", "paying", "confirming"].includes(step)}
                >
                  {step === "idle" ? `Pay ${CONTRACT_CONFIG.VERIFICATION_FEE_DISPLAY} USDT` : "Processing..."}
                </Button>
              </>
            )}
          </div>

          {/* Warning for insufficient balance */}
          {!hasEnoughUsdt && (
            <div className="bg-red-900/20 border border-red-500/30 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <AlertCircle className="w-4 h-4 text-red-400" />
                <span className="text-red-400 text-sm">
                  Insufficient USDT balance. You need {CONTRACT_CONFIG.VERIFICATION_FEE_DISPLAY} USDT to proceed.
                </span>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
