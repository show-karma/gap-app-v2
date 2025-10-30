import { Button } from "@/components/ui/button";
import Image from "next/image";
import { InfiniteMovingCards } from "@/src/components/ui/infinite-moving-cards";
import { chosenCommunities } from "@/utilities/chosenCommunities";
import { ArrowRightIcon } from "@heroicons/react/20/solid";
import Link from "next/link";
import { PAGES } from "@/utilities/pages";
import { cn } from "@/utilities/tailwind";
import { homepageTheme } from "@/src/helper/theme";
import { CreateProjectButton } from "./create-project-button";

const users = ['/images/homepage/user1.jpg', '/images/homepage/user2.png', '/images/homepage/user3.png']

const items = chosenCommunities().map((community) => ({
    text: community.name,
    image: community.imageURL,
}))

export function Hero() {
    return (
        <section className={cn(homepageTheme.padding, "flex flex-col items-start justify-start gap-12 flex-1 border-b border-border")}>
            <div className="flex flex-row items-center justify-between gap-10 w-full">
                <div className="flex flex-col items-start justify-center gap-4 max-w-full lg:max-w-lg 2xl:max-w-2xl">
                    <h1 className="text-foreground text-[40px] lg:text-5xl font-semibold leading-none tracking-[-0.02em]">
                        Where builders get funded and ecosystems grow
                    </h1>
                    <p className="text-muted-foreground text-sm sm:text-base font-medium">Ecosystems use Karma to fund projects transparently. Builders use it to share progress, earn reputation, and get discovered for more opportunities.</p>
                    <div className="flex flex-col md:flex-row gap-3 md:gap-4">
                        <CreateProjectButton />
                        <Button variant='outline' className="px-6 py-2.5 text-sm font-medium border border-border-3">Run a funding program</Button>
                    </div>
                    <div className="flex flex-row items-center justify-start gap-10 md:gap-4 mt-6">
                        <div className="flex flex-row items-center justify-start gap-2">
                            {users.map((user, index) => {
                                const zIndexClasses = {
                                    0: "z-[4]",
                                    1: "z-[5]",
                                    2: "z-[6]",
                                } as Record<number, string>;

                                return (
                                    <Image
                                        key={user}
                                        src={user}
                                        alt="User"
                                        width={30}
                                        height={30}
                                        className={cn(
                                            "rounded-full w-7 h-7 bg-background border border-border",
                                            index !== users.length - 1 && "-mr-5",
                                            zIndexClasses[index]
                                        )}
                                    />
                                );
                            })}
                        </div>
                        <div className='flex flex-row items-center flex-wrap justify-start gap-1 md:gap-3'>
                            <p className="text-foreground text-sm font-medium">4k+ projects raised funding on Karma </p>
                            <Link href={PAGES.PROJECTS_EXPLORER} className="text-muted-foreground flex flex-row items-center gap-2 text-sm font-semibold underline border-none shadow-none">Explore Projects</Link>
                        </div>
                    </div>
                </div>
                <Image
                    src="/images/homepage/builder-hero.png"
                    alt="Builder Hero"
                    width={420}
                    height={420}
                    layout="responsive"
                    className="hidden md:flex w-full h-full max-w-[420px] max-h-[420px] object-contain"
                />
            </div>

            {/* Infinite sliding pills section */}
            <div className="w-full mt-10 -mx-8">
                <InfiniteMovingCards
                    items={items}
                    variant="pill"
                    direction="left"
                    speed="slow"
                    pauseOnHover
                    className="w-full"
                />
            </div>

            <div className="w-full flex flex-row items-center justify-center">
                <div className="flex flex-row items-center justify-center gap-8">
                    <p className="text-muted-foreground text-base font-medium">Communities on Karma</p>
                    <Link href={PAGES.COMMUNITIES} className="px-2 flex flex-row items-center gap-2 text-foreground text-sm font-semibold border-none shadow-none">
                        View all
                        <ArrowRightIcon className="w-4 h-4" />
                    </Link>
                </div>
            </div>

        </section>
    );
}