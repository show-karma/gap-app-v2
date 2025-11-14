import { InfiniteMovingCards } from "@/src/components/ui/infinite-moving-cards"
import { marketingLayoutTheme } from "@/src/helper/theme"
import { cn } from "@/utilities/tailwind"
import { CreateProfileButton } from "./create-profile-button"
import { JoinDiscordButton } from "./join-discord-button"

const testimonials = [
  {
    quote:
      "As a co-founder, I can say that Karma made obtaining funding straightforward and stress-free.",
    name: "Olivia Rhye",
    avatar: "/images/homepage/user1.jpg",
  },
  {
    quote: "With Karma, securing funding was simpler than ever for our engineering teams!",
    name: "Phoenix Baker",
    avatar: "/images/homepage/user2.png",
  },
  {
    quote: "As a former PM, I found Karma invaluable for securing funding effortlessly.",
    name: "Lana Steiner",
    avatar: "/images/homepage/user3.png",
  },
  {
    quote: "Karma made it easy for me to access funding without the usual headaches.",
    name: "Demi Wilkinson",
    avatar: "/images/homepage/user1.jpg",
  },
  {
    quote: "Karma streamlined our funding journey, making it quick and hassle-free.",
    name: "Candice Wu",
    avatar: "/images/homepage/user2.png",
  },
  {
    quote: "Joining the design team, I saw how Karma made our funding process smooth and quick.",
    name: "Natali Craig",
    avatar: "/images/homepage/user3.png",
  },
]

export function JoinCommunity() {
  return (
    <section className={cn(marketingLayoutTheme.padding, "py-16 w-full")}>
      <div className="flex flex-col items-center gap-6 mb-12">
        <h2 className="section-title text-foreground text-center">Join our community</h2>
        <p className="text-xl font-normal text-muted-foreground text-center">
          Celebrate your milestones and wins with the Karma community.
        </p>
        <div className="flex flex-row items-center gap-4">
          <JoinDiscordButton />
          <CreateProfileButton />
        </div>
      </div>

      {/* <div className="flex flex-col gap-4 w-full">
                <InfiniteMovingCards
                    items={testimonials}
                    direction="left"
                    speed="slow"
                    pauseOnHover={true}
                    className="w-full"
                />
                <InfiniteMovingCards
                    items={testimonials}
                    direction="right"
                    speed="slow"
                    pauseOnHover={true}
                    className="w-full"
                />
            </div> */}
    </section>
  )
}
