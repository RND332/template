import React, { useEffect, useState } from "react";
import {
	useQuery,
	QueryClient,
	QueryClientProvider,
} from "@tanstack/react-query";
import {
	Card,
	CardContent,
	CardDescription,
	CardHeader,
	CardTitle,
} from "./components/ui/card";
import { Alert, AlertDescription } from "./components/ui/alert";
import {
	Copy,
	Users,
	Activity,
	TrendingUp,
	Clock,
	BarChart as BarChartIcon,
	Wallet,
	Search,
	Download,
	RefreshCw,
} from "lucide-react";
import {
	PieChart,
	Pie,
	Cell,
	BarChart,
	Bar,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
	LineChart,
	Line,
	Area,
	AreaChart,
} from "recharts";
import { WagmiProvider } from "wagmi";
import { config } from "./rainbow";
import { RainbowKitProvider } from "@rainbow-me/rainbowkit";
import { Toaster } from "./components/ui";
import ReactDOM from "react-dom/client";
import {
	ApolloClient,
	InMemoryCache,
	ApolloProvider,
	gql,
	useQuery as useGraphQLQuery,
} from "@apollo/client";

const TOKEN_ID = "0x8b3e3498a7bD92eCCBCF4CF7f1924c70CdDBd9B3";
const GRAPHQL_ENDPOINT = "https://erc20-indexer-ai.cytonic.com/v1/graphql";

const client = new ApolloClient({
	uri: GRAPHQL_ENDPOINT,
	cache: new InMemoryCache(),
	defaultOptions: {
		watchQuery: {
			fetchPolicy: "network-only",
		},
	},
});

export interface TokenData {
	Token: Token[];
}

export interface Token {
	id: string;
	balances: Balance[];
	symbol: string;
	name: string;
	transfers: Transfer[];
	decimals: number;
}

export interface Balance {
	balance: string;
	account_id: string;
}

export interface Transfer {
	to_id: string;
	from_id: string;
	timestamp: string;
	amount: string;
	transactionHash: string;
}

export interface UserData {
	data: Data;
}

export interface Data {
	Account_aggregate: AccountAggregate;
	AccountBalance: AccountBalance[];
}

export interface AccountAggregate {
	nodes: Node[];
}

export interface Node {
	transfersReceived_aggregate: TransfersReceivedAggregate;
	transfersSent_aggregate: TransfersSentAggregate;
}

export interface TransfersReceivedAggregate {
	aggregate: Aggregate;
}

export interface Aggregate {
	count: number;
}

export interface TransfersSentAggregate {
	aggregate: Aggregate2;
}

export interface Aggregate2 {
	count: number;
}

export interface AccountBalance {
	balance: string;
}

const fetchTokenData = gql`
	query MyQuery($token_id: String!) {
		Token(where: {id: {_eq: $token_id}}) {
			id
			balances {
				balance
				account_id
			}
			symbol
			name
			transfers(order_by: {timestamp: asc}) {
				to_id
				from_id
				timestamp
				amount
				transactionHash
			}
			decimals
		}
	}
`;

const fetchTokenUserData = gql`
	query MyQuery($user_id: String!, $token_id: String!) {
		Account_aggregate(where: {id: {_eq: $user_id}}) {
			nodes {
			transfersReceived_aggregate(where: {token_id: {_eq: $token_id}}) {
				aggregate {
				count
				}
			}
			transfersSent_aggregate(where: {token_id: {_eq: $token_id}}) {
				aggregate {
				count
				}
			}
			}
		}
		AccountBalance(where: {token_id: {_eq: $token_id}, account_id: {_eq: $user_id}}) {
			balance
		}
		}
`;

const App = () => {
	const [selectedTab, setSelectedTab] = useState("overview");
	const [userAddress, setUserAddress] = useState("");
	const [copied, setCopied] = useState(false);

	// Use TanStack Query for data fetching
	const {
		loading,
		error,
		data: tokensData,
		refetch,
	} = useGraphQLQuery<TokenData>(fetchTokenData, {
		variables: { token_id: TOKEN_ID },
	});

	const { data: tokenUserData, refetch: refetchUserData } =
		useGraphQLQuery<UserData>(fetchTokenUserData, {
			variables: { token_id: TOKEN_ID, user_id: userAddress },
		});
	const tokenData = tokensData?.Token[0];

	// Generate holder distribution from real balance data
	const generateHolderDistribution = () => {
		if (!tokenData || !tokenData.balances.length) {
			return [
				{ name: "Top 10", value: 45, count: 10, color: "#ef4444" },
				{ name: "Top 100", value: 25, count: 90, color: "#f97316" },
				{ name: "Top 1000", value: 20, count: 900, color: "#eab308" },
				{ name: "Others", value: 10, count: 14420, color: "#22c55e" },
			];
		}

		const totalSupplyBigInt = tokenData.balances.reduce(
			(sum, balance) => sum + BigInt(balance.balance),
			BigInt(0),
		);
		const balances = tokenData.balances;

		const top10Sum = balances
			.slice(0, 10)
			.reduce((sum, balance) => sum + BigInt(balance.balance), BigInt(0));
		const top100Sum = balances
			.slice(0, 100)
			.reduce((sum, balance) => sum + BigInt(balance.balance), BigInt(0));
		const top1000Sum = balances
			.slice(0, Math.min(1000, balances.length))
			.reduce((sum, balance) => sum + BigInt(balance.balance), BigInt(0));

		const top10Percent = Number((top10Sum * BigInt(100)) / totalSupplyBigInt);
		const top100Percent = Number(
			((top100Sum - top10Sum) * BigInt(100)) / totalSupplyBigInt,
		);
		const top1000Percent = Number(
			((top1000Sum - top100Sum) * BigInt(100)) / totalSupplyBigInt,
		);
		const othersPercent = 100 - top10Percent - top100Percent - top1000Percent;

		return [
			{
				name: "Top 10",
				value: top10Percent,
				count: Math.min(10, balances.length),
				color: "#ef4444",
			},
			{
				name: "Top 100",
				value: top100Percent,
				count: Math.min(90, Math.max(0, balances.length - 10)),
				color: "#f97316",
			},
			{
				name: "Top 1000",
				value: top1000Percent,
				count: Math.min(900, Math.max(0, balances.length - 100)),
				color: "#eab308",
			},
			{
				name: "Others",
				value: othersPercent,
				count: Math.max(0, balances.length - 1000),
				color: "#22c55e",
			},
		].filter((item) => item.count > 0);
	};

	// Generate top holders from real data
	const generateTopHolders = () => {
		if (!tokenData?.balances.length) {
			return Array.from({ length: 5 }, (_, i) => ({
				rank: i + 1,
				address: `Loading...`,
				balance: "0",
				percentage: 0,
			}));
		}

		const totalSupplyBigInt = tokenData.balances.reduce(
			(sum, balance) => sum + BigInt(balance.balance),
			BigInt(0),
		);

		return tokenData.balances.slice(0, 5).map((holder, index) => ({
			rank: index + 1,
			address: holder.account_id,
			balance: holder.balance.toString(),
			percentage:
				Number((BigInt(holder.balance) * BigInt(10000)) / totalSupplyBigInt) /
				100,
		}));
	};

	const holderDistribution = generateHolderDistribution();

	const transactionActivity: {
		time: string;
		transfers: number;
		unique: number;
	}[] = (() => {
		if (!tokenData || !tokenData.transfers.length) {
			return Array.from({ length: 24 }, (_, i) => ({
				time: new Date(Date.now() - i * 60 * 60 * 1000)
					.toISOString()
					.slice(11, 16), // HH:mm format
				transfers: Math.floor(Math.random() * 100 + 50), // Random transfers between 50 and 150
				unique: Math.floor(Math.random() * 30 + 10), // Random unique addresses between 10 and 40
			}));
		}

		const data = tokenData.transfers.reduce(
			(acc, transfer) => {
				const hour = new Date(Number.parseInt(transfer.timestamp) * 1000);

				const [year, month, day] = hour.toISOString().slice(0, 10).split("-");
				const time = `${year}-${month}-${day}T${hour.getHours().toString().padStart(2, "0")}:00:00`;

				if (!acc[time]) {
					acc[time] = { time, transfers: 0, unique: new Set() };
				}
				acc[time].transfers += 1;
				acc[time].unique.add(transfer.from_id);
				return acc;
			},
			{} as Record<
				string,
				{ time: string; transfers: number; unique: Set<string> }
			>,
		);

		return Object.values(data).map((item) => ({
			time: item.time,
			transfers: item.transfers,
			unique: item.unique.size,
		}));
	})();

	const dailyStats: { date: string; holders: number; transactions: number }[] =
		(() => {
			if (!tokenData || !tokenData.balances.length) {
				return Array.from({ length: 30 }, (_, i) => ({
					date: new Date(Date.now() - i * 24 * 60 * 60 * 1000)
						.toISOString()
						.slice(0, 10), // YYYY-MM-DD format
					holders: Math.floor(Math.random() * 1000 + 500), // Random holders between 500 and 1500
					transactions: Math.floor(Math.random() * 200 + 100), // Random transactions between 100 and 300
				}));
			}

			// transfers are already sorted by blockNumber in the query
			// so we can use them to generate unique daily holders stats
			const uniqueHolders = new Set<string>();
			const data: Record<
				string,
				{ date: string; holders: number; transactions: number }
			> = {};
			// Populate the data object with initial values
			for (const transfer of tokenData.transfers) {
				const date = new Date(Number.parseInt(transfer.timestamp) * 1000)
					.toISOString()
					.slice(0, 10); // YYYY-MM-DD format

				if (!data[date]) {
					data[date] = { date, holders: 0, transactions: 0 };
				}
				data[date].transactions += 1;

				if (!uniqueHolders.has(transfer.to_id)) {
					// Only count unique holders
					data[date].holders += 1;
				}
				uniqueHolders.add(transfer.to_id);
			}

			// now we know when new holders were added
			// we can generate daily holder growth stats

			return Object.values(data);
		})();

	const topHolders: {
		rank: number;
		address: string;
		balance: string;
		percentage: number;
	}[] = generateTopHolders();

	const recentTransactions: {
		hash: string;
		from: string;
		to: string;
		value: string;
		timestamp: string;
	}[] = (() => {
		if (!tokenData || !tokenData.transfers.length) {
			return Array.from({ length: 10 }, (_, i) => ({
				hash: `0x${Math.random().toString(16).slice(2, 10)}`,
				from: `0x${Math.random().toString(16).slice(2, 42)}`,
				to: `0x${Math.random().toString(16).slice(2, 42)}`,
				value: (Math.random() * 1000).toFixed(2),
				timestamp: new Date(Date.now() - i * 60 * 60 * 1000)
					.toISOString()
					.slice(0, 19)
					.replace("T", " "),
			}));
		}
		return tokenData.transfers.slice(0, 10).map((tx) => ({
			hash: tx.transactionHash,
			from: tx.from_id,
			to: tx.to_id,
			value: tx.amount,
			timestamp: new Date(Number.parseInt(tx.timestamp) * 1000)
				.toISOString()
				.slice(0, 19)
				.replace("T", " "),
		}));
	})();

	const copyToClipboard = (text: string) => {
		navigator.clipboard.writeText(text);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	const formatNumber = (num: number) => {
		return new Intl.NumberFormat().format(num);
	};

	const formatBalance = (balance: string | number) => {
		if (!balance) return "0";
		const balanceStr =
			typeof balance === "string" ? balance : balance.toString();
		const num =
			parseFloat(balanceStr) / Math.pow(10, tokenData?.decimals || 18);
		if (num >= 1000000) return (num / 1000000).toFixed(2) + "M";
		if (num >= 1000) return (num / 1000).toFixed(2) + "K";
		return num.toFixed(2);
	};

	const formatTotalSupply = () => {
		if (!tokenData) return "0";
		const totalSupply = tokenData.balances.reduce(
			(sum, balance) => sum + BigInt(balance.balance),
			BigInt(0),
		);
		const num = parseFloat(totalSupply.toString()) / 10 ** tokenData.decimals;
		if (num >= 1000000000)
			return `${(num / 1000000000).toFixed(2).replace(/\.?0+$/, "")}B`;
		if (num >= 1000000)
			return `${(num / 1000000).toFixed(2).replace(/\.?0+$/, "")}M`;
		if (num >= 1000) return `${(num / 1000).toFixed(2).replace(/\.?0+$/, "")}K`;
		return formatNumber(Math.floor(num));
	};

	const exportData = () => {
		const data = {
			tokenInfo: tokenData,
			holders: topHolders,
			transactions: recentTransactions,
		};
		const blob = new Blob([JSON.stringify(data, null, 2)], {
			type: "application/json",
		});
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = `${tokenData?.symbol}_data.json`;
		a.click();
	};

	return (
		<div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4">
			<div className="max-w-7xl mx-auto space-y-6">
				{/* Header */}
				<div className="bg-white rounded-xl shadow-sm border p-6">
					<div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
						<div className="flex items-center gap-4">
							<div className="w-16 h-16 bg-gradient-to-br from-purple-500 to-blue-600 rounded-xl flex items-center justify-center text-white font-bold text-xl">
								{tokenData?.symbol || "TKN"}
							</div>
							<div>
								<h1 className="text-3xl font-bold text-gray-900">
									{tokenData?.name || "Loading..."}
								</h1>
								<p className="text-gray-600">{tokenData?.symbol || "TKN"}</p>
								{loading && (
									<p className="text-sm text-blue-600">
										Fetching token data...
									</p>
								)}
								{error && (
									<p className="text-sm text-red-600">Error loading data</p>
								)}
								{!loading && !error && (
									<p className="text-sm text-green-600">
										Data loaded successfully
									</p>
								)}
							</div>
						</div>
						<div className="flex items-center gap-2">
							<button
								type="button"
								onClick={() => refetch()}
								disabled={!tokenData && loading}
								className="p-2 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50"
								title="Refresh data"
							>
								<RefreshCw
									className={`w-4 h-4 ${!tokenData && loading ? "animate-spin" : ""}`}
								/>
							</button>
							<span className="text-sm text-gray-600">Contract:</span>
							<code className="bg-gray-100 px-3 py-1 rounded text-sm">
								{tokenData?.id
									? `${tokenData?.id.slice(0, 10)}...${tokenData?.id.slice(-8)}`
									: "Loading..."}
							</code>
							<button
								type="button"
								title="Copy contract address"
								onClick={() => copyToClipboard(tokenData?.id || "")}
								className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
								disabled={!tokenData?.id}
							>
								<Copy className="w-4 h-4" />
							</button>
						</div>
					</div>

					{copied && (
						<Alert className="mt-4 border-green-200 bg-green-50">
							<AlertDescription className="text-green-800">
								Contract address copied to clipboard!
							</AlertDescription>
						</Alert>
					)}

					{error && (
						<Alert className="mt-4 border-red-200 bg-red-50">
							<AlertDescription className="text-red-800">
								Error loading token data: {error.message}
							</AlertDescription>
						</Alert>
					)}
				</div>

				{/* Navigation */}
				<div className="bg-white rounded-xl shadow-sm border">
					<div className="flex overflow-x-auto">
						{[
							{ id: "overview", label: "Overview", icon: Activity },
							{ id: "holders", label: "Holders", icon: Users },
							{ id: "transactions", label: "Transactions", icon: TrendingUp },
							{ id: "analytics", label: "Analytics", icon: BarChartIcon },
							{ id: "portfolio", label: "My Portfolio", icon: Wallet },
						].map(({ id, label, icon: Icon }) => (
							<button
								type="button"
								key={id}
								onClick={() => setSelectedTab(id)}
								className={`flex items-center gap-2 px-6 py-4 whitespace-nowrap border-b-2 transition-colors ${
									selectedTab === id
										? "border-blue-500 text-blue-600 bg-blue-50"
										: "border-transparent text-gray-600 hover:text-gray-900 hover:bg-gray-50"
								}`}
							>
								<Icon className="w-4 h-4" />
								{label}
							</button>
						))}
					</div>
				</div>

				{/* Overview Tab */}
				{selectedTab === "overview" && (
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
						<Card>
							<CardHeader className="pb-2">
								<CardTitle className="text-sm font-medium text-gray-600">
									Total Supply
								</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="text-2xl font-bold">
									{tokenData ? formatTotalSupply() : "Loading..."}
								</div>
								<p className="text-xs text-gray-500 mt-1">
									{tokenData?.symbol} tokens
									{tokenData?.balances?.length &&
										tokenData?.balances?.length > 0 &&
										` (${tokenData?.balances.length} holders)`}
								</p>
							</CardContent>
						</Card>

						<Card>
							<CardHeader className="pb-2">
								<CardTitle className="text-sm font-medium text-gray-600">
									Active Holders
								</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="text-2xl font-bold text-green-600">
									{formatNumber(tokenData?.balances.length || 0)}
								</div>
								<p className="text-xs text-green-500 mt-1">
									{loading ? "Calculating..." : "With non-zero balance"}
								</p>
							</CardContent>
						</Card>

						<Card>
							<CardHeader className="pb-2">
								<CardTitle className="text-sm font-medium text-gray-600">
									Total Transfers
								</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="text-2xl font-bold text-blue-600">
									{formatNumber(tokenData?.transfers?.length || 0)}
								</div>
								<p className="text-xs text-blue-500 mt-1">
									Estimated from balances
								</p>
							</CardContent>
						</Card>

						<Card>
							<CardHeader className="pb-2">
								<CardTitle className="text-sm font-medium text-gray-600">
									Decimals
								</CardTitle>
							</CardHeader>
							<CardContent>
								<div className="text-2xl font-bold">{tokenData?.decimals}</div>
								<p className="text-xs text-gray-500 mt-1">Precision level</p>
							</CardContent>
						</Card>
					</div>
				)}

				{/* Holders Tab */}
				{selectedTab === "holders" && (
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
						<Card>
							<CardHeader>
								<CardTitle>Holder Distribution</CardTitle>
								<CardDescription>
									Token distribution across holder tiers
								</CardDescription>
							</CardHeader>
							<CardContent>
								<ResponsiveContainer width="100%" height={300}>
									<PieChart>
										<Pie
											data={holderDistribution}
											cx="50%"
											cy="50%"
											outerRadius={80}
											dataKey="value"
											label={({ name, value }) => `${name}: ${value}%`}
										>
											{holderDistribution.map((entry, index) => (
												<Cell
													key={`cell-${index.toString()}`}
													fill={entry.color}
												/>
											))}
										</Pie>
										<Tooltip />
									</PieChart>
								</ResponsiveContainer>
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle>Top Holders</CardTitle>
								<CardDescription>
									Largest token holders by balance
								</CardDescription>
							</CardHeader>
							<CardContent>
								<div className="space-y-4">
									{topHolders.map((holder) => (
										<div
											key={holder.rank}
											className="flex items-center justify-between p-3 bg-gray-50 rounded-lg"
										>
											<div className="flex items-center gap-3">
												<div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center text-sm font-bold">
													{holder.rank}
												</div>
												<div>
													<code
														className="text-sm cursor-pointer hover:bg-gray-200 px-1 py-0.5 rounded transition-colors"
														onKeyDown={(e) => {
															if (e.key === "Enter") {
																copyToClipboard(holder.address);
															}
														}}
														onClick={() => copyToClipboard(holder.address)}
														title={
															copied
																? "Address copied!"
																: "Click to copy address"
														}
													>
														{`${holder.address.slice(0, 6)}...${holder.address.slice(-4)}`}
													</code>
													<p className="text-xs text-gray-500">
														{holder.percentage}% of supply
													</p>
												</div>
											</div>
											<div className="text-right">
												<div className="font-semibold">
													{formatBalance(holder.balance)}
												</div>
												<div className="text-xs text-gray-500">
													{tokenData?.symbol}
												</div>
											</div>
										</div>
									))}
								</div>
							</CardContent>
						</Card>
					</div>
				)}

				{/* Transactions Tab */}
				{selectedTab === "transactions" && (
					<div className="space-y-6">
						<Card>
							<CardHeader>
								<CardTitle>Transaction Activity (24h)</CardTitle>
								<CardDescription>
									Transfer activity throughout the day
								</CardDescription>
							</CardHeader>
							<CardContent>
								<ResponsiveContainer width="100%" height={300}>
									<AreaChart data={transactionActivity}>
										<CartesianGrid strokeDasharray="3 3" />
										<XAxis dataKey="time" />
										<YAxis />
										<Tooltip />
										<Area
											type="monotone"
											dataKey="transfers"
											stackId="1"
											stroke="#3b82f6"
											fill="#3b82f6"
											fillOpacity={0.6}
										/>
										<Area
											type="monotone"
											dataKey="unique"
											stackId="2"
											stroke="#10b981"
											fill="#10b981"
											fillOpacity={0.6}
										/>
									</AreaChart>
								</ResponsiveContainer>
							</CardContent>
						</Card>

						<Card>
							<CardHeader className="flex flex-row items-center justify-between">
								<div>
									<CardTitle>Recent Transactions</CardTitle>
									<CardDescription>Latest token transfers</CardDescription>
								</div>
								<button
									type="button"
									onClick={exportData}
									className="flex items-center gap-2 px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
								>
									<Download className="w-4 h-4" />
									Export
								</button>
							</CardHeader>
							<CardContent>
								<div className="space-y-3">
									{recentTransactions.map((tx, index) => (
										<div
											key={index.toString()}
											className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 transition-colors"
										>
											<div className="flex items-center gap-4">
												<div className="w-2 h-2 bg-green-400 rounded-full"></div>
												<div>
													<code className="text-sm font-mono">{`${tx.hash.slice(0, 6)}...${tx.hash.slice(-4)}`}</code>
													<div className="text-xs text-gray-500 mt-1">
														{`${tx.from.slice(0, 6)}...${tx.from.slice(-4)}`} →{" "}
														{`${tx.to.slice(0, 6)}...${tx.to.slice(-4)}`}
													</div>
												</div>
											</div>
											<div className="text-right">
												<div className="font-semibold">
													{formatBalance(tx.value)} {tokenData?.symbol}
												</div>
												<div className="text-xs text-gray-500">
													{tx.timestamp}
												</div>
											</div>
										</div>
									))}
								</div>
							</CardContent>
						</Card>
					</div>
				)}

				{/* Analytics Tab */}
				{selectedTab === "analytics" && (
					<div className="space-y-6">
						<Card>
							<CardHeader>
								<CardTitle>Holder Growth</CardTitle>
								<CardDescription>
									Number of unique holders over time
								</CardDescription>
							</CardHeader>
							<CardContent>
								<ResponsiveContainer width="100%" height={300}>
									<LineChart data={dailyStats}>
										<CartesianGrid strokeDasharray="3 3" />
										<XAxis dataKey="date" />
										<YAxis />
										<Tooltip />
										<Line
											type="monotone"
											dataKey="holders"
											stroke="#8b5cf6"
											strokeWidth={2}
										/>
									</LineChart>
								</ResponsiveContainer>
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<CardTitle>Daily Transaction Volume</CardTitle>
								<CardDescription>
									Number of transactions per day
								</CardDescription>
							</CardHeader>
							<CardContent>
								<ResponsiveContainer width="100%" height={300}>
									<BarChart data={dailyStats}>
										<CartesianGrid strokeDasharray="3 3" />
										<XAxis dataKey="date" />
										<YAxis />
										<Tooltip />
										<Bar dataKey="transactions" fill="#f59e0b" />
									</BarChart>
								</ResponsiveContainer>
							</CardContent>
						</Card>
					</div>
				)}

				{/* Portfolio Tab */}
				{selectedTab === "portfolio" && (
					<div className="max-w-2xl mx-auto">
						<Card>
							<CardHeader>
								<CardTitle>My Portfolio</CardTitle>
								<CardDescription>
									Track your token holdings and transactions
								</CardDescription>
							</CardHeader>
							<CardContent className="space-y-6">
								<div>
									<label
										htmlFor="user-address"
										className="block text-sm font-medium text-gray-700 mb-2"
									>
										Your Address
									</label>
									<div className="flex gap-2">
										<input
											id="user-address"
											type="text"
											value={userAddress}
											onChange={(e) => setUserAddress(e.target.value)}
											placeholder="0x..."
											className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
										/>
										<button
											type="button"
											onClick={() => refetchUserData()}
											className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center gap-2"
										>
											<Search className="w-4 h-4" />
											Search
										</button>
									</div>
								</div>

								{userAddress && tokenUserData && (
									<div className="p-4 bg-blue-50 rounded-lg">
										<h3 className="font-semibold text-blue-900 mb-2">
											Portfolio Summary
										</h3>
										<div className="grid grid-cols-2 gap-4">
											<div>
												<p className="text-sm text-blue-600">Balance</p>
												<p className="text-xl font-bold text-blue-900">
													{tokenUserData.data?.AccountBalance[0]?.balance || 0}{" "}
													{tokenData?.symbol}
												</p>
											</div>
											<div>
												<p className="text-sm text-blue-600">Transactions</p>
												<p className="text-xl font-bold text-blue-900">47</p>
											</div>
										</div>
									</div>
								)}
							</CardContent>
						</Card>
					</div>
				)}
			</div>
		</div>
	);
};

const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			staleTime: 5 * 60 * 1000, // 5 minutes
		},
	},
});

const root = document.getElementById("root");
if (!root) {
	throw new Error("Root element not found");
}

ReactDOM.createRoot(root).render(
	<React.StrictMode>
		<WagmiProvider config={config}>
			<QueryClientProvider client={queryClient}>
				<RainbowKitProvider>
					<ApolloProvider client={client}>
						<App />
						<Toaster />
					</ApolloProvider>
				</RainbowKitProvider>
			</QueryClientProvider>
		</WagmiProvider>
	</React.StrictMode>,
);
