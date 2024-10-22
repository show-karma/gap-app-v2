
import { usePrivy } from '@privy-io/react-auth';
import { useAccount } from 'wagmi';
import { Button } from './Button';
import EthereumAddressToENSAvatar from "../EthereumAddressToENSAvatar";
import EthereumAddressToENSName from "../EthereumAddressToENSName";


export default function LoginWithPrivy() {
    const { chain, address } = useAccount();
    const {
        user: privyUser,
        ready: privyMounted,
        authenticated: privyAuthenticated,
        login: loginWithPrivy, logout: logoutWithPrivy }
        = usePrivy();
    // Disable login when Privy is not ready or the user is already authenticated
    const disableLogin = !privyMounted || (privyMounted && privyAuthenticated);
    const ready = privyMounted && privyAuthenticated;
    const connected = ready && address && chain && (!privyAuthenticated);

    return (
        <div
            {...(!ready && {
                "aria-hidden": true,
                style: {
                    opacity: 0,
                    pointerEvents: "none",
                    userSelect: "none",
                },
            })}
        >
            {(() => {
                if (!connected) {
                    return (
                        <button
                            onClick={loginWithPrivy}
                            type="button"
                            className="rounded-md border max-lg:w-full max-lg:justify-center border-brand-blue dark:bg-zinc-900 dark:text-blue-500 bg-white px-3 py-2 text-sm font-semibold text-brand-blue  hover:bg-opacity-75 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
                        >
                            Login / Register
                        </button>
                    );
                }

                return (
                    <Button
                        onClick={logoutWithPrivy}
                        className="flex w-full py-1 justify-center items-center flex-row gap-2 rounded-full bg-gray-500 text-sm font-semibold text-white  hover:bg-gray-600 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-600"
                    >
                        <EthereumAddressToENSName address={address} />

                        <EthereumAddressToENSAvatar
                            address={address}
                            className="h-8 w-8 rounded-full"
                        />
                    </Button>
                );
            })()}
        </div>
    );
}