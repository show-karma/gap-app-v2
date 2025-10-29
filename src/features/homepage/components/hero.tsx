import { Button } from "@/components/ui/button";
import Image from "next/image";
import { InfiniteSlider } from "./infinite-slider";
import { chosenCommunities } from "@/utilities/chosenCommunities";
import { ArrowRightIcon } from "@heroicons/react/20/solid";
import Link from "next/link";
import { PAGES } from "@/utilities/pages";

const users = ['/images/homepage/user1.jpg', '/images/homepage/user2.png', '/images/homepage/user3.png']

const items = chosenCommunities().map((community) => ({
    text: community.name,
    image: community.imageURL,
}))

export function Hero() {
    return (
        <section className="flex flex-col items-start justify-start gap-12 py-8 px-8 min-h-screen border-b border-zinc-200 dark:border-zinc-800">
            <div className="flex flex-col items-start justify-center gap-4">
                <h1 className="text-brand-black dark:text-white text-[40px] lg:text-5xl font-semibold leading-tight"
                    style={{
                        lineHeight: '100%',
                        letterSpacing: '-2%',
                    }}
                >Where builders get funded and ecosystems grow</h1>
                <p className="text-zinc-600 dark:text-zinc-400 text-sm sm:text-base font-medium">Ecosystems use Karma to fund projects transparently. Builders use it to share progress, earn reputation, and get discovered for more opportunities.</p>
                <div className="flex flex-col gap-4">
                    {/* TODO: Add interactions to the buttons */}
                    <Button className="px-6 py-2.5 text-sm font-medium w-max">Create project</Button>
                    <Button variant='outline' className="px-6 py-2.5 text-sm font-medium">Run a funding program</Button>
                </div>
                <div className="flex flex-row items-center justify-start gap-4 mt-6">
                    <div className="flex flex-row items-center justify-start gap-2">
                        {users.map((user, index) => (
                            <Image key={user} src={user} alt="User" width={24} height={24} className="rounded-full w-6 h-6 bg-white border border-zinc-200 dark:border-zinc-800"
                                style={{
                                    marginRight: users.length - 1 === index ? '0' : '-16px',
                                    zIndex: users.length + index + 1,
                                }}
                            />
                        ))}
                    </div>
                    <p className="text-black dark:text-white text-sm font-medium">4k+ projects raised funding on Karma </p>
                </div>
            </div>

            {/* Infinite sliding pills section */}
            <div className="w-full my-10 -mx-8">
                <InfiniteSlider items={items} duration={120} />
            </div>

            <div className="w-full flex flex-row items-center justify-center">

                <div className="flex flex-row items-center justify-center gap-8">
                    <p className="text-zinc-600 dark:text-zinc-400 text-base font-medium">Communities on Karma</p>
                    <Link href={PAGES.COMMUNITIES} className="px-2 flex flex-row items-center gap-2 text-sm font-semibold border-none shadow-none">
                        View all
                        <ArrowRightIcon className="w-4 h-4" />
                    </Link>
                </div>
            </div>

        </section>
    );
}