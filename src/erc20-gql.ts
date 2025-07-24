import { gql } from "graphql-request";

export const GET_TOP_HOLDERS = gql`
    query GetTopHolders($id: String!) {
    Token(where:{id:{_eq:"0x91272F5Eed03DfB2e6D90597Db90Ab20200fad56"}}) {
    balances(order_by: {balance: asc}) {
      balance
      account_id
    }
  }
  }
 
`;

export interface LaunchpadDataById {
	Launchpad_by_pk: {
		token: {
			decimals: number;
			id: string;
			name: string;
			symbol: string;
		};
		creator_id: string;
		id: string;
		totalEthRaised: string;
	} | null;
}

export const ERC20_GQL_ENDPOINT =
	"https://erc20-indexer-ai.cytonic.com/v1/graphql";
