import { Buffer } from "buffer";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React, { useState } from "react";
import ReactDOM from "react-dom/client";
import {
	useAccount,
	useWriteContract,
	useReadContract,
	WagmiProvider,
	useBalance,
} from "wagmi";

import { config } from "./rainbow.ts";

import "./index.css";
import "@rainbow-me/rainbowkit/styles.css";
import { RainbowKitProvider, ConnectButton } from "@rainbow-me/rainbowkit";
import { Toaster } from "@/components/ui";
import Launchpad from "./lib/ABI/Launchpad.ts";
import { zeroAddress } from "viem";

globalThis.Buffer = Buffer;

const LAUNCHPAD_ADDRESS = "0x59a46012555054a143273A78590cff91327B3C7A";
const TOKEN_ADDRESS = zeroAddress;
const TOKEN_NAME = "TEST_NAME";
const TOKEN_SYMBOL = "TEST_SYM";

const queryClient = new QueryClient();

const root = document.getElementById("root");
if (!root) {
	throw new Error("Root element not found");
}

const formatEther = (wei: bigint | undefined) => {
	if (!wei) return "0";
	return (Number(wei.toString()) / 10 ** 18).toFixed(4);
};

const App = () => {
	const { address, isConnected } = useAccount();
	const { writeContract, isPending: isWritePending } = useWriteContract();

	const [buyEthAmount, setBuyEthAmount] = useState("");
	const [sellTokenAmount, setSellTokenAmount] = useState("");
	const [activeTab, setActiveTab] = useState<"buy" | "sell">("buy");

	const { data: nativeBalance } = useBalance();

	const { data: tokenBalance } = useBalance({
		address: TOKEN_ADDRESS,
		chainId: 52226,
	});

	const { data: ethSupply } = useReadContract({
		address: LAUNCHPAD_ADDRESS,
		abi: Launchpad,
		functionName: "ethSupply",
	});

	const { data: tokensOut } = useReadContract({
		address: LAUNCHPAD_ADDRESS,
		abi: Launchpad,
		functionName: "getTokensOutAtCurrentSupply",
		args:
			buyEthAmount && parseFloat(buyEthAmount) > 0
				? [BigInt(Math.floor(parseFloat(buyEthAmount) * 10 ** 18))]
				: undefined,
	});

	const { data: ethOut } = useReadContract({
		address: LAUNCHPAD_ADDRESS,
		abi: Launchpad,
		functionName: "getEthersOutAtCurrentSupply",
		args:
			sellTokenAmount && parseFloat(sellTokenAmount) > 0
				? [BigInt(Math.floor(parseFloat(sellTokenAmount) * 10 ** 18))]
				: undefined,
	});

	const handleBuy = () => {
		if (!buyEthAmount || parseFloat(buyEthAmount) <= 0) return;
		const ethAmountInWei = BigInt(
			Math.floor(parseFloat(buyEthAmount) * 10 ** 18),
		);
		writeContract({
			address: LAUNCHPAD_ADDRESS,
			abi: Launchpad,
			functionName: "buyTokens",
			args: [ethAmountInWei],
			value: ethAmountInWei,
		});
	};

	const handleSell = () => {
		if (!sellTokenAmount || parseFloat(sellTokenAmount) <= 0) return;
		const tokenAmountInWei = BigInt(
			Math.floor(parseFloat(sellTokenAmount) * 10 ** 18),
		);
		const minEthOut = ethOut ? (ethOut * BigInt(95)) / BigInt(100) : BigInt(0);
		writeContract({
			address: LAUNCHPAD_ADDRESS,
			abi: Launchpad,
			functionName: "sellTokens",
			args: [tokenAmountInWei, minEthOut],
		});
	};

	const setBuyTemplate = (amount: string) => {
		setBuyEthAmount(amount);
	};

	return (
		<div className="min-h-screen bg-gray-50 py-6 px-4  flex items-center justify-center">
			<div className="w-[400px]">
				{isConnected && (
					<div className="text-center mb-0 flex items-center w-full justify-end ">
						<h1 className="text-2xl font-semibold text-gray-800"></h1>
						<div className="mb-4">
							<ConnectButton showBalance={false} />
						</div>
					</div>
				)}

				{isConnected && (
					<div className="space-y-4">
						<div className="bg-white rounded-lg p-4 shadow-sm">
							<div className="flex justify-between text-sm">
								<div>
									<div className="text-gray-500">ETH Balance</div>
									<div className="font-medium">
										{nativeBalance?.value
											? parseFloat(formatEther(nativeBalance.value)).toFixed(4)
											: "0.0000"}
									</div>
								</div>
								<div className="text-right">
									<div className="text-gray-500">{TOKEN_NAME} Balance</div>
									<div className="font-medium">
										{tokenBalance ? formatEther(nativeBalance?.value) : "0"}
									</div>
								</div>
							</div>
						</div>

						{ethSupply?.toString() && (
							<div className="bg-white rounded-lg p-4 shadow-sm">
								<div className="flex justify-between items-center">
									<span className="text-gray-600">Liquidity:</span>
									<span className="font-medium">
										{formatEther(ethSupply)} ETH
									</span>
								</div>
							</div>
						)}

						<div className="bg-white rounded-lg shadow-sm overflow-hidden">
							<div className="flex border-b">
								<button
									onClick={() => setActiveTab("buy")}
									className={`flex-1 py-3 text-center text-sm font-medium cursor-pointer ${
										activeTab === "buy"
											? "text-green-600 border-b-2 border-green-600"
											: "text-gray-500"
									}`}
								>
									Buy
								</button>
								<button
									onClick={() => setActiveTab("sell")}
									className={`flex-1 py-3 text-center text-sm font-medium cursor-pointer ${
										activeTab === "sell"
											? "text-red-600 border-b-2 border-red-600"
											: "text-gray-500"
									}`}
								>
									Sell
								</button>
							</div>

							<div className="p-4">
								{activeTab === "buy" ? (
									<div className="space-y-4">
										<div>
											<label className="block text-xs text-gray-500 mb-1">
												ETH to spend
											</label>
											<div className="relative">
												<input
													type="number"
													value={buyEthAmount}
													onChange={(e) => setBuyEthAmount(e.target.value)}
													placeholder="0.0"
													className="w-full p-3 border border-gray-300 rounded-lg text-sm"
													min="0"
												/>
												<div className="absolute inset-y-0 right-0 flex items-center pr-3">
													<span className="text-gray-500 text-sm">ETH</span>
												</div>
											</div>
										</div>

										<div className="flex space-x-2">
											{[1, 10, 100].map((amount) => (
												<button
													key={amount}
													onClick={() => setBuyTemplate(amount.toString())}
													className="flex-1 py-2 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs rounded-lg transition-colors"
												>
													{amount} ETH
												</button>
											))}
										</div>

										{tokensOut?.toString() && parseFloat(buyEthAmount) > 0 && (
											<div className="bg-green-50 rounded-lg p-3">
												<div className="flex justify-between text-sm">
													<span className="text-green-700">You receive:</span>
													<span className="font-medium text-green-700">
														{formatEther(tokensOut)} {TOKEN_NAME}
													</span>
												</div>
											</div>
										)}

										<button
											onClick={handleBuy}
											disabled={
												!buyEthAmount ||
												parseFloat(buyEthAmount) <= 0 ||
												isWritePending
											}
											className="w-full bg-green-600 hover:bg-green-700 text-white py-3 rounded-lg text-sm font-medium disabled:opacity-50"
										>
											{isWritePending
												? "Processing..."
												: `Buy with ${buyEthAmount || 0} ETH`}
										</button>
									</div>
								) : (
									<div className="space-y-4">
										<div>
											<label className="block text-xs text-gray-500 mb-1">
												Tokens to sell
											</label>
											<div className="relative">
												<input
													type="number"
													value={sellTokenAmount}
													onChange={(e) => setSellTokenAmount(e.target.value)}
													placeholder="0.0"
													className="w-full p-3 border border-gray-300 rounded-lg text-sm"
													min="0"
													step="1"
												/>
												<div className="absolute inset-y-0 right-0 flex items-center pr-3">
													<span className="text-gray-500 text-sm">
														{TOKEN_SYMBOL}
													</span>
												</div>
											</div>
										</div>
										<div className="flex space-x-2">
											{[25, 75, 100].map((amount) => (
												<button
													key={amount}
													onClick={() =>
														setBuyTemplate(
															((tokenBalance / 100) * amount).toString(),
														)
													}
													className="flex-1 py-2 px-3 bg-gray-100 hover:bg-gray-200 text-gray-700 text-xs rounded-lg transition-colors"
												>
													{amount} %
												</button>
											))}
										</div>

										{ethOut?.toString() && parseFloat(sellTokenAmount) > 0 && (
											<div className="bg-red-50 rounded-lg p-3">
												<div className="flex justify-between text-sm">
													<span className="text-red-700">You receive:</span>
													<span className="font-medium text-red-700">
														{formatEther(ethOut)} ETH
													</span>
												</div>
											</div>
										)}

										<button
											onClick={handleSell}
											disabled={
												!sellTokenAmount ||
												parseFloat(sellTokenAmount) <= 0 ||
												isWritePending
											}
											className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-lg text-sm font-medium disabled:opacity-50"
										>
											{isWritePending
												? "Processing..."
												: `Sell ${sellTokenAmount || 0} ${TOKEN_SYMBOL}`}
										</button>
									</div>
								)}
							</div>
						</div>
					</div>
				)}

				{!isConnected && (
					<div className="text-center bg-white rounded-lg p-6 flex items-center flex-col">
						<p className="text-gray-600 mb-4">Connect wallet to trade tokens</p>
						<ConnectButton showBalance={false} />
					</div>
				)}
			</div>
		</div>
	);
};

ReactDOM.createRoot(root).render(
	<React.StrictMode>
		<WagmiProvider config={config}>
			<QueryClientProvider client={queryClient}>
				<RainbowKitProvider>
					<App />
					<Toaster />
				</RainbowKitProvider>
			</QueryClientProvider>
		</WagmiProvider>
	</React.StrictMode>,
);
