import Cookies from "universal-cookie";

export function getWalletFromWagmiStore() {
  const cookies = new Cookies();
  const wagmiCookie = cookies.get("wagmi.store");
  let address = "";
  if (wagmiCookie?.state) {
    const connections = wagmiCookie.state.connections.value;
    if (Array.isArray(connections) && connections.length > 0) {
      address = connections[0][1].accounts[0]; // first element of the array is always the current account used
    }
  }

  return address;
}
