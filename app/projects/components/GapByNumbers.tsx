import Image from "next/image";

const stats = [
  {
    title: "Total Projects",
    value: "400+",
  },
  {
    title: "Total Funding Allocated",
    subtitle: "(with available data)",
    value: "+1.3M",
  },
  {
    title: "Active Communities",
    value: "22",
  },
  {
    title: "Active Builders",
    value: "3.5k",
  },
];

export default function GapByNumbers() {
  return (
    <section className="py-20 px-4">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col items-center justify-center text-center mb-16">
          {/* Logo triangle */}
          <div className="mb-5">
            <Image
              src="/logo/karma-gap-logomark.svg"
              alt="Gap Logo"
              width={56}
              height={56}
            />
          </div>
          <h2 className="text-4xl max-sm:text-2xl font-semibold text-black dark:text-zinc-100">
            GAP by the Numbers
          </h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-2 lg:grid-cols-4 divide-x divide-[#D0D5DD] max-md:gap-2 max-md:divide-none">
          {stats.map((stat, index) => (
            <div
              key={index}
              className="flex flex-col items-center justify-center"
            >
              <p className="text-6xl font-semibold text-[#8098F9] max-sm:text-3xl">
                {stat.value}
              </p>
              <p className="text-brand-darkblue dark:text-zinc-300 font-medium mt-3 text-lg text-center max-sm:text-sm">
                {stat.title}
              </p>
              <p className="text-brand-darkblue dark:text-zinc-300 font-medium text-lg text-center max-sm:text-sm">
                {stat?.subtitle}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
