import Image from "next/image";
import Link from "next/link";

const navigation = {
  social: [
    {
      name: "Twitter",
      href: "https://twitter.com/karmahq_",
      icon: (
        props: React.JSX.IntrinsicAttributes & React.SVGProps<SVGSVGElement>
      ) => (
        <svg fill="currentColor" viewBox="0 0 24 24" {...props}>
          <path d="M8.29 20.251c7.547 0 11.675-6.253 11.675-11.675 0-.178 0-.355-.012-.53A8.348 8.348 0 0022 5.92a8.19 8.19 0 01-2.357.646 4.118 4.118 0 001.804-2.27 8.224 8.224 0 01-2.605.996 4.107 4.107 0 00-6.993 3.743 11.65 11.65 0 01-8.457-4.287 4.106 4.106 0 001.27 5.477A4.072 4.072 0 012.8 9.713v.052a4.105 4.105 0 003.292 4.022 4.095 4.095 0 01-1.853.07 4.108 4.108 0 003.834 2.85A8.233 8.233 0 012 18.407a11.616 11.616 0 006.29 1.84" />
        </svg>
      ),
    },
    {
      name: "Discord",
      href: "https://discord.gg/X4fwgzPReJ",
      icon: (
        props: React.JSX.IntrinsicAttributes & React.SVGProps<SVGSVGElement>
      ) => (
        <svg viewBox="0 0 444 339" fill="currentColor" {...props}>
          <path
            d="M375.352 28.0972C347.256 14.9997 316.836 5.49347 285.149 0.000971712C284.871 -0.00791353 284.595 0.0442247 284.339 0.153721C284.084 0.263218 283.855 0.427414 283.67 0.634726C279.867 7.60598 275.431 16.6897 272.474 23.661C238.864 18.591 204.684 18.591 171.074 23.661C168.116 16.4785 163.68 7.60598 159.666 0.634726C159.455 0.212226 158.821 0.000971712 158.187 0.000971712C126.5 5.49347 96.2912 14.9997 67.9837 28.0972C67.7725 28.0972 67.5612 28.3085 67.35 28.5197C9.88997 114.498 -5.95378 198.153 1.86247 280.963C1.86247 281.386 2.07372 281.808 2.49622 282.02C40.5212 309.905 77.0675 326.805 113.191 338.001C113.825 338.212 114.459 338.001 114.67 337.578C123.12 325.96 130.725 313.707 137.274 300.821C137.696 299.976 137.274 299.131 136.429 298.92C124.387 294.272 112.98 288.78 101.784 282.442C100.939 282.02 100.939 280.752 101.572 280.118C103.896 278.428 106.22 276.527 108.544 274.837C108.966 274.415 109.6 274.415 110.022 274.626C182.692 307.792 261.066 307.792 332.891 274.626C333.314 274.415 333.947 274.415 334.37 274.837C336.694 276.738 339.017 278.428 341.341 280.33C342.186 280.963 342.186 282.231 341.13 282.653C330.145 289.202 318.526 294.483 306.485 299.131C305.64 299.342 305.429 300.398 305.64 301.032C312.4 313.918 320.005 326.171 328.244 337.79C328.878 338.001 329.511 338.212 330.145 338.001C366.48 326.805 403.026 309.905 441.051 282.02C441.474 281.808 441.685 281.386 441.685 280.963C450.98 185.267 426.264 102.246 376.197 28.5197C375.986 28.3085 375.775 28.0972 375.352 28.0972ZM148.259 230.475C126.5 230.475 108.332 210.406 108.332 185.69C108.332 160.973 126.077 140.905 148.259 140.905C170.651 140.905 188.396 161.185 188.185 185.69C188.185 210.406 170.44 230.475 148.259 230.475ZM295.5 230.475C273.741 230.475 255.574 210.406 255.574 185.69C255.574 160.973 273.319 140.905 295.5 140.905C317.892 140.905 335.637 161.185 335.426 185.69C335.426 210.406 317.892 230.475 295.5 230.475Z"
            fill="currentColor"
          ></path>
        </svg>
      ),
    },
    {
      name: "Telegram",
      href: "https://t.me/karmahq",
      icon: (
        props: React.JSX.IntrinsicAttributes & React.SVGProps<SVGSVGElement>
      ) => (
        <svg viewBox="0 0 48 48" fill="currentColor" {...props}>
          <path d="M5.83,23.616c12.568-5.529,28.832-12.27,31.077-13.203c5.889-2.442,7.696-1.974,6.795,3.434 c-0.647,3.887-2.514,16.756-4.002,24.766c-0.883,4.75-2.864,5.313-5.979,3.258c-1.498-0.989-9.059-5.989-10.7-7.163 c-1.498-1.07-3.564-2.357-0.973-4.892c0.922-0.903,6.966-6.674,11.675-11.166c0.617-0.59-0.158-1.559-0.87-1.086 c-6.347,4.209-15.147,10.051-16.267,10.812c-1.692,1.149-3.317,1.676-6.234,0.838c-2.204-0.633-4.357-1.388-5.195-1.676 C1.93,26.43,2.696,24.995,5.83,23.616z" />
        </svg>
      ),
    },
    {
      name: "Email",
      href: "mailto:dao@showkarma.xyz",
      icon: (
        props: React.JSX.IntrinsicAttributes & React.SVGProps<SVGSVGElement>
      ) => (
        <svg fill="currentColor" viewBox="0 0 24 24" {...props}>
          <path d="M1.5 8.67v8.58a3 3 0 003 3h15a3 3 0 003-3V8.67l-8.928 5.493a3 3 0 01-3.144 0L1.5 8.67z" />
          <path d="M22.5 6.908V6.75a3 3 0 00-3-3h-15a3 3 0 00-3 3v.158l9.714 5.978a1.5 1.5 0 001.572 0L22.5 6.908z" />
        </svg>
      ),
    },
  ],
};

export default function Footer() {
  return (
    <footer id="contact" className="bg-gray-900 dark:bg-black">
      <div className="px-6 py-20 sm:py-14 lg:px-8 flex items-center justify-between">
        <div>
          <div className="flex items-center gap-x-2">
            <Image
              src="/logo/logo-dark.png"
              className="h-12 w-12 lg:h-auto lg:w-[50px] ml-0 inline"
              width={464}
              height={500}
              alt="Gap"
            />
            <div className="text-white text-3xl font-black">karma</div>
          </div>
          <div className="flex justify-center space-x-3">
            {navigation.social.map((item) => (
              <Link
                key={item.name}
                href={item.href}
                className="text-gray-400 hover:text-gray-500 dark:text-zinc-500 dark:hover:text-zinc-300"
                target="_blank"
                passHref={true}
              >
                <span className="sr-only">{item.name}</span>
                <item.icon className="h-6 w-6" aria-hidden="true" />
              </Link>
            ))}
          </div>
        </div>
        <div className="text-gray-500 text-sm">Copyright &copy; 2024</div>
        <div>
          <div className="text-white uppercase text-sm font-semibold">
            Resources
          </div>
          <div className="mt-3 text-gray-500">SDK Docs</div>
          <div className="text-gray-500">Sitemap</div>
        </div>
      </div>
    </footer>
  );
}
