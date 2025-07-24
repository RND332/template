import { gql } from "graphql-request";

export const GET_LAUNCHPAD_QUERY = gql`
   query GetLaunchpad {
    Launchpad {
        id
        totalEthRaised
        token {
        id
        name
        symbol
        decimals
        }
        migrationInfo {
        id
        tx_hash
        ethAmount
        tokenAmount
        pairAddress
        timestamp
        }
        creator {
        id
        }
    }
}

`;

export const GRAPHQL_ENDPOINT = "https://launchpad-ai.cytonic.com/v1/graphql";
