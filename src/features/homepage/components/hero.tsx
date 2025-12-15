import { ArrowRightIcon } from "@heroicons/react/20/solid";
import Image from "next/image";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { SectionContainer } from "@/src/components/shared/section-container";
import { InfiniteMovingCards } from "@/src/components/ui/infinite-moving-cards";
import { ThemeImage } from "@/src/components/ui/theme-image";
import { marketingLayoutTheme } from "@/src/helper/theme";
import { chosenCommunities } from "@/utilities/chosenCommunities";
import { PAGES } from "@/utilities/pages";
import { cn } from "@/utilities/tailwind";
import { CreateProjectButton } from "./create-project-button";

const users = [
  "/images/homepage/user1.jpg",
  "/images/homepage/user2.png",
  "/images/homepage/user3.png",
];

const items = chosenCommunities(true).map((community) => ({
  text: community.name,
  image: community.imageURL,
  href: PAGES.COMMUNITY.ALL_GRANTS(community.slug),
}));

export function Hero() {
  return (
    <section
      className={cn(
        marketingLayoutTheme.padding,
        "flex flex-col items-start justify-center flex-1 w-full min-h-[calc(100vh-75px)] py-8"
      )}
    >
      <SectionContainer className="flex flex-col gap-14">
        <div className="flex flex-row items-center justify-between gap-10 w-full max-[640px]:flex-col max-[640px]:gap-0">
          <div className="flex flex-col items-start justify-center gap-4 max-w-full lg:max-w-lg 2xl:max-w-2xl flex-1 min-w-0">
            <h1 className="text-foreground text-[40px] lg:text-5xl font-semibold leading-none tracking-[-0.02em]">
              Where builders <br className="hidden lg:block" />
              get funded and ecosystems grow
            </h1>
            <p className="text-muted-foreground text-sm sm:text-base font-medium">
              Ecosystems use Karma to fund projects transparently. Builders use it to share
              progress, earn reputation, and get discovered for more opportunities.
            </p>
            <div className="relative flex flex-col mt-4 md:flex-row gap-3 md:gap-3">
              {/* Blurred gradient background */}
              <div className="absolute -left-2 -right-1 -bottom-1 h-[30%] md:h-[60%] bg-gradient-to-r from-purple-300 to-emerald-300 opacity-40 md:opacity-80 blur-md" />
              <div className="relative z-0">
                <CreateProjectButton styleClass="h-auto px-5 py-3 text-sm font-medium w-max bg-primary text-primary-foreground hover:bg-primary/90 border-0 shadow" />
              </div>
              <Button
                variant="outline"
                className="h-auto px-5 py-3 text-sm font-medium border border-black/15 bg-white/10 hover:bg-white/20 relative z-0 backdrop-blur-sm"
                asChild
              >
                <Link href={PAGES.FUNDERS}>Run a funding program</Link>
              </Button>
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
              <div className="flex flex-row items-center flex-wrap justify-start gap-1 md:gap-3">
                <p className="text-foreground text-sm font-medium">4k+ projects active on Karma</p>
                <Link
                  href={PAGES.PROJECTS_EXPLORER}
                  className="text-muted-foreground flex flex-row items-center gap-2 text-sm font-semibold underline border-none shadow-none"
                >
                  Explore Projects
                </Link>
              </div>
            </div>
          </div>
          <div
            className="hidden sm:flex flex-1 w-full max-w-[420px] min-w-0 relative rounded-3xl overflow-hidden"
            style={{ aspectRatio: "1/1" }}
          >
            <ThemeImage
              src="/images/homepage/builder-hero.png"
              alt="Builder Hero"
              fill
              className="object-contain"
            />
          </div>
        </div>

        <div className="flex w-full flex-col gap-4">
          <div className="w-full max-md:-my-4">
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
            <div className="flex flex-row items-center justify-center gap-4">
              <p className="text-muted-foreground text-base font-medium">Communities on Karma</p>
              <Link
                href={PAGES.COMMUNITIES}
                className="px-2 flex flex-row items-center gap-2 text-foreground text-sm font-semibold border-none shadow-none"
              >
                View all
                <ArrowRightIcon className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </div>
      </SectionContainer>
    </section>
  );
}
