import { GraphQLClient, gql } from "graphql-request";

// TypeScript type definitions based on the GraphQL schema
export interface Pool {
	id: string;
	balances: AccountBalance[];
	mints: Mint[];
	burns: Burn[];
	swaps: Swap[];
	token0: Token;
	reserve0: string; // BigInt as string
	token1: Token;
	reserve1: string; // BigInt as string
}

export interface Token {
	id: string;
	name: string;
	symbol: string;
	decimals: number;
}

export interface Account {
	id: string;
	balances: AccountBalance[];
	mints: Mint[];
	burns: Burn[];
	swaps: Swap[];
}

export interface AccountBalance {
	id: string;
	balance: string; // BigInt as string
	account: string;
	token: Token;
}

export interface Mint {
	id: string; // <transaction hash>-<log index>
	tx_hash: string;
	pool: string;
	trader: Account;
	amountIn0: string; // BigInt as string
	amountIn1: string; // BigInt as string
	amountOut: string; // BigInt as string
}

export interface Burn {
	id: string; // <transaction hash>-<log index>
	tx_hash: string;
	pool: string;
	trader: Account;
	to: Account;
	amountOut0: string; // BigInt as string
	amountOut1: string; // BigInt as string
	amountIn: string; // BigInt as string
}

export interface Swap {
	id: string; // <transaction hash>-<log index>
	tx_hash: string;
	pool: string;
	trader: Account;
	to: Account;
	amount0In: string; // BigInt as string
	amount1In: string; // BigInt as string
	amount0Out: string; // BigInt as string
	amount1Out: string; // BigInt as string
}

// Query response types
export interface GetPoolsResponse {
	pools: Pool[];
}

export interface GetPoolDetailsResponse {
	pool: Pool;
}

export interface GetAccountBalancesResponse {
	account: Account;
}

export interface GetRecentSwapsResponse {
	swaps: Swap[];
}

export interface GetMintsByTxResponse {
	mints: Mint[];
}

export interface GetTokensResponse {
	tokens: Token[];
}

export interface GetFilteredSwapsResponse {
	swaps: Swap[];
}

// Query variables types
export interface GetPoolsVariables {
	limit?: number;
}

export interface GetPoolDetailsVariables {
	poolId: string;
}

export interface GetAccountBalancesVariables {
	accountId: string;
}

export interface GetRecentSwapsVariables {
	limit?: number;
}

export interface GetMintsByTxVariables {
	txHash: string;
}

export interface GetTokensVariables {
	limit?: number;
}

export interface GetFilteredSwapsVariables {
	limit?: number;
	offset?: number;
	where?: SwapBoolExp;
	order_by?: SwapOrderBy[];
}

// Filter and ordering types for Hasura-style GraphQL
export interface SwapBoolExp {
	pool?: { _eq?: string };
	trader?: { _eq?: string };
	to?: { _eq?: string };
	tx_hash?: { _eq?: string };
	amount0In?: { _gt?: string; _lt?: string; _gte?: string; _lte?: string };
	amount1In?: { _gt?: string; _lt?: string; _gte?: string; _lte?: string };
	amount0Out?: { _gt?: string; _lt?: string; _gte?: string; _lte?: string };
	amount1Out?: { _gt?: string; _lt?: string; _gte?: string; _lte?: string };
	_and?: SwapBoolExp[];
	_or?: SwapBoolExp[];
}

export interface SwapOrderBy {
	id?: "asc" | "desc";
	tx_hash?: "asc" | "desc";
	amount0In?: "asc" | "desc";
	amount1In?: "asc" | "desc";
	amount0Out?: "asc" | "desc";
	amount1Out?: "asc" | "desc";
}

// Initialize the client
const client = new GraphQLClient("https://univ2-ai.cytonic.com/v1/graphql");

// IMPORTANT: Before using any queries, run this to find the correct field names:
/*
// Step 1: Discover available fields
await discoverSchema() // or await discoverSchemaSimple() if the first fails

// Step 2: Look for field names that might represent your entities:
// Common variations for pools: pools, pool, liquidityPools, pairs, markets
// Common variations for tokens: tokens, token, tokenEntities
// Common variations for accounts: accounts, account, users, user

// Step 3: Update the queries below with the correct field names
*/

// 1. Query pools with their tokens and reserves
const getPoolsQuery = gql`
  query GetPools($limit: Int = 10) {
    Pool(limit: $limit) {
      id
      reserve0
      reserve1
      token0 {
        id
        name
        symbol
        decimals
      }
      token1 {
        id
        name
        symbol
        decimals
      }
    }
  }
`;

// 2. Query a specific pool with all related data
const getPoolDetailsQuery = gql`
  query GetPoolDetails($poolId: String!) {
    Pool_by_pk(id: $poolId) {
      id
      reserve0
      reserve1
      token0 {
        id
        name
        symbol
        decimals
      }
      token1 {
        id
        name
        symbol
        decimals
      }
      mints(limit: 10, order_by: {id: desc}) {
        id
        tx_hash
        trader {
          id
        }
        amountIn0
        amountIn1
        amountOut
      }
      burns(limit: 10, order_by: {id: desc}) {
        id
        tx_hash
        trader {
          id
        }
        to {
          id
        }
        amountOut0
        amountOut1
        amountIn
      }
      swaps(limit: 10, order_by: {id: desc}) {
        id
        tx_hash
        trader {
          id
        }
        to {
          id
        }
        amount0In
        amount1In
        amount0Out
        amount1Out
      }
    }
  }
`;

// 3. Query account balances
const getAccountBalancesQuery = gql`
  query GetAccountBalances($accountId: String!) {
    Account_by_pk(id: $accountId) {
      id
      balances {
        id
        balance
        token {
          id
          name
          symbol
          decimals
        }
      }
    }
  }
`;

// 4. Query recent swaps across all pools
const getRecentSwapsQuery = gql`
  query GetRecentSwaps($limit: Int = 20) {
    Swap(limit: $limit, order_by: {id: desc}) {
      id
      tx_hash
      pool
      trader {
        id
      }
      to {
        id
      }
      amount0In
      amount1In
      amount0Out
      amount1Out
    }
  }
`;

// 5. Query mints by transaction hash
const getMintsByTxQuery = gql`
  query GetMintsByTx($txHash: String!) {
    Mint(where: { tx_hash: { _eq: $txHash } }) {
      id
      tx_hash
      pool
      trader {
        id
      }
      amountIn0
      amountIn1
      amountOut
    }
  }
`;

// 6. Query all tokens
const getTokensQuery = gql`
  query GetTokens($limit: Int = 100) {
    Token(limit: $limit) {
      id
      name
      symbol
      decimals
    }
  }
`;

// 7. Query with filtering and pagination
const getFilteredSwapsQuery = gql`
  query GetFilteredSwaps(
    $limit: Int = 10
    $offset: Int = 0
    $where: Swap_bool_exp
    $order_by: [Swap_order_by!]
  ) {
    Swap(
      limit: $limit
      offset: $offset
      where: $where
      order_by: $order_by
    ) {
      id
      tx_hash
      pool
      trader {
        id
      }
      amount0In
      amount1In
      amount0Out
      amount1Out
    }
  }
`;

// Typed query functions
export async function fetchPools(
	variables: GetPoolsVariables = {},
): Promise<Pool[]> {
	try {
		const data = await client.request<GetPoolsResponse, GetPoolsVariables>(
			getPoolsQuery,
			variables,
		);
		console.log("Pools:", data.pools);
		return data.pools;
	} catch (error) {
		console.error("Error fetching pools:", error);
		throw error;
	}
}

export async function fetchPoolDetails(
	variables: GetPoolDetailsVariables,
): Promise<Pool> {
	try {
		const data = await client.request<
			GetPoolDetailsResponse,
			GetPoolDetailsVariables
		>(getPoolDetailsQuery, variables);
		console.log("Pool details:", data.pool);
		return data.pool;
	} catch (error) {
		console.error("Error fetching pool details:", error);
		throw error;
	}
}

export async function fetchAccountBalances(
	variables: GetAccountBalancesVariables,
): Promise<Account> {
	try {
		const data = await client.request<
			GetAccountBalancesResponse,
			GetAccountBalancesVariables
		>(getAccountBalancesQuery, variables);
		console.log("Account balances:", data.account);
		return data.account;
	} catch (error) {
		console.error("Error fetching account balances:", error);
		throw error;
	}
}

export async function fetchRecentSwaps(
	variables: GetRecentSwapsVariables = {},
): Promise<Swap[]> {
	try {
		const data = await client.request<
			GetRecentSwapsResponse,
			GetRecentSwapsVariables
		>(getRecentSwapsQuery, variables);
		console.log("Recent swaps:", data.swaps);
		return data.swaps;
	} catch (error) {
		console.error("Error fetching recent swaps:", error);
		throw error;
	}
}

export async function fetchMintsByTransaction(
	variables: GetMintsByTxVariables,
): Promise<Mint[]> {
	try {
		const data = await client.request<
			GetMintsByTxResponse,
			GetMintsByTxVariables
		>(getMintsByTxQuery, variables);
		console.log("Mints for transaction:", data.mints);
		return data.mints;
	} catch (error) {
		console.error("Error fetching mints:", error);
		throw error;
	}
}

export async function fetchTokens(
	variables: GetTokensVariables = {},
): Promise<Token[]> {
	try {
		const data = await client.request<GetTokensResponse, GetTokensVariables>(
			getTokensQuery,
			variables,
		);
		console.log("Tokens:", data.tokens);
		return data.tokens;
	} catch (error) {
		console.error("Error fetching tokens:", error);
		throw error;
	}
}

export async function fetchFilteredSwaps(
	variables: GetFilteredSwapsVariables = {},
): Promise<Swap[]> {
	try {
		const data = await client.request<
			GetFilteredSwapsResponse,
			GetFilteredSwapsVariables
		>(getFilteredSwapsQuery, variables);
		return data.swaps;
	} catch (error) {
		console.error("Error fetching filtered swaps:", error);
		throw error;
	}
}

// Convenience function for fetching swaps for a specific pool
export async function fetchSwapsForPool(
	poolId: string,
	limit: number = 10,
): Promise<Swap[]> {
	return fetchFilteredSwaps({
		first: limit,
		where: { pool: poolId },
		orderBy: "id",
		orderDirection: "desc",
	});
}

// Usage examples with proper typing:
/*
// FIRST: Discover the correct field names in your schema
await discoverSchema()

// Common field name variations you might see:
// - pools, pool (singular vs plural)
// - poolEntities, poolEntity
// - liquidityPools, liquidityPool
// - pairs, pair (for AMM/DEX subgraphs)

// Once you know the correct field names, update the queries above
// For example, if the field is called 'liquidityPools':
const correctPoolsQuery = gql`
  query GetPools($first: Int = 10) {
    liquidityPools(first: $first) {
      id
      reserve0
      reserve1
      token0 {
        id
        name
        symbol
        decimals
      }
      token1 {
        id
        name
        symbol
        decimals
      }
    }
  }
`

// Fetch first 5 pools
const pools = await fetchPools({ first: 5 })

// Fetch specific pool details
const pool = await fetchPoolDetails({ poolId: '0x...' })

// Fetch account balances
const account = await fetchAccountBalances({ accountId: '0x...' })

// Fetch recent swaps
const swaps = await fetchRecentSwaps({ first: 10 })

// Fetch mints by transaction
const mints = await fetchMintsByTransaction({ txHash: '0x...' })

// Fetch swaps for specific pool with filtering
const poolSwaps = await fetchSwapsForPool('0x...', 20)

// Advanced filtering
const filteredSwaps = await fetchFilteredSwaps({
  first: 50,
  where: {
    pool: '0x...',
    amount0In_gt: '1000000000000000000' // > 1 token (18 decimals)
  },
  orderBy: 'amount0In',
  orderDirection: 'desc'
})
*/
