import { Buffer } from "buffer";
import { QueryClient, QueryClientProvider, useQuery } from "@tanstack/react-query";
import React from "react";
import ReactDOM from "react-dom/client";
import {
	useAccount,
	usePublicClient,
	useWalletClient,
	WagmiProvider,
} from "wagmi";

import { config } from "./rainbow.ts";

import "./index.css";
import "@rainbow-me/rainbowkit/styles.css";
import { RainbowKitProvider, ConnectButton } from "@rainbow-me/rainbowkit";
import { Button, Toaster } from "@/components/ui";
import { createRootRoute, createRoute, createRouter, Link, Outlet, redirect, RouterProvider } from '@tanstack/react-router'
import {
	fetchPools, fetchPoolDetails, fetchAccountBalances, fetchRecentSwaps, fetchMintsByTransaction, fetchTokens, fetchFilteredSwaps,
	fetchSwapsForPool
} from "./launchpad-gql.ts";
import { encodeFunctionData, parseEther } from "viem";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogHeader,
	DialogTitle,
	DialogTrigger,
} from "@/components/ui"

globalThis.Buffer = Buffer;

const queryClient = new QueryClient();

const root = document.getElementById("root");
if (!root) {
	throw new Error("Root element not found");
}

const defaultTokenA = "0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2"; // WETH
const defaultTokenB = "0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48"; // USDC

const rootRoute = createRootRoute({
	component: () => {
		return (
			<div className="h-svh bg-gray-50">
				<Outlet />
			</div>
		);
	},
	notFoundComponent: () => {
		return (
			<div>
				<p>This is the notFoundComponent configured on root route</p>
				<Link to="/swap">Start Over</Link>
			</div>
		)
	},
});

const appRoute = createRoute({
	loader: ({ location }) => {
		// if its not /swap or /add-liquidity, redirect to /swap
		if (location.href !== "/swap" && location.href !== "/add-liquidity") {
			throw redirect({
				to: "/swap"
			});
		}
	},
	getParentRoute: () => rootRoute,
	path: "/",
	component: () => {
		const { isConnected } = useAccount();

		return (
			<div className="min-h-screen bg-gray-50 py-6 px-4  flex items-center justify-center">
				<div className="w-[400px]">
					{isConnected && (
						<div className="text-center mb-0 flex items-center w-full justify-end ">
							<div className="mb-4">
								<ConnectButton showBalance={true} />
							</div>
						</div>
					)}

					{isConnected && (
						<div className="space-y-4">
							<div className="flex flex-row gap-2">
								<Link to="/swap" className="bg-white rounded-lg p-4 shadow-sm">
									Swap
								</Link>

								<Link to="/add-liquidity" className="bg-white rounded-lg p-4 shadow-sm">
									Add liquidity
								</Link>
							</div>

							<Outlet />
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
	}
});

const swapRoute = createRoute({
	getParentRoute: () => appRoute,
	path: '/swap',
	component: () => {
		const [slippage, setSlippage] = React.useState<number>(0.5);
		const [sellAmount, setSellAmount] = React.useState<string>('');
		const [buyAmount, setBuyAmount] = React.useState<string>('');
		const [sellToken, setSellToken] = React.useState<string>(defaultTokenA);
		const [buyToken, setBuyToken] = React.useState<string>(defaultTokenB);
		const [isLoading, setIsLoading] = React.useState<boolean>(false);
		const [isSelectingToken, setIsSelectingToken] = React.useState<'sell' | 'buy' | null>(null);

		const { address } = useAccount();
		const { data: walletClient } = useWalletClient();
		const publicClient = usePublicClient();

		// Fetch available tokens
		const { data: tokens } = useQuery({
			queryKey: ['tokens'],
			queryFn: () => fetchTokens(),
		});

		// Fetch pools for the token pair
		const { data: pools } = useQuery({
			queryKey: ['pools', sellToken, buyToken],
			queryFn: () => fetchPools(),
			enabled: !!sellToken && !!buyToken,
		});

		// Find the best pool for the pair
		const selectedPool = React.useMemo(() => {
			if (!pools) return null;
			return pools.find((pool: any) =>
				(pool.token0 === sellToken && pool.token1 === buyToken) ||
				(pool.token0 === buyToken && pool.token1 === sellToken)
			);
		}, [pools, sellToken, buyToken]);

		// Fetch pool details for price calculation
		const { data: poolDetails, error } = useQuery({
			queryKey: ['poolDetails', selectedPool?.id],
			queryFn: async () => {
				if (!selectedPool) return null;
				return await fetchPoolDetails({ poolId: selectedPool?.id })
			},
			enabled: !!selectedPool,
		});

		console.log("error: ", error)

		// Calculate output amount based on AMM formula
		const calculateOutputAmount = React.useCallback((inputAmount: string) => {
			if (!poolDetails || !inputAmount || isNaN(Number(inputAmount))) return '0';

			const input = parseFloat(inputAmount);
			if (input <= 0) return '0';

			const reserve0 = parseFloat(poolDetails.reserve0);
			const reserve1 = parseFloat(poolDetails.reserve1);

			// Determine which reserves to use based on token order
			const isToken0Input = sellToken === poolDetails.token0.id;
			const reserveIn = isToken0Input ? reserve0 : reserve1;
			const reserveOut = isToken0Input ? reserve1 : reserve0;

			// AMM formula: outputAmount = (inputAmount * reserveOut) / (reserveIn + inputAmount)
			// With 0.3% fee: outputAmount = (inputAmount * 997 * reserveOut) / (reserveIn * 1000 + inputAmount * 997)
			const inputAmountWithFee = input * 997;
			const numerator = inputAmountWithFee * reserveOut;
			const denominator = reserveIn * 1000 + inputAmountWithFee;

			return (numerator / denominator).toFixed(6);
		}, [poolDetails, sellToken]);

		// Update buy amount when sell amount changes
		React.useEffect(() => {
			if (sellAmount) {
				const output = calculateOutputAmount(sellAmount);
				setBuyAmount(output);
			} else {
				setBuyAmount('');
			}
		}, [sellAmount, calculateOutputAmount]);

		// Get token symbol
		const getTokenSymbol = (tokenAddress: string) => {
			if (!tokens) return tokenAddress.slice(0, 6);
			const token = tokens.find((t: any) => t.id === tokenAddress);
			return token?.symbol || tokenAddress.slice(0, 6);
		};

		// Handle token selection
		const handleTokenSelect = (tokenAddress: string) => {
			if (isSelectingToken === 'sell') {
				setSellToken(tokenAddress);
			} else if (isSelectingToken === 'buy') {
				setBuyToken(tokenAddress);
			}
			setIsSelectingToken(null);
		};

		// Swap tokens
		const handleSwapTokens = () => {
			setSellToken(buyToken);
			setBuyToken(sellToken);
			setSellAmount(buyAmount);
			setBuyAmount(sellAmount);
		};

		// Execute swap
		const handleSwap = async () => {
			if (!walletClient || !publicClient || !address || !selectedPool) return;

			setIsLoading(true);
			try {
				const inputAmount = parseEther(sellAmount);
				const outputAmount = parseEther(buyAmount);

				// Calculate minimum output amount with slippage
				const minOutputAmount = outputAmount * BigInt(Math.floor((100 - slippage) * 100)) / BigInt(10000);

				// Router contract address (Uniswap V2 Router)
				const routerAddress = '0x36605aC77d1A9f3A653C66BF7d2B8E9259D2a2f9';

				// Swap function call data
				const swapData = encodeFunctionData({
					abi: [
						{
							name: 'swapExactTokensForTokens',
							type: 'function',
							inputs: [
								{ name: 'amountIn', type: 'uint256' },
								{ name: 'amountOutMin', type: 'uint256' },
								{ name: 'path', type: 'address[]' },
								{ name: 'to', type: 'address' },
								{ name: 'deadline', type: 'uint256' }
							],
							outputs: [{ name: 'amounts', type: 'uint256[]' }]
						}
					],
					functionName: 'swapExactTokensForTokens',
					args: [
						inputAmount,
						minOutputAmount,
						[sellToken, buyToken],
						address,
						BigInt(Math.floor(Date.now() / 1000) + 1200) // 20 minutes deadline
					]
				});

				// Execute the transaction
				const hash = await walletClient.sendTransaction({
					to: routerAddress,
					data: swapData,
				});

				// Wait for confirmation
				await publicClient.waitForTransactionReceipt({ hash });

				// Reset form
				setSellAmount('');
				setBuyAmount('');
			} catch (error) {
				console.error('Swap failed:', error);
			} finally {
				setIsLoading(false);
			}
		};

		const isSwapDisabled = !sellAmount || !buyAmount || !selectedPool || isLoading;

		return (
			<div className="bg-white rounded-xl p-4 flex flex-col gap-4 items-center shadow w-full max-w-md mx-auto">
				<h1 className="w-full text-lg font-semibold text-gray-800 mb-1">Swap</h1>
				<div className="flex flex-col w-full gap-2">
					<div className="flex flex-col gap-1 border border-gray-200 rounded p-2 bg-gray-50">
						<span className="text-gray-700 text-sm">Sell</span>
						<div className="flex items-center gap-1 w-full">
							<input
								type="text"
								className="rounded p-1 w-full border border-gray-300 text-sm"
								placeholder="0.0"
								value={sellAmount}
								onChange={(e) => setSellAmount(e.target.value)}
							/>
							<button
								onClick={() => setIsSelectingToken('sell')}
								className="flex items-center gap-1 bg-gray-100 rounded px-2 py-0.5 hover:bg-gray-200 transition-colors"
							>
								<span className="text-gray-500 text-xs">
									{getTokenSymbol(sellToken)}
								</span>
								<svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
								</svg>
							</button>
						</div>
						<span className="text-xs text-gray-400">
							{poolDetails && `1 ${getTokenSymbol(sellToken)} = ${(parseFloat(poolDetails.reserve1) / parseFloat(poolDetails.reserve0)).toFixed(4)} ${getTokenSymbol(buyToken)}`}
						</span>
					</div>
					<div className="flex justify-center my-1">
						<button onClick={handleSwapTokens} className="w-6 h-6 text-gray-400 bg-gray-200 rounded p-1 hover:bg-gray-300 transition-colors">
							<svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
								<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
							</svg>
						</button>
					</div>
					<div className="flex flex-col gap-1 border border-gray-200 rounded p-2 bg-gray-50">
						<span className="text-gray-700 text-sm">Buy</span>
						<div className="flex items-center gap-1 w-full">
							<input
								type="text"
								className="rounded p-1 w-full border border-gray-300 text-sm bg-gray-100"
								placeholder="0.0"
								value={buyAmount}
								readOnly
							/>
							<button
								onClick={() => setIsSelectingToken('buy')}
								className="flex items-center gap-1 bg-gray-100 rounded px-2 py-0.5 hover:bg-gray-200 transition-colors"
							>
								<span className="text-gray-500 text-xs">
									{getTokenSymbol(buyToken)}
								</span>
								<svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
								</svg>
							</button>
						</div>
						<span className="text-xs text-gray-400">
							{poolDetails && `1 ${getTokenSymbol(buyToken)} = ${(parseFloat(poolDetails.reserve0) / parseFloat(poolDetails.reserve1)).toFixed(4)} ${getTokenSymbol(sellToken)}`}
						</span>
					</div>
				</div>
				<div className="w-full flex flex-row gap-2 mt-1 items-center">
					<label className="text-xs text-gray-600 text-nowrap" htmlFor="slippage">Slippage (%)</label>
					<input
						id="slippage"
						type="number"
						min={0}
						step={0.1}
						value={slippage}
						onChange={e => setSlippage(Number(e.target.value))}
						className="rounded p-1 border border-gray-300 w-full text-sm"
					/>
				</div>
				{selectedPool && (
					<div className="w-full text-xs text-gray-500">
						<div>Pool: {selectedPool.id.slice(0, 8)}...</div>
						<div>Fee: 0.3%</div>
						{poolDetails && (
							<div>TVL: ${((parseFloat(poolDetails.reserve0) + parseFloat(poolDetails.reserve1)) / 2).toFixed(2)}</div>
						)}
					</div>
				)}
				<Button
					className="w-full mt-2 bg-blue-500 text-white hover:bg-blue-600 font-semibold py-1 rounded disabled:bg-gray-400"
					onClick={handleSwap}
					disabled={isSwapDisabled}
				>
					{isLoading ? 'Swapping...' : 'Swap'}
				</Button>

				{/* Token Selection Dialog */}
				<Dialog open={!!isSelectingToken} onOpenChange={() => setIsSelectingToken(null)}>
					<DialogContent className="max-w-md">
						<DialogHeader>
							<DialogTitle>Select Token</DialogTitle>
							<DialogDescription>
								Choose a token to {isSelectingToken === 'sell' ? 'sell' : 'buy'}
							</DialogDescription>
						</DialogHeader>
						<div className="max-h-60 overflow-y-auto">
							{tokens?.map((token: any) => (
								<button
									key={token.id}
									onClick={() => handleTokenSelect(token.id)}
									className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors"
									disabled={token.id === (isSelectingToken === 'sell' ? buyToken : sellToken)}
								>
									<div className="flex-1 text-left">
										<div className="font-medium text-sm">{token.symbol}</div>
										<div className="text-xs text-gray-500">{token.name}</div>
									</div>
									<div className="text-xs text-gray-400">{token.id.slice(0, 6)}...</div>
								</button>
							))}
						</div>
					</DialogContent>
				</Dialog>
			</div >
		);
	},
});

const addLiquidityRoute = createRoute({
	getParentRoute: () => appRoute,
	path: '/add-liquidity',
	component: () => {
		const [tokenAAmount, setTokenAAmount] = React.useState<string>('');
		const [tokenBAmount, setTokenBAmount] = React.useState<string>('');
		const [tokenA, setTokenA] = React.useState<string>(defaultTokenA);
		const [tokenB, setTokenB] = React.useState<string>(defaultTokenB);
		const [isLoading, setIsLoading] = React.useState<boolean>(false);
		const [isSelectingToken, setIsSelectingToken] = React.useState<'tokenA' | 'tokenB' | null>(null);
		const [needsApprovalA, setNeedsApprovalA] = React.useState<boolean>(false);
		const [needsApprovalB, setNeedsApprovalB] = React.useState<boolean>(false);
		const [isApprovingA, setIsApprovingA] = React.useState<boolean>(false);
		const [isApprovingB, setIsApprovingB] = React.useState<boolean>(false);

		const { address } = useAccount();
		const { data: walletClient } = useWalletClient();
		const publicClient = usePublicClient();

		// Router contract address (Uniswap V2 Router)
		const routerAddress = '0x7a250d5630B4cF539739dF2C5dAcb4c659F2488D';

		// ERC20 ABI for approve and allowance
		const erc20Abi = [
			{
				name: 'approve',
				type: 'function',
				inputs: [
					{ name: 'spender', type: 'address' },
					{ name: 'amount', type: 'uint256' }
				],
				outputs: [{ name: '', type: 'bool' }]
			},
			{
				name: 'allowance',
				type: 'function',
				inputs: [
					{ name: 'owner', type: 'address' },
					{ name: 'spender', type: 'address' }
				],
				outputs: [{ name: '', type: 'uint256' }]
			}
		];

		// Fetch available tokens
		const { data: tokens } = useQuery({
			queryKey: ['tokens'],
			queryFn: () => fetchTokens(),
		});

		// Fetch pools for the token pair
		const { data: pools } = useQuery({
			queryKey: ['pools', tokenA, tokenB],
			queryFn: () => fetchPools(),
			enabled: !!tokenA && !!tokenB,
		});

		// Find the pool for the pair
		const selectedPool = React.useMemo(() => {
			if (!pools) return null;
			return pools.find((pool: any) =>
				(pool.token0 === tokenA && pool.token1 === tokenB) ||
				(pool.token0 === tokenB && pool.token1 === tokenA)
			);
		}, [pools, tokenA, tokenB]);

		// Fetch pool details for ratio calculation
		const { data: poolDetails } = useQuery({
			queryKey: ['poolDetails', selectedPool?.id],
			queryFn: async () => {
				if (!selectedPool) return null;
				return await fetchPoolDetails({ poolId: selectedPool?.id })
			},
			enabled: !!selectedPool,
		});

		// Check allowances
		const checkAllowances = React.useCallback(async () => {
			if (!publicClient || !address) return;

			try {
				const amountA = parseEther(tokenAAmount || '0');
				const amountB = parseEther(tokenBAmount || '0');

				const [allowanceA, allowanceB] = await Promise.all([
					publicClient.readContract({
						address: tokenA as `0x${string}`,
						abi: erc20Abi,
						functionName: 'allowance',
						args: [address, routerAddress]
					}),
					publicClient.readContract({
						address: tokenB as `0x${string}`,
						abi: erc20Abi,
						functionName: 'allowance',
						args: [address, routerAddress]
					})
				]);

				setNeedsApprovalA(amountA > (allowanceA as bigint));
				setNeedsApprovalB(amountB > (allowanceB as bigint));
			} catch (error) {
				console.error('Error checking allowances:', error);
			}
		}, [publicClient, address, tokenA, tokenB, tokenAAmount, tokenBAmount]);

		// Check allowances when amounts change
		React.useEffect(() => {
			if (tokenAAmount && tokenBAmount) {
				checkAllowances();
			}
		}, [tokenAAmount, tokenBAmount, checkAllowances]);

		// Calculate token B amount based on pool ratio when token A amount changes
		React.useEffect(() => {
			if (poolDetails && tokenAAmount && !isNaN(Number(tokenAAmount))) {
				const amountA = parseFloat(tokenAAmount);
				const reserve0 = parseFloat(poolDetails.reserve0);
				const reserve1 = parseFloat(poolDetails.reserve1);

				// Determine which reserves to use based on token order
				const isToken0A = tokenA === poolDetails.token0.id;
				const reserveA = isToken0A ? reserve0 : reserve1;
				const reserveB = isToken0A ? reserve1 : reserve0;

				// Calculate proportional amount for token B
				const amountB = (amountA * reserveB) / reserveA;
				setTokenBAmount(amountB.toFixed(6));
			}
		}, [tokenAAmount, poolDetails, tokenA]);

		// Get token symbol
		const getTokenSymbol = (tokenAddress: string) => {
			if (!tokens) return tokenAddress.slice(0, 6);
			const token = tokens.find((t: any) => t.id === tokenAddress);
			return token?.symbol || tokenAddress.slice(0, 6);
		};

		// Handle token selection
		const handleTokenSelect = (tokenAddress: string) => {
			if (isSelectingToken === 'tokenA') {
				setTokenA(tokenAddress);
			} else if (isSelectingToken === 'tokenB') {
				setTokenB(tokenAddress);
			}
			setIsSelectingToken(null);
		};

		// Approve token
		const handleApprove = async (tokenAddress: string, isTokenA: boolean) => {
			if (!walletClient || !address) return;

			const setIsApproving = isTokenA ? setIsApprovingA : setIsApprovingB;
			setIsApproving(true);

			try {
				const amount = parseEther('115792089237316195423570985008687907853269984665640564039457584007913129639935'); // Max uint256

				const hash = await walletClient.writeContract({
					address: tokenAddress as `0x${string}`,
					abi: erc20Abi,
					functionName: 'approve',
					args: [routerAddress, amount]
				});

				await publicClient?.waitForTransactionReceipt({ hash });

				// Recheck allowances after approval
				await checkAllowances();
			} catch (error) {
				console.error('Approval failed:', error);
			} finally {
				setIsApproving(false);
			}
		};

		// Add liquidity
		const handleAddLiquidity = async () => {
			if (!walletClient || !publicClient || !address) return;

			setIsLoading(true);
			try {
				const amountADesired = parseEther(tokenAAmount);
				const amountBDesired = parseEther(tokenBAmount);

				// Set minimum amounts (95% of desired amounts for 5% slippage tolerance)
				const amountAMin = amountADesired * BigInt(95) / BigInt(100);
				const amountBMin = amountBDesired * BigInt(95) / BigInt(100);

				// Add liquidity function call data
				const addLiquidityData = encodeFunctionData({
					abi: [
						{
							name: 'addLiquidity',
							type: 'function',
							inputs: [
								{ name: 'tokenA', type: 'address' },
								{ name: 'tokenB', type: 'address' },
								{ name: 'amountADesired', type: 'uint256' },
								{ name: 'amountBDesired', type: 'uint256' },
								{ name: 'amountAMin', type: 'uint256' },
								{ name: 'amountBMin', type: 'uint256' },
								{ name: 'to', type: 'address' },
								{ name: 'deadline', type: 'uint256' }
							],
							outputs: [
								{ name: 'amountA', type: 'uint256' },
								{ name: 'amountB', type: 'uint256' },
								{ name: 'liquidity', type: 'uint256' }
							]
						}
					],
					functionName: 'addLiquidity',
					args: [
						tokenA,
						tokenB,
						amountADesired,
						amountBDesired,
						amountAMin,
						amountBMin,
						address,
						BigInt(Math.floor(Date.now() / 1000) + 1200) // 20 minutes deadline
					]
				});

				// Execute the transaction
				const hash = await walletClient.sendTransaction({
					to: routerAddress,
					data: addLiquidityData,
				});

				// Wait for confirmation
				await publicClient.waitForTransactionReceipt({ hash });

				// Reset form
				setTokenAAmount('');
				setTokenBAmount('');
			} catch (error) {
				console.error('Add liquidity failed:', error);
			} finally {
				setIsLoading(false);
			}
		};

		const isAddLiquidityDisabled = !tokenAAmount || !tokenBAmount || isLoading || needsApprovalA || needsApprovalB;

		return (
			<div className="bg-white rounded-xl p-4 flex flex-col gap-4 items-center shadow w-full max-w-md mx-auto">
				<h1 className="w-full text-lg font-semibold text-gray-800 mb-1">Add Liquidity</h1>
				<div className="flex flex-col w-full gap-2">
					<div className="flex flex-col gap-1 border border-gray-200 rounded p-2 bg-gray-50">
						<span className="text-gray-700 text-sm">Token A</span>
						<div className="flex items-center gap-1 w-full">
							<input
								type="text"
								className="rounded p-1 w-full border border-gray-300 text-sm"
								placeholder="0.0"
								value={tokenAAmount}
								onChange={(e) => setTokenAAmount(e.target.value)}
							/>
							<button
								onClick={() => setIsSelectingToken('tokenA')}
								className="flex items-center gap-1 bg-gray-100 rounded px-2 py-0.5 hover:bg-gray-200 transition-colors"
							>
								<span className="text-gray-500 text-xs">
									{getTokenSymbol(tokenA)}
								</span>
								<svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
								</svg>
							</button>
						</div>
						{poolDetails && (
							<span className="text-xs text-gray-400">
								1 {getTokenSymbol(tokenA)} = {(parseFloat(poolDetails.reserve1) / parseFloat(poolDetails.reserve0)).toFixed(4)} {getTokenSymbol(tokenB)}
							</span>
						)}
					</div>
					<div className="flex justify-center my-1">
						<svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6 text-gray-400 bg-gray-200 rounded p-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
							<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
						</svg>
					</div>
					<div className="flex flex-col gap-1 border border-gray-200 rounded p-2 bg-gray-50">
						<span className="text-gray-700 text-sm">Token B</span>
						<div className="flex items-center gap-1 w-full">
							<input
								type="text"
								className="rounded p-1 w-full border border-gray-300 text-sm bg-gray-100"
								placeholder="0.0"
								value={tokenBAmount}
								readOnly
							/>
							<button
								onClick={() => setIsSelectingToken('tokenB')}
								className="flex items-center gap-1 bg-gray-100 rounded px-2 py-0.5 hover:bg-gray-200 transition-colors"
							>
								<span className="text-gray-500 text-xs">
									{getTokenSymbol(tokenB)}
								</span>
								<svg className="w-3 h-3 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
								</svg>
							</button>
						</div>
						{poolDetails && (
							<span className="text-xs text-gray-400">
								1 {getTokenSymbol(tokenB)} = {(parseFloat(poolDetails.reserve0) / parseFloat(poolDetails.reserve1)).toFixed(4)} {getTokenSymbol(tokenA)}
							</span>
						)}
					</div>
				</div>

				{/* Approval buttons */}
				{needsApprovalA && (
					<Button
						className="w-full bg-yellow-500 text-white hover:bg-yellow-600 font-semibold py-1 rounded disabled:bg-gray-400"
						onClick={() => handleApprove(tokenA, true)}
						disabled={isApprovingA}
					>
						{isApprovingA ? 'Approving...' : `Approve ${getTokenSymbol(tokenA)}`}
					</Button>
				)}

				{needsApprovalB && (
					<Button
						className="w-full bg-yellow-500 text-white hover:bg-yellow-600 font-semibold py-1 rounded disabled:bg-gray-400"
						onClick={() => handleApprove(tokenB, false)}
						disabled={isApprovingB}
					>
						{isApprovingB ? 'Approving...' : `Approve ${getTokenSymbol(tokenB)}`}
					</Button>
				)}

				{selectedPool && poolDetails && (
					<div className="w-full text-xs text-gray-500">
						<div>Pool: {selectedPool.id.slice(0, 8)}...</div>
						<div>Your share: 0%</div>
						<div>TVL: ${((parseFloat(poolDetails.reserve0) + parseFloat(poolDetails.reserve1)) / 2).toFixed(2)}</div>
					</div>
				)}

				<Button
					className="w-full mt-2 bg-blue-500 text-white hover:bg-blue-600 font-semibold py-1 rounded disabled:bg-gray-400"
					onClick={handleAddLiquidity}
					disabled={isAddLiquidityDisabled}
				>
					{isLoading ? 'Adding Liquidity...' : 'Add Liquidity'}
				</Button>

				{/* Token Selection Dialog */}
				<Dialog open={!!isSelectingToken} onOpenChange={() => setIsSelectingToken(null)}>
					<DialogContent className="max-w-md">
						<DialogHeader>
							<DialogTitle>Select Token</DialogTitle>
							<DialogDescription>
								Choose a token for {isSelectingToken === 'tokenA' ? 'Token A' : 'Token B'}
							</DialogDescription>
						</DialogHeader>
						<div className="max-h-60 overflow-y-auto">
							{tokens?.map((token: any) => (
								<button
									key={token.id}
									onClick={() => handleTokenSelect(token.id)}
									className="w-full flex items-center gap-3 p-3 hover:bg-gray-50 rounded-lg transition-colors"
									disabled={token.id === (isSelectingToken === 'tokenA' ? tokenB : tokenA)}
								>
									<div className="flex-1 text-left">
										<div className="font-medium text-sm">{token.symbol}</div>
										<div className="text-xs text-gray-500">{token.name}</div>
									</div>
									<div className="text-xs text-gray-400">{token.id.slice(0, 6)}...</div>
								</button>
							))}
						</div>
					</DialogContent>
				</Dialog>
			</div>
		);
	},
});

const routeTree = rootRoute.addChildren([
	appRoute.addChildren([
		swapRoute,
		addLiquidityRoute
	])
]);

const router = createRouter({
	routeTree,
	defaultPreload: 'intent',
	defaultStaleTime: 5000,
	scrollRestoration: true,
})

declare module '@tanstack/react-router' {
	interface Register {
		router: typeof router
	}
}

ReactDOM.createRoot(root).render(
	<React.StrictMode>
		<WagmiProvider config={config}>
			<QueryClientProvider client={queryClient}>
				<RainbowKitProvider>
					<RouterProvider router={router} />
					<Toaster />
				</RainbowKitProvider>
			</QueryClientProvider>
		</WagmiProvider>
	</React.StrictMode>,
);
