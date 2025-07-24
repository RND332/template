import { gql } from "graphql-request";

export const GET_LAUNCHPAD_QUERY = gql`
  query GetLaunchpad($id: String!) {
    Launchpad_by_pk(id: $id) {
      token {
        decimals
        id
        name
        symbol
      }
      creator_id
      id
      totalEthRaised
    }
  }
`;

export const GET_TRANSFERS = gql`
  query Trades($id: String!) {
    Trade(where: {launchpad_id: {_eq:$  id}}) {
      id
      timestamp
      tokenAmount
      ethAmount
    }
  }
`;

export interface Trade {
	id: string;
	timestamp: string;
	tokenAmount: string;
	ethAmount: string;
}

export interface TransfersData {
	Trade: Trade[]; // Изменилось с transfers на Trade
}
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

export const LAUNCHPAD_GQL_ENDPOINT =
	"https://launchpad-ai.cytonic.com/v1/graphql";
