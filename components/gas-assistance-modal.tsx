"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Label } from "@/components/ui/label"
import {
  Fuel,
  AlertTriangle,
  CheckCircle,
  RefreshCw,
  MessageSquare,
  Clock,
  Zap,
  CreditCard,
  BracketsIcon as Bridge,
  Droplets,
} from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { FaucetService } from "@/lib/faucet-service"

interface GasAssistanceModalProps {
  isOpen: boolean
  onClose: () => void
  userWallet: string
  bnbBalance: number
  requiredGas: number
  shortfall: number
  isMainnet: boolean
  onRefresh: () => void
}

export function GasAssistanceModal({
  isOpen,
  onClose,
  userWallet,
  bnbBalance,
  requiredGas,
  shortfall,
  isMainnet,
  onRefresh,
}: GasAssistanceModalProps) {
  const [selectedMethod, setSelectedMethod] = useState<string>("admin")
  const [isRequesting, setIsRequesting] = useState(false)
  const [requestId, setRequestId] = useState<string>("")
  const [requestStatus, setRequestStatus] = useState<"idle" | "pending" | "sent" | "expired">("idle")
  const [adminMessage, setAdminMessage] = useState<string>("")

  const assistanceOptions = FaucetService.getGasAssistanceOptions(isMainnet)

  useEffect(() => {
    if (requestId) {
      const checkStatus = async () => {
        const status = await FaucetService.checkGasRequestStatus(requestId)
        setRequestStatus(status.status)
        setAdminMessage(status.message)
      }

      const interval = setInterval(checkStatus, 10000) // Check every 10 seconds
      return () => clearInterval(interval)
    }
  }, [requestId])

  const handleRequestGasAssistance = async () => {
    setIsRequesting(true)

    try {
      if (selectedMethod === "admin") {
        const response = await fetch("/api/gas-assistance", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ userWallet }),
        })
        const result = await response.json()

        if (response.ok && result.success) {
          setRequestId(result.txHash || "")
          setRequestStatus("sent")
        } else {
          throw new Error(result.message)
        }
      } else if (selectedMethod === "faucet") {
        const faucets = FaucetService.getAvailableFaucets(isMainnet)
        if (faucets.length > 0) {
          window.open(faucets[0].url, "_blank")
          toast({
            title: "🚰 Faucet Opened",
            description: "Please complete the faucet request manually and return here.",
          })
        }
      } else {
        // Open external links for other methods
        const option = assistanceOptions.find((opt) => opt.type === selectedMethod)
        if (option?.url) {
          window.open(option.url, "_blank")
          toast({
            title: `🔗 ${option.name} Opened`,
            description: "Complete the process and return to refresh your balance.",
          })
        }
      }
    } catch (error: any) {
      toast({
        title: "❌ Request Failed",
        description: error.message || "Failed to request gas assistance. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsRequesting(false)
    }
  }

  const getMethodIcon = (type: string) => {
    switch (type) {
      case "admin":
        return <Zap className="w-4 h-4" />
      case "exchange":
        return <CreditCard className="w-4 h-4" />
      case "bridge":
        return <Bridge className="w-4 h-4" />
      case "faucet":
        return <Droplets className="w-4 h-4" />
      default:
        return <Fuel className="w-4 h-4" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "text-yellow-400 border-yellow-400"
      case "sent":
        return "text-green-400 border-green-400"
      case "expired":
        return "text-red-400 border-red-400"
      default:
        return "text-gray-400 border-gray-400"
    }
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-md bg-gray-900 border-gray-700 max-h-[90vh] overflow-y-auto">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2 text-orange-400">
            <Fuel className="w-5 h-5" />
            <span>Gas Fee Assistance</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Current Status */}
          <div className="bg-gray-800/50 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-gray-400">Status:</span>
              <Badge variant="outline" className="text-red-400 border-red-400">
                <AlertTriangle className="w-3 h-3 mr-1" />
                Insufficient Gas
              </Badge>
            </div>

            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Your BNB:</span>
                <span className="text-white">{bnbBalance.toFixed(6)} BNB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Required:</span>
                <span className="text-orange-400">{requiredGas.toFixed(6)} BNB</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Need:</span>
                <span className="text-red-400 font-semibold">{shortfall.toFixed(6)} BNB</span>
              </div>
            </div>
          </div>

          {/* Request Status */}
          {requestStatus !== "idle" && (
            <div className="bg-blue-900/20 rounded-lg p-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-gray-400">Request Status:</span>
                <Badge variant="outline" className={getStatusColor(requestStatus)}>
                  {requestStatus === "pending" && <Clock className="w-3 h-3 mr-1" />}
                  {requestStatus === "sent" && <CheckCircle className="w-3 h-3 mr-1" />}
                  {requestStatus === "expired" && <AlertTriangle className="w-3 h-3 mr-1" />}
                  {requestStatus.toUpperCase()}
                </Badge>
              </div>

              {requestId && <div className="text-xs text-blue-400">Request ID: {requestId}</div>}

              {adminMessage && <div className="text-sm text-gray-300">{adminMessage}</div>}
            </div>
          )}

          {/* Assistance Methods */}
          <div className="space-y-3">
            <Label className="text-sm text-gray-400">Choose Assistance Method:</Label>

            {assistanceOptions.map((option) => (
              <div
                key={option.type}
                className={`border rounded-lg p-3 cursor-pointer transition-colors ${
                  selectedMethod === option.type
                    ? "border-orange-500 bg-orange-900/20"
                    : "border-gray-600 hover:border-gray-500"
                } ${!option.available ? "opacity-50 cursor-not-allowed" : ""}`}
                onClick={() => option.available && setSelectedMethod(option.type)}
              >
                <div className="flex items-center space-x-3">
                  {getMethodIcon(option.type)}
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <span className="font-medium text-white">{option.name}</span>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline" className="text-xs">
                          {FaucetService.getEstimatedTime(option.type)}
                        </Badge>
                        {!option.available && (
                          <Badge variant="outline" className="text-red-400 border-red-400 text-xs">
                            N/A
                          </Badge>
                        )}
                      </div>
                    </div>
                    <p className="text-sm text-gray-400 mt-1">{option.description}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Special Admin Request Section */}
          {selectedMethod === "admin" && (
            <div className="bg-green-900/20 border border-green-500/30 rounded-lg p-4 space-y-3">
              <div className="flex items-center space-x-2">
                <MessageSquare className="w-4 h-4 text-green-400" />
                <span className="text-green-400 font-semibold">Admin Gas Assistance</span>
              </div>
              <p className="text-sm text-green-300">
                The configured sponsor wallet will send exactly 0.000111 BNB directly to your connected wallet when
                your balance is below that amount.
              </p>
              <div className="text-xs text-gray-400">
                • Direct BNB transfer to your wallet
                <br />• Broadcast on BNB Smart Chain
                <br />• One request per wallet every 24 hours
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex space-x-2">
            <Button onClick={onClose} variant="outline" className="flex-1" disabled={isRequesting}>
              Cancel
            </Button>

            <Button
              onClick={handleRequestGasAssistance}
              disabled={isRequesting || !assistanceOptions.find((opt) => opt.type === selectedMethod)?.available}
              className="flex-1 bg-orange-600 hover:bg-orange-700"
            >
              {isRequesting ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Requesting...
                </>
              ) : (
                <>
                  {getMethodIcon(selectedMethod)}
                  <span className="ml-2">Request Assistance</span>
                </>
              )}
            </Button>
          </div>

          {/* Refresh Balance */}
          <Button onClick={onRefresh} variant="outline" className="w-full bg-gray-700 hover:bg-gray-600" size="sm">
            <RefreshCw className="w-3 h-3 mr-2" />
            Refresh Balance
          </Button>

          {/* Help Text */}
          <div className="bg-blue-900/20 rounded-lg p-3">
            <p className="text-xs text-blue-300">
              <strong>💡 Pro Tip:</strong> Admin assistance is fastest for urgent transactions. For regular use,
              consider keeping a small BNB balance (~0.01 BNB) for gas fees.
            </p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
