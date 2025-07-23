import { getDefaultConfig } from "@rainbow-me/rainbowkit";
import { cytonic } from "./cytonic";
import { monadTestnet } from "viem/chains";

export const config = getDefaultConfig({
	appName: "Cytonic App",
	projectId: "YOUR_PROJECT_KEY",
	chains: [cytonic, monadTestnet],
});

declare module "wagmi" {
	interface Register {
		config: typeof config;
	}
}
