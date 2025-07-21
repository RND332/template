import { useAccount, useConnect, useDisconnect } from "wagmi";
import { ConnectButton } from "@rainbow-me/rainbowkit";

function App() {
  return (
    <>
      <ConnectButton />
    </>
  );
}

export default App;
