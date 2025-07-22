export default [
	{
		type: "constructor",
		inputs: [],
		stateMutability: "nonpayable",
	},
	{
		type: "function",
		name: "THRESHOLD",
		inputs: [],
		outputs: [
			{
				name: "",
				type: "uint256",
				internalType: "uint256",
			},
		],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "buyTokens",
		inputs: [
			{
				name: "amountOutMin",
				type: "uint256",
				internalType: "uint256",
			},
		],
		outputs: [
			{
				name: "amountOut",
				type: "uint256",
				internalType: "uint256",
			},
		],
		stateMutability: "payable",
	},
	{
		type: "function",
		name: "ethSupply",
		inputs: [],
		outputs: [
			{
				name: "",
				type: "uint256",
				internalType: "uint256",
			},
		],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "getEthersOutAtCurrentSupply",
		inputs: [
			{
				name: "amountIn",
				type: "uint256",
				internalType: "uint256",
			},
		],
		outputs: [
			{
				name: "amountOut",
				type: "uint256",
				internalType: "uint256",
			},
		],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "getTokensOutAtCurrentSupply",
		inputs: [
			{
				name: "amountIn",
				type: "uint256",
				internalType: "uint256",
			},
		],
		outputs: [
			{
				name: "amountOut",
				type: "uint256",
				internalType: "uint256",
			},
		],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "initialize",
		inputs: [
			{
				name: "_tokenAddress",
				type: "address",
				internalType: "address",
			},
			{
				name: "_uniswapRouter",
				type: "address",
				internalType: "address",
			},
		],
		outputs: [],
		stateMutability: "nonpayable",
	},
	{
		type: "function",
		name: "isMigrated",
		inputs: [],
		outputs: [
			{
				name: "",
				type: "bool",
				internalType: "bool",
			},
		],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "sellTokens",
		inputs: [
			{
				name: "amountIn",
				type: "uint256",
				internalType: "uint256",
			},
			{
				name: "amountOutMin",
				type: "uint256",
				internalType: "uint256",
			},
		],
		outputs: [
			{
				name: "amountOut",
				type: "uint256",
				internalType: "uint256",
			},
		],
		stateMutability: "nonpayable",
	},
	{
		type: "function",
		name: "token",
		inputs: [],
		outputs: [
			{
				name: "",
				type: "address",
				internalType: "contract IERC20",
			},
		],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "tokenSupply",
		inputs: [],
		outputs: [
			{
				name: "",
				type: "uint256",
				internalType: "uint256",
			},
		],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "tokensLiquidity",
		inputs: [],
		outputs: [
			{
				name: "",
				type: "uint256",
				internalType: "uint256",
			},
		],
		stateMutability: "view",
	},
	{
		type: "function",
		name: "uniswapRouter",
		inputs: [],
		outputs: [
			{
				name: "",
				type: "address",
				internalType: "contract IUniswapV2Router02",
			},
		],
		stateMutability: "view",
	},
	{
		type: "event",
		name: "Initialized",
		inputs: [
			{
				name: "version",
				type: "uint64",
				indexed: false,
				internalType: "uint64",
			},
		],
		anonymous: false,
	},
	{
		type: "event",
		name: "LiquidityMigration",
		inputs: [
			{
				name: "pair",
				type: "address",
				indexed: true,
				internalType: "address",
			},
			{
				name: "ethAmount",
				type: "uint256",
				indexed: false,
				internalType: "uint256",
			},
			{
				name: "tokenAmount",
				type: "uint256",
				indexed: false,
				internalType: "uint256",
			},
		],
		anonymous: false,
	},
	{
		type: "event",
		name: "TokenPurchase",
		inputs: [
			{
				name: "recipient",
				type: "address",
				indexed: true,
				internalType: "address",
			},
			{
				name: "ethAmountSent",
				type: "uint256",
				indexed: false,
				internalType: "uint256",
			},
			{
				name: "tokenAmountReceived",
				type: "uint256",
				indexed: false,
				internalType: "uint256",
			},
		],
		anonymous: false,
	},
	{
		type: "event",
		name: "TokenSale",
		inputs: [
			{
				name: "recipient",
				type: "address",
				indexed: true,
				internalType: "address",
			},
			{
				name: "tokenAmountSent",
				type: "uint256",
				indexed: false,
				internalType: "uint256",
			},
			{
				name: "ethAmountReceived",
				type: "uint256",
				indexed: false,
				internalType: "uint256",
			},
		],
		anonymous: false,
	},
	{
		type: "error",
		name: "FailedCall",
		inputs: [],
	},
	{
		type: "error",
		name: "FormulaInvalidTokenAmount",
		inputs: [],
	},
	{
		type: "error",
		name: "InsufficientBalance",
		inputs: [
			{
				name: "balance",
				type: "uint256",
				internalType: "uint256",
			},
			{
				name: "needed",
				type: "uint256",
				internalType: "uint256",
			},
		],
	},
	{
		type: "error",
		name: "InvalidInitialization",
		inputs: [],
	},
	{
		type: "error",
		name: "LaunchpadInsufficientInputAmount",
		inputs: [],
	},
	{
		type: "error",
		name: "LaunchpadInsufficientLiquidity",
		inputs: [],
	},
	{
		type: "error",
		name: "LaunchpadInsufficientOutputAmount",
		inputs: [],
	},
	{
		type: "error",
		name: "LaunchpadInvalidAddress",
		inputs: [],
	},
	{
		type: "error",
		name: "LaunchpadInvalidState",
		inputs: [],
	},
	{
		type: "error",
		name: "NotInitializing",
		inputs: [],
	},
	{
		type: "error",
		name: "ReentrancyGuardReentrantCall",
		inputs: [],
	},
	{
		type: "error",
		name: "SafeERC20FailedOperation",
		inputs: [
			{
				name: "token",
				type: "address",
				internalType: "address",
			},
		],
	},
] as const;
