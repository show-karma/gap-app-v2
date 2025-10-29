import { Bars3Icon } from "@heroicons/react/24/solid";
import Image from "next/image";
import Link from "next/link";

export function Navbar() {
    return (
        <nav className="flex justify-between items-center px-8 py-6 h-[80px] border-b border-b-zinc-100">
            <Link
                className="flex-shrink-0 max-w-[180px] max-h-[40px]"
                href="/"
            >
                <Image
                    className="block w-full h-auto dark:hidden"
                    src="/logo/karma-gap-logo.svg"
                    alt="Gap"
                    width={126}
                    height={32}
                    priority={true}
                    quality={100}
                />
                <Image
                    className="hidden w-full h-auto dark:block"
                    src="/logo/karma-gap-logo-white.svg"
                    alt="Gap"
                    width={126}
                    height={32}
                    priority={true}
                />
            </Link>
            <Bars3Icon className="w-8 h-8 text-gray-500" />
        </nav>
    );
}