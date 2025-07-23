import { Buffer } from "buffer";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import React from "react";
import ReactDOM from "react-dom/client";
import {
	useAccount,
	WagmiProvider,
} from "wagmi";

import { config } from "./rainbow.ts";

import "./index.css";
import "@rainbow-me/rainbowkit/styles.css";
import { RainbowKitProvider, ConnectButton } from "@rainbow-me/rainbowkit";
import { Button, Toaster } from "@/components/ui";
import { createRootRoute, createRoute, createRouter, Link, Outlet, redirect, RouterProvider } from '@tanstack/react-router'

globalThis.Buffer = Buffer;

const queryClient = new QueryClient();

const root = document.getElementById("root");
if (!root) {
	throw new Error("Root element not found");
}

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
		return (
			<div className="bg-white rounded-lg p-6 flex items-center gap-2 text-left shadow-2xl flex-col">
				<h1 className="w-full">Swap</h1>
				<div className="flex flex-col items-start justify-center w-full border border-gray-300 rounded-lg p-4 gap-2">
					<span>Sell</span>
					<div className="flex items-center gap-2 w-full">
						<input type="text" className=" rounded-lg p-2 w-full" placeholder="0.0" />
						<div className="flex items-center gap-1 bg-gray-100 rounded-lg px-2 py-1">
							<span className="text-gray-500">ETH</span>
						</div>
					</div>
					<span>0 $</span>
				</div>

				<div className="size-8">
					<svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-gray-500 bg-gray-300 rounded-lg p-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
					</svg>
				</div>

				<div className="flex flex-col items-start justify-center w-full border border-gray-300 rounded-lg p-4 gap-2">
					<span>Buy</span>
					<div className="flex items-center gap-2 w-full">
						<input type="text" className=" rounded-lg p-2 w-full" placeholder="0.0" />
						<div className="flex items-center gap-1 bg-gray-100 rounded-lg px-2 py-1">
							<span className="text-gray-500">ETH</span>
						</div>
					</div>
					<span>0 $</span>
				</div>

				<Button className="w-full mt-4 bg-gray-500 text-white hover:bg-gray-600 transition-colors">
					Swap
				</Button>
			</div>
		);
	},
});

const addLiquidityRoute = createRoute({
	getParentRoute: () => appRoute,
	path: '/add-liquidity',
	component: () => {
		return (
			<div className="bg-white rounded-lg p-6 flex items-center gap-2 text-left shadow-2xl flex-col">
				<h1 className="w-full">Add Liquidity</h1>
				<div className="flex flex-col items-start justify-center w-full border border-gray-300 rounded-lg p-4 gap-2">
					<span>Token A</span>
					<div className="flex items-center gap-2 w-full">
						<input type="text" className="rounded-lg p-2 w-full" placeholder="0.0" />
						<div className="flex items-center gap-1 bg-gray-100 rounded-lg px-2 py-1">
							<span className="text-gray-500">ETH</span>
						</div>
					</div>
					<span>0 $</span>
				</div>

				<div className="size-8">
					<svg xmlns="http://www.w3.org/2000/svg" className="w-8 h-8 text-gray-500 bg-gray-300 rounded-lg p-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
						<path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
					</svg>
				</div>

				<div className="flex flex-col items-start justify-center w-full border border-gray-300 rounded-lg p-4 gap-2">
					<span>Token B</span>
					<div className="flex items-center gap-2 w-full">
						<input type="text" className="rounded-lg p-2 w-full" placeholder="0.0" />
						<div className="flex items-center gap-1 bg-gray-100 rounded-lg px-2 py-1">
							<span className="text-gray-500">USDC</span>
						</div>
					</div>
					<span>0 $</span>
				</div>

				<Button className="w-full mt-4 bg-blue-500 text-white hover:bg-blue-600 transition-colors">
					Add Liquidity
				</Button>
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
