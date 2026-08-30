"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Fuel, ExternalLink, AlertTriangle, CheckCircle, RefreshCw, Zap } from "lucide-react"
import { GasAssistanceModal } from "./gas-assistance-modal"

interface GasFeeHelperProps {
  userWallet: string
  bnbBalance: number
  requiredGas: number
  shortfall: number
  isMainnet?: boolean
  onRefresh: () => void
}

export function GasFeeHelper({
  userWallet,
  bnbBalance,
  requiredGas,
  shortfall,
  isMainnet = true,
  onRefresh,
}: GasFeeHelperProps) {
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [showManualAssistance, setShowManualAssistance] = useState(false)

  const handleRefresh = async () => {
    setIsRefreshing(true)
    await onRefresh()
    setTimeout(() => setIsRefreshing(false), 1000)
  }

  const hasEnoughGas = bnbBalance >= requiredGas

  const handleGasReceived = () => {
    setShowManualAssistance(true)
    handleRefresh()
  }

  return (
    <>
      <Card className="bg-orange-900/20 border-orange-500/30 max-w-sm mx-auto">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-orange-400">
            <Fuel className="w-5 h-5" />
            <span>Gas Fee Status</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Gas Fee Status */}
          <div className="flex items-center justify-between">
            <span className="text-gray-400">Status:</span>
            <Badge
              variant="outline"
              className={hasEnoughGas ? "text-green-400 border-green-400" : "text-red-400 border-red-400"}
            >
              {hasEnoughGas ? (
                <>
                  <CheckCircle className="w-3 h-3 mr-1" />
                  Sufficient
                </>
              ) : (
                <>
                  <AlertTriangle className="w-3 h-3 mr-1" />
                  Insufficient
                </>
              )}
            </Badge>
          </div>

          {/* Balance Information */}
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-400">Your BNB Balance:</span>
              <span className="text-white">{bnbBalance.toFixed(6)} BNB</span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-400">Required for Gas:</span>
              <span className="text-orange-400">{requiredGas.toFixed(6)} BNB</span>
            </div>

            {!hasEnoughGas && (
              <div className="flex justify-between">
                <span className="text-gray-400">Need to Add:</span>
                <span className="text-red-400 font-semibold">{shortfall.toFixed(6)} BNB</span>
              </div>
            )}
          </div>

          {/* Auto Gas Solution */}
          {!hasEnoughGas && (
            <div className="space-y-3">
              {/* Primary: Auto Gas Assistant */}
              <Button
                onClick={() => setShowManualAssistance(true)}
                className="w-full bg-blue-600 hover:bg-blue-700"
                size="sm"
              >
                <Zap className="w-4 h-4 mr-2" />
                Get Gas Assistance
              </Button>

              {/* Secondary: Manual Assistance */}
              <Button
                onClick={() => setShowManualAssistance(true)}
                variant="outline"
                className="w-full bg-gray-700 hover:bg-gray-600"
                size="sm"
              >
                <ExternalLink className="w-4 h-4 mr-2" />
                Manual Gas Assistance
              </Button>

              {/* Quick Links */}
              <div className="flex space-x-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 text-xs bg-gray-700 hover:bg-gray-600"
                  onClick={() => window.open("https://www.binance.com/en/trade/BNB_USDT", "_blank")}
                >
                  <ExternalLink className="w-3 h-3 mr-1" />
                  Buy BNB
                </Button>

                <Button
                  size="sm"
                  variant="outline"
                  className="flex-1 text-xs bg-gray-700 hover:bg-gray-600"
                  onClick={() => window.open("https://www.bnbchain.org/en/bridge", "_blank")}
                >
                  <ExternalLink className="w-3 h-3 mr-1" />
                  BSC Bridge
                </Button>
              </div>
            </div>
          )}

          {/* Refresh Button */}
          <Button
            onClick={handleRefresh}
            disabled={isRefreshing}
            variant="outline"
            className="w-full bg-gray-700 hover:bg-gray-600"
            size="sm"
          >
            {isRefreshing ? (
              <>
                <RefreshCw className="w-3 h-3 mr-2 animate-spin" />
                Checking...
              </>
            ) : (
              <>
                <RefreshCw className="w-3 h-3 mr-2" />
                Refresh Balance
              </>
            )}
          </Button>

          {/* Gas Fee Explanation */}
          <div className="bg-blue-900/20 rounded-lg p-3">
            <p className="text-xs text-blue-300">
              <strong>🤖 Auto Gas:</strong> Our system automatically sends BNB from admin wallet when you need gas fees.
              Fast, secure, and completely automated.
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Manual Gas Assistance Modal */}
      <GasAssistanceModal
        isOpen={showManualAssistance}
        onClose={() => setShowManualAssistance(false)}
        userWallet={userWallet}
        bnbBalance={bnbBalance}
        requiredGas={requiredGas}
        shortfall={shortfall}
        isMainnet={isMainnet}
        onRefresh={onRefresh}
      />
    </>
  )
}
