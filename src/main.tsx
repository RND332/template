import { Buffer } from "buffer";
import {
	QueryClient,
	QueryClientProvider,
	useQuery,
} from "@tanstack/react-query";
import React, { useEffect, useRef, useState } from "react";
import ReactDOM from "react-dom/client";
import {
	useAccount,
	useWriteContract,
	useReadContract,
	WagmiProvider,
} from "wagmi";
import {
	ColorType,
	createChart,
	IChartApi,
	type ISeriesApi,
	type LineData,
	LineSeries,
	type Time,
} from "lightweight-charts";

import { config } from "./rainbow.ts";
import "@rainbow-me/rainbowkit/styles.css";
import { RainbowKitProvider, ConnectButton } from "@rainbow-me/rainbowkit";
import Launchpad from "./lib/ABI/Launchpad.ts";
import { Address, formatEther, maxUint256, zeroAddress } from "viem";
import ERC20 from "./lib/ABI/ERC20.ts";
import BigNumber from "bignumber.js";
import { shorten } from "./lib/utils";
import { request } from "graphql-request";

import "./tailwind.css";

import {
	GET_LAUNCHPAD_QUERY,
	GET_TRANSFERS,
	LAUNCHPAD_GQL_ENDPOINT,
	LaunchpadDataById,
	TransfersData,
} from "./launchpad-gql.ts";

globalThis.Buffer = Buffer;

const LAUNCHPAD_ADDRESS = "0x4f3a86F6cf2d26459D86A6228febB98807D10a3c";

const rootElement = document.getElementById("root");

if (!rootElement) {
	throw new Error("");
}

const queryClient = new QueryClient();

const Header = () => {
	return (
		<div className="text-center mb-0 flex items-center w-full justify-end p-4">
			<ConnectButton
				chainStatus={"none"}
				showBalance={true}
				accountStatus={{
					smallScreen: "avatar",
					largeScreen: "full",
				}}
			/>
		</div>
	);
};

const BalanceCard = ({
	name,
	ethSupply,
	launchpadAddress,
}: {
	name: string;
	ethSupply: string;
	launchpadAddress: string;
}) => {
	const { address, isConnected } = useAccount();
	const { chain } = useAccount();
	const nativeSymbol = chain?.nativeCurrency?.symbol || "ETH";

	const { data: tokenAddress } = useReadContract({
		address: launchpadAddress as Address,
		abi: Launchpad,
		functionName: "token",
	});

	const { data: tokenBalance } = useReadContract({
		address: (tokenAddress as `0x${string}`) || zeroAddress,
		abi: ERC20,
		functionName: "balanceOf",
		args: address ? [address] : undefined,
	});

	return (
		<div className="bg-white rounded-lg p-4 shadow-sm ">
			<div className="flex gap-2 items-center text-gray-500">
				<span className="">Liquidity:</span>
				<span className="font-medium">
					{shorten(BigNumber(formatEther(BigInt(ethSupply))))} {nativeSymbol}
				</span>
			</div>

			<div className="flex justify-between text-sm">
				<div className="flex items-center gap-2 text-gray-500">
					<div className="text-gray-500">Your balance: </div>
					<div className="font-medium">
						{isConnected && tokenBalance !== undefined
							? shorten(BigNumber(formatEther(tokenBalance)))
							: "0"}
					</div>
				</div>
			</div>
		</div>
	);
};

const BuyForm = ({
	isConnected,
	isWritePending,
	onBuy,
	tokenName,
	launchpadAddress,
}: {
	isConnected: boolean;
	isWritePending: boolean;
	onBuy: (amount: string) => void;
	tokenName: string;
	launchpadAddress: string;
}) => {
	const { chain } = useAccount();
	const nativeSymbol = chain?.nativeCurrency?.symbol || "ETH";

	const [buyEthAmount, setBuyEthAmount] = useState("");

	const { data: tokensOut } = useReadContract({
		address: launchpadAddress as Address,
		abi: Launchpad,
		functionName: "getTokensOutAtCurrentSupply",
		args:
			buyEthAmount && parseFloat(buyEthAmount) > 0
				? [BigInt(Math.floor(parseFloat(buyEthAmount) * 10 ** 18))]
				: undefined,
	});

	const setBuyTemplate = (amount: string) => {
		setBuyEthAmount(amount);
	};

	const handleBuyClick = () => {
		if (!buyEthAmount || parseFloat(buyEthAmount) <= 0) return;
		onBuy(buyEthAmount);
	};

	return (
		<div className="space-y-4">
			<div>
				<label className="block text-xs text-gray-500 mb-1">
					{nativeSymbol} to spend
				</label>
				<div className="relative">
					<input
						type="number"
						value={buyEthAmount}
						onChange={(e) => setBuyEthAmount(e.target.value)}
						placeholder="0.0"
						className="w-full p-3 border border-gray-300 rounded-lg text-sm"
						min="0"
						disabled={isWritePending}
					/>
					<div className="absolute inset-y-0 right-0 flex items-center pr-3">
						<span className="text-gray-500 text-sm">{nativeSymbol}</span>
					</div>
				</div>
			</div>
			<div className="flex space-x-2">
				{[1, 10, 100].map((amount) => (
					<button
						key={amount}
						onClick={() => setBuyTemplate(amount.toString())}
						disabled={isWritePending}
						className="flex-1 py-2 px-3 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 text-xs rounded-lg transition-colors"
					>
						{amount} {nativeSymbol}
					</button>
				))}
			</div>
			{tokensOut?.toString() && parseFloat(buyEthAmount) > 0 && (
				<div className="bg-green-50 rounded-lg p-3">
					<div className="flex justify-between text-sm">
						<span className="text-green-700">You receive:</span>
						<span className="font-medium text-green-700">
							{shorten(BigNumber(formatEther(tokensOut)))} {tokenName}
						</span>
					</div>
				</div>
			)}
			<button
				onClick={handleBuyClick}
				disabled={
					!isConnected ||
					!buyEthAmount ||
					parseFloat(buyEthAmount) <= 0 ||
					isWritePending
				}
				className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-lg text-sm font-medium"
			>
				{isWritePending
					? "Processing..."
					: isConnected
						? `Buy with ${shorten(BigNumber(buyEthAmount || 0))} ${nativeSymbol}`
						: "Connect Wallet to Buy"}
			</button>
		</div>
	);
};

const SellForm = ({
	isConnected,
	isWritePending,
	onSell,
	symbol,
	launchpadAddress,
}: {
	isConnected: boolean;
	isWritePending: boolean;
	onSell: (amount: string, estimatedEthOut: bigint) => void;
	symbol: string;
	launchpadAddress: string;
}) => {
	const { address, chain } = useAccount();
	const nativeSymbol = chain?.nativeCurrency?.symbol || "ETH";
	const [sellTokenAmount, setSellTokenAmount] = useState("");

	const { data: tokenAddress } = useReadContract({
		address: launchpadAddress as Address,
		abi: Launchpad,
		functionName: "token",
	});

	const { data: tokenBalance } = useReadContract({
		address: (tokenAddress as `0x${string}`) || zeroAddress,
		abi: ERC20,
		functionName: "balanceOf",
		args: address ? [address] : undefined,
	});

	const { data: ethOut } = useReadContract({
		address: launchpadAddress as Address,
		abi: Launchpad,
		functionName: "getEthersOutAtCurrentSupply",
		args:
			sellTokenAmount && parseFloat(sellTokenAmount) > 0
				? [BigInt(Math.floor(parseFloat(sellTokenAmount) * 10 ** 18))]
				: undefined,
	});

	const setSellPercentage = (percentage: number) => {
		if (!tokenBalance) return;
		try {
			const balanceInEther = parseFloat(formatEther(tokenBalance));
			const amount = (balanceInEther * percentage) / 100;
			setSellTokenAmount(amount.toString());
		} catch (error) {
			console.error("Error calculating percentage:", error);
			setSellTokenAmount("0");
		}
	};

	const handleSellClick = () => {
		if (!sellTokenAmount || parseFloat(sellTokenAmount) <= 0 || !ethOut) return;

		onSell(sellTokenAmount, ethOut);
	};
	return (
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
						disabled={isWritePending}
					/>
					<div className="absolute inset-y-0 right-0 flex items-center pr-3">
						<span className="text-gray-500 text-sm">{symbol}</span>
					</div>
				</div>
			</div>
			<div className="flex space-x-2">
				{[25, 50, 75, 100].map((percent) => (
					<button
						key={percent}
						onClick={() => setSellPercentage(percent)}
						disabled={isWritePending}
						className="flex-1 py-2 px-3 bg-gray-100 hover:bg-gray-200 disabled:opacity-50 disabled:cursor-not-allowed text-gray-700 text-xs rounded-lg transition-colors"
					>
						{percent} %
					</button>
				))}
			</div>
			{ethOut?.toString() && parseFloat(sellTokenAmount) > 0 && (
				<div className="bg-red-50 rounded-lg p-3">
					<div className="flex justify-between text-sm">
						<span className="text-red-700">You receive:</span>
						<span className="font-medium text-red-700">
							{shorten(BigNumber(formatEther(ethOut)))} {nativeSymbol}
						</span>
					</div>
				</div>
			)}
			<button
				onClick={handleSellClick}
				disabled={
					!isConnected ||
					!sellTokenAmount ||
					parseFloat(sellTokenAmount) <= 0 ||
					isWritePending
				}
				className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white py-3 rounded-lg text-sm font-medium"
			>
				{isWritePending
					? "Processing..."
					: isConnected
						? `Sell ${shorten(BigNumber(sellTokenAmount || 0))} ${symbol}`
						: "Connect Wallet to Sell"}
			</button>
		</div>
	);
};

const TradePanel = ({
	name,
	symbol,
	launchpadAddress,
	tokenAddress,
}: {
	name: string;
	symbol: string;
	launchpadAddress: string;
	tokenAddress: string;
}) => {
	const { isConnected } = useAccount();
	const [activeTab, setActiveTab] = useState<"buy" | "sell">("buy");
	const [slippage, setSlippage] = useState("0.5");
	const { address } = useAccount();

	const {
		writeContract,
		writeContractAsync,
		isPending: isWritePending,
	} = useWriteContract();

	const handleBuy = (ethAmount: string) => {
		const ethAmountInWei = BigInt(Math.floor(parseFloat(ethAmount) * 1e18));

		const slippagePercent = parseFloat(slippage) || 0;

		const amountOutMin = BigInt(
			Math.floor(
				BigNumber(ethAmountInWei)
					.multipliedBy(1 - slippagePercent / 100)
					.toNumber(),
			),
		);

		writeContract({
			address: launchpadAddress as Address,
			abi: Launchpad,
			functionName: "buyTokens",
			args: [amountOutMin],
			value: ethAmountInWei,
		});
	};

	const { data: allowance } = useReadContract({
		abi: ERC20,
		address: tokenAddress as Address,
		functionName: "allowance",
		args: [address as Address, launchpadAddress as Address],
		chainId: 52226,
	});

	const handleSell = async (amount: string, estimatedEthOut: bigint) => {
		if (!amount || parseFloat(amount) <= 0) return;

		const tokenAmountInWei = BigInt(Math.floor(parseFloat(amount) * 1e18));
		const slippagePercent = parseFloat(slippage) || 0;

		const minEthOut =
			(estimatedEthOut *
				BigInt(Math.floor((1 - slippagePercent / 100) * 1000))) /
			1000n;

		if (allowance === 0n) {
			await writeContractAsync({
				abi: ERC20,
				address: tokenAddress as Address,
				functionName: "approve",
				args: [launchpadAddress as Address, maxUint256],
				chainId: 52226,
			});
		}

		await writeContractAsync({
			address: launchpadAddress as Address,
			abi: Launchpad,
			functionName: "sellTokens",
			args: [tokenAmountInWei, minEthOut],
		});
	};

	return (
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

			<div className="flex items-center gap-2 text-sm text-gray-600  justify-end pt-6 pr-4">
				<label htmlFor="slippage" className="whitespace-nowrap">
					Slippage:
				</label>
				<input
					id="slippage"
					type="number"
					step="0.1"
					min="0"
					max="100"
					value={slippage}
					onChange={(e) => setSlippage(e.target.value)}
					className="w-20 px-2 py-1 border border-gray-300 rounded text-sm text-right"
				/>
				<span>%</span>
			</div>

			<div className="p-4 space-y-4">
				{activeTab === "buy" ? (
					<BuyForm
						tokenName={name}
						isConnected={isConnected}
						isWritePending={isWritePending}
						onBuy={handleBuy}
						launchpadAddress={launchpadAddress}
					/>
				) : (
					<SellForm
						symbol={symbol}
						isConnected={isConnected}
						isWritePending={isWritePending}
						onSell={handleSell}
						launchpadAddress={launchpadAddress}
					/>
				)}
			</div>
		</div>
	);
};

interface ChartPoint {
	time: Time;
	value: number;
}

type TokenChartProps = {
	backgroundColor?: string;
	lineColor?: string;
	gridColor?: string;
	textColor?: string;
	height?: number;
	width?: number;
};

const TokenChart = ({
	backgroundColor = "#ffffff",
	lineColor = "#2563eb",
	gridColor = "#e5e7eb",
	textColor = "#6b7280",
	height = 350,
	width = 0,
}: TokenChartProps) => {
	const chartContainerRef = useRef<HTMLDivElement>(null);
	const chartRef = useRef<IChartApi | null>(null);
	const seriesRef = useRef<ISeriesApi<"Line"> | null>(null);

	const {
		data: transfersData,
		isLoading,
		isError,
		error,
	} = useQuery<TransfersData>({
		queryKey: ["chart-transfers", LAUNCHPAD_ADDRESS],
		queryFn: async () => {
			return await request<TransfersData>(
				LAUNCHPAD_GQL_ENDPOINT,
				GET_TRANSFERS,
				{
					id: LAUNCHPAD_ADDRESS,
				},
			);
		},
		enabled: !!LAUNCHPAD_ADDRESS,
	});

	useEffect(() => {
		if (!chartContainerRef.current) return;

		if (chartRef.current) {
			chartRef.current.remove();
			chartRef.current = null;
			seriesRef.current = null;
		}

		const chart = createChart(chartContainerRef.current, {
			layout: {
				background: { type: ColorType.Solid, color: backgroundColor },
				textColor,
				fontSize: 12,
				attributionLogo: false,
			},
			grid: {
				vertLines: { color: gridColor },
				horzLines: { color: gridColor },
			},
			width: width || chartContainerRef.current.clientWidth,
			height: height,
			rightPriceScale: {
				scaleMargins: {
					top: 0.1,
					bottom: 0.1,
				},
			},
		});

		const lineSeries = chart.addSeries(LineSeries, {
			color: lineColor,
			lineWidth: 2,
		});

		chart.applyOptions({
			localization: {
				priceFormatter: (price: number) => {
					if (price < 0.000001) {
						return price.toExponential(2);
					} else if (price < 0.001) {
						return price.toFixed(6);
					} else if (price < 0.01) {
						return price.toFixed(4);
					} else {
						return price.toFixed(2);
					}
				},
			},
		});

		chartRef.current = chart;
		seriesRef.current = lineSeries;

		const handleResize = () => {
			if (chartContainerRef.current && chartRef.current) {
				chartRef.current.applyOptions({
					width: width || chartContainerRef.current.clientWidth,
				});
			}
		};

		window.addEventListener("resize", handleResize);

		if (transfersData?.Trade && seriesRef.current) {
			try {
				const chartPoints: ChartPoint[] = transfersData.Trade.map((trade) => {
					const timestampSec = parseInt(trade.timestamp, 10);
					const tokenAmount = BigInt(trade.tokenAmount);
					const ethAmount = BigInt(trade.ethAmount);
					let priceEth: number;
					if (tokenAmount === 0n) {
						priceEth = 0;
					} else {
						const ethAmountFloat = Number(ethAmount) / 1e18;
						const tokenAmountFloat = Number(tokenAmount) / 1e18;
						priceEth =
							tokenAmountFloat > 0 ? ethAmountFloat / tokenAmountFloat : 0;
					}

					return {
						time: timestampSec as Time,
						value: priceEth,
					};
				}).sort((a, b) => Number(a.time) - Number(b.time));

				seriesRef.current.setData(chartPoints as LineData<Time>[]);

				chart.timeScale().fitContent();
			} catch (err) {
				console.error("Error processing chart data:", err);
			}
		}

		return () => {
			window.removeEventListener("resize", handleResize);
			if (chartRef.current) {
				chartRef.current.remove();
				chartRef.current = null;
				seriesRef.current = null;
			}
		};
	}, [
		backgroundColor,
		gridColor,
		lineColor,
		textColor,
		height,
		width,
		transfersData,
		LAUNCHPAD_ADDRESS,
	]);

	if (isLoading) {
		return (
			<div className="bg-white rounded-lg p-4 h-96 flex items-center justify-center shadow-sm border border-gray-200">
				<div className="text-gray-400">Loading chart data...</div>
			</div>
		);
	}

	if (isError) {
		console.error("Chart data loading error:", error);
		return (
			<div className="bg-white rounded-lg p-4 h-96 flex items-center justify-center shadow-sm border border-gray-200">
				<div className="text-red-500">Error loading chart data.</div>
			</div>
		);
	}

	if (!transfersData?.Trade || transfersData.Trade.length === 0) {
		return (
			<div className="bg-white rounded-lg p-4 h-96 flex items-center justify-center shadow-sm border border-gray-200">
				<div className="text-gray-400">No trade data available for chart.</div>
			</div>
		);
	}

	return (
		<div className="bg-white rounded-lg p-4 h-96 shadow-sm border border-gray-200">
			<div ref={chartContainerRef} className="w-full h-full" />
		</div>
	);
};

const App = () => {
	const { data: LpData } = useQuery<LaunchpadDataById>({
		queryKey: ["launchpad-data", LAUNCHPAD_ADDRESS],
		queryFn: async () => {
			return await request<LaunchpadDataById>(
				LAUNCHPAD_GQL_ENDPOINT,
				GET_LAUNCHPAD_QUERY,
				{
					id: LAUNCHPAD_ADDRESS,
				},
			);
		},
	});
	const token = LpData?.Launchpad_by_pk?.token;
	const tokenAddress = token?.id;

	const shortId = `${tokenAddress?.slice(0, 6)}...${tokenAddress?.slice(-4)}`;
	const shortCreatorId = `${LpData?.Launchpad_by_pk?.creator_id.slice(0, 6)}...${LpData?.Launchpad_by_pk?.creator_id.slice(-4)}`;

	return (
		<WagmiProvider config={config}>
			<QueryClientProvider client={queryClient}>
				<RainbowKitProvider>
					<div className="min-h-screen  text-gray-900">
						<div className="sticky top-0 z-10 bg-white border-b border-gray-200">
							<Header />
						</div>

						<div className="container mx-auto px-4 py-6">
							<div className="flex items-center gap-4 mb-6">
								<div>
									<h1 className="text-2xl font-bold">
										{token?.name}{" "}
										<p className="text-gray-600">{token?.symbol}</p>
										<div className="flex gap-4 mt-2">
											<a
												href={`https://explorer.evm.testnet.cytonic.com/token/  ${tokenAddress}`}
												target="_blank"
												rel="noopener noreferrer"
												className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
											>
												Token on Explorer:
												<span className="font-mono text-orange-600">
													{shortId}
												</span>
											</a>

											<a
												href={`https://explorer.evm.testnet.cytonic.com/address/  ${LpData?.Launchpad_by_pk?.creator_id}`}
												target="_blank"
												rel="noopener noreferrer"
												className="inline-flex items-center gap-1 text-sm text-blue-600 hover:text-blue-800"
											>
												Creator:
												<span className="font-mono text-orange-600">
													{shortCreatorId}
												</span>
											</a>
										</div>
									</h1>
								</div>
							</div>

							<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
								<div className="lg:col-span-2 space-y-6">
									<TokenChart />
								</div>

								<div className="space-y-6">
									<BalanceCard
										launchpadAddress={LpData?.Launchpad_by_pk?.id || ""}
										name={token?.name || ""}
										ethSupply={LpData?.Launchpad_by_pk?.totalEthRaised || ""}
									/>

									<TradePanel
										symbol={token?.symbol || ""}
										name={token?.name || ""}
										launchpadAddress={LpData?.Launchpad_by_pk?.id || ""}
										tokenAddress={token?.id || ""}
									/>
								</div>
							</div>
						</div>
					</div>
				</RainbowKitProvider>
			</QueryClientProvider>
		</WagmiProvider>
	);
};

ReactDOM.createRoot(rootElement).render(
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
