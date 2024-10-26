
import { usePrivy } from '@privy-io/react-auth';
import { Button } from './Utilities/Button';
import EthereumAddressToENSAvatar from "./EthereumAddressToENSAvatar";
import EthereumAddressToENSName from "./EthereumAddressToENSName";
import { useWallets } from '@privy-io/react-auth';
import { useSetActiveWallet } from '@privy-io/wagmi';
import { useEffect } from 'react';



export default function LoginWithPrivy() {
    const {
        user,
        ready,
        authenticated,
        login, logout
    } = usePrivy();
    const { wallets } = useWallets();
    const { setActiveWallet } = useSetActiveWallet();

    useEffect(() => {
        async function activateWallet() {
            if (wallets.length > 0) {
                await setActiveWallet(wallets[0]);
            }
        }
        activateWallet();
    }, [wallets]);

    return (
        <div
            {...(!ready && !authenticated && {
                "aria-hidden": true,
                style: {
                    opacity: 0,
                    pointerEvents: "none",
                    userSelect: "none",
                },
            })}
        >
            {(() => {
                if (!user || wallets.length === 0 || !authenticated) {
                    return (
                        <button
                            onClick={login}
                            type="button"
                            className="rounded-md border max-lg:w-full max-lg:justify-center border-brand-blue dark:bg-zinc-900 dark:text-blue-500 bg-white px-3 py-2 text-sm font-semibold text-brand-blue  hover:bg-opacity-75 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
                        >
                            Login / Register
                        </button>
                    );
                } else {
                    return <Button
                        onClick={logout}
                        className="flex w-full py-1 justify-center items-center flex-row gap-2 rounded-full bg-gray-500 text-sm font-semibold text-white  hover:bg-gray-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
                    >
                        <EthereumAddressToENSName address={user?.wallet?.address} />
                        <EthereumAddressToENSAvatar
                            address={user?.wallet?.address}
                            className="h-8 w-8 rounded-full"
                        />
                    </Button>
                }

            })()}
        </div>
    );
}