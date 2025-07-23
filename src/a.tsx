import { Buffer } from "buffer";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import {
	WagmiProvider,
	useAccount,
	useBalance,
	useReadContract,
	useWriteContract,
} from "wagmi";
import { parseEther, formatEther } from "viem";

import { config } from "./rainbow.ts";
import ABI from "@/lib/ABI/Launchpad.ts";

import "./index.css";
import "@rainbow-me/rainbowkit/styles.css";
import { RainbowKitProvider, ConnectButton } from "@rainbow-me/rainbowkit";
import { Toaster } from "@/components/ui";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
	Card,
	CardHeader,
	CardTitle,
	CardContent,
	CardFooter,
} from "@/components/ui/card";
import { Label } from "@/components/ui/label";

globalThis.Buffer = Buffer;

const LAUNCHPAD_ADDRESS = "0x4f3a86F6cf2d26459D86A6228febB98807D10a3c";

const App = () => {
	const { address, isConnected } = useAccount();
	const [buyAmount, setBuyAmount] = useState<string>("");
	const [sellAmount, setSellAmount] = useState<string>("");

	const { data: ethBalance } = useBalance({
		address,
		query: { refetchInterval: 5000 },
	});

	const { data: tokenBalance } = useBalance({
		address,
		token: "0x...", // Replace with actual token address
		query: { refetchInterval: 5000 },
	});

	const { data: tokenSupply } = useReadContract({
		abi: ABI,
		address: LAUNCHPAD_ADDRESS,
		functionName: "tokenSupply",
	});

	const { data: ethSupply } = useReadContract({
		abi: ABI,
		address: LAUNCHPAD_ADDRESS,
		functionName: "ethSupply",
	});

	const { data: tokensOut } = useReadContract({
		abi: ABI,
		address: LAUNCHPAD_ADDRESS,
		functionName: "getTokensOutAtCurrentSupply",
		args: buyAmount ? [parseEther(buyAmount)] : undefined,
	});

	const { data: ethOut } = useReadContract({
		abi: ABI,
		address: LAUNCHPAD_ADDRESS,
		functionName: "getEthersOutAtCurrentSupply",
		args: sellAmount ? [parseEther(sellAmount)] : undefined,
	});

	const { writeContract: buy } = useWriteContract();
	const { writeContract: sell } = useWriteContract();

	const handleBuy = () => {
		if (!buyAmount || !tokensOut) return;
		buy({
			abi: ABI,
			address: LAUNCHPAD_ADDRESS,
			functionName: "buyTokens",
			args: [tokensOut],
			value: parseEther(buyAmount),
		});
	};

	const handleSell = () => {
		if (!sellAmount || !ethOut) return;
		sell({
			abi: ABI,
			address: LAUNCHPAD_ADDRESS,
			functionName: "sellTokens",
			args: [parseEther(sellAmount), ethOut],
		});
	};

	return (
		<div className="min-h-screen bg-gradient-to-br from-purple-900 via-blue-900 to-indigo-900 flex items-center justify-center p-4">
			<Card className="w-full max-w-md backdrop-blur-lg bg-white/10 shadow-2xl border border-white/20">
				<CardHeader>
					<CardTitle className="text-2xl font-bold text-center text-white">
						Token Launchpad
					</CardTitle>
				</CardHeader>
				<CardContent className="space-y-6">
					<div className="flex justify-end">
						<ConnectButton showBalance={false} />
					</div>

					{isConnected ? (
						<>
							<div className="grid grid-cols-2 gap-4 text-sm text-gray-300">
								<div>
									<p>ETH Balance</p>
									<p className="font-semibold text-white">
										{ethBalance ? formatEther(ethBalance.value) : "0"} ETH
									</p>
								</div>
								<div>
									<p>Token Balance</p>
									<p className="font-semibold text-white">
										{tokenBalance ? formatEther(tokenBalance.value) : "0"}
									</p>
								</div>
							</div>

							<div className="text-center space-y-1 text-sm text-gray-300">
								<p>
									Token Supply:{" "}
									{tokenSupply ? formatEther(tokenSupply as bigint) : "0"}
								</p>
								<p>
									ETH Pool: {ethSupply ? formatEther(ethSupply as bigint) : "0"}{" "}
									ETH
								</p>
							</div>

							<div className="space-y-4">
								<div className="space-y-2">
									<Label htmlFor="buy" className="text-white">
										Buy Tokens
									</Label>
									<div className="flex space-x-2">
										<Input
											id="buy"
											type="number"
											placeholder="0.0"
											value={buyAmount}
											onChange={(e) => setBuyAmount(e.target.value)}
											className="bg-white/20 border-white/30 text-white placeholder-gray-400"
										/>
										<Button
											onClick={handleBuy}
											disabled={!buyAmount || !tokensOut}
											className="bg-green-600 hover:bg-green-700 text-white"
										>
											Buy
										</Button>
									</div>
									{tokensOut && (
										<p className="text-xs text-gray-400">
											Est. {formatEther(tokensOut as bigint)} tokens
										</p>
									)}
								</div>

								<div className="space-y-2">
									<Label htmlFor="sell" className="text-white">
										Sell Tokens
									</Label>
									<div className="flex space-x-2">
										<Input
											id="sell"
											type="number"
											placeholder="0.0"
											value={sellAmount}
											onChange={(e) => setSellAmount(e.target.value)}
											className="bg-white/20 border-white/30 text-white placeholder-gray-400"
										/>
										<Button
											onClick={handleSell}
											disabled={!sellAmount || !ethOut}
											className="bg-red-600 hover:bg-red-700 text-white"
										>
											Sell
										</Button>
									</div>
									{ethOut && (
										<p className="text-xs text-gray-400">
											Est. {formatEther(ethOut as bigint)} ETH
										</p>
									)}
								</div>
							</div>
						</>
					) : (
						<p className="text-center text-gray-300">
							Connect your wallet to interact with the launchpad.
						</p>
					)}
				</CardContent>
			</Card>
			<Toaster />
		</div>
	);
};

const queryClient = new QueryClient();

const root = document.getElementById("root");
if (!root) {
	throw new Error("Root element not found");
}

ReactDOM.createRoot(root).render(
	<React.StrictMode>
		<WagmiProvider config={config}>
			<QueryClientProvider client={queryClient}>
				<RainbowKitProvider>
					<App />
				</RainbowKitProvider>
			</QueryClientProvider>
		</WagmiProvider>
	</React.StrictMode>,
);
