
import { usePrivy } from '@privy-io/react-auth';
import { Button } from './Utilities/Button';
import EthereumAddressToENSAvatar from "./EthereumAddressToENSAvatar";
import EthereumAddressToENSName from "./EthereumAddressToENSName";
import { useWallets } from '@privy-io/react-auth';
import { useSetActiveWallet } from '@privy-io/wagmi';
import { useEffect } from 'react';
import { UserPill } from '@privy-io/react-auth/ui';


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
                    return <div className="flex flex-row gap-2 items-center">
                        <UserPill expanded />
                        <EthereumAddressToENSAvatar
                            address={user?.wallet?.address}
                            className="h-8 w-8 rounded-full"
                        />
                    </div>
                }

            })()}
        </div>
    );
}