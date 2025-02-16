import { envVars } from "./enviromentVars";

export const chosenCommunities = () => {
  if (envVars.NEXT_PUBLIC_ENV === "staging") {
    return [
      {
        name: "Gitcoin",
        slug: "gitcoin",
        uid: "0x70f6021f0e15111e7c914f9bdc007682d065982649c6078abb5ffbc09f2e3ff5",
        imageURL: {
          light:
            "data:image/jpeg;base64,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",
          dark: "data:image/jpeg;base64,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",
        },
      },
    ];
  }
  return [
    {
      name: "Arbitrum",
      slug: "arbitrum",
      uid: "0x02174fc2f5204bc816aaabc4d82e406e8967381ca490cf4915bdd9b5aae8c2e9",
      imageURL: {
        light: "/logos/karma-arbitrum.png",
        dark: "/logos/karma-arbitrum.png",
      },
    },
    {
      name: "Gitcoin",
      slug: "gitcoin",
      uid: "0x80fdb7152814c47d100e25920d68a3754d4f5cd6319f0cd1b4da965ac9219b81",
      imageURL: {
        light: "/logos/karma-gitcoin.jpeg",
        dark: "/logos/karma-gitcoin.jpeg",
      },
    },
    {
      name: "Sei",
      slug: "sei",
      uid: "0x0b3a59024f775a765553d48814cd513ca2a0a5b3f9853787fcdf41e3b9b1ab75",
      imageURL: {
        light: "/logos/karma-sei.svg",
        dark: "/logos/karma-sei.svg",
      },
    },
    {
      name: "Optimism",
      slug: "optimism",
      uid: "0x1853e9a16f73afccb73a3801127d760cc3ab54d300573ebd4ec6f57119875d39",
      imageURL: {
        light: "/logos/karma-optimism.jpeg",
        dark: "/logos/karma-optimism.jpeg",
      },
    },
    {
      name: "Octant",
      slug: "octant",
      uid: "0xcb67cd16cbdf4e9c3b6ed4c8f9424411a48be796d690750afc84f9288e7c7996",
      imageURL: {
        light: "/logos/karma-octant.png",
        dark: "/logos/karma-octant.png",
      },
    },
    {
      name: "Celo Public Goods",
      slug: "celopg",
      uid: "0x68689eae8f1e08b7d30be8da301289f8ab8e058a6e472a8cf09efddc8165ccc1",
      imageURL: {
        light: "/logos/karma-celo-logo.jpeg",
        dark: "/logos/karma-celo-logo.jpeg",
      },
    },
    {
      name: "OpenCivics",
      slug: "opencivics",
      uid: "0x22dd5bed20dc47c3608d3b872351a672fe1b5cfd8f2a4d7854fd81e88bd821c9",
      imageURL: {
        light: "/logos/karma-opencivics.webp",
        dark: "/logos/karma-opencivics.webp",
      },
    },
    {
      name: "Public Nouns",
      slug: "public-nouns",
      uid: "0x10ce7f1a39dd325b0177ad6db8e625a943577843f5b038f0bbf1efd54454702e",
      imageURL: {
        light: "/logos/karma-public-nouns.jpeg",
        dark: "/logos/karma-public-nouns.jpeg",
      },
    },
    {
      name: "Climate Co. Network",
      slug: "climate-coordination-network",
      uid: "0x5657dbe027418111401a194dab2226fa06a647f42f7da340b869c4906f556b09",
      imageURL: {
        light: "/logos/karma-climate-coordination-network.jpg",
        dark: "/logos/karma-climate-coordination-network.jpg",
      },
    },
    {
      name: "Refi DAO",
      slug: "refidao",
      uid: "0x8ec765bdf1c23d2b16288858b1928e08dff2e868fa1674ade3ecb6af2aaf95b6",
      imageURL: {
        light: "/logos/karma-refidao-logo.jpeg",
        dark: "/logos/karma-refidao-logo.jpeg",
      },
    },
    {
      name: "Glo Dollar",
      slug: "glodollar",
      uid: "0x78e493fec641879ea6ab95c0d5d61c96df0622df5da38c627f0e0b171709da78",
      imageURL: {
        light: "/logos/karma-glodollar.jpeg",
        dark: "/logos/karma-glodollar.jpeg",
      },
    },
    {
      name: "Pokt",
      slug: "pokt",
      uid: "0x1be3b3cfd9ea03ef066beae8c0e94c289bf1eae8732bfcf82177ea4e848e61fa",
      imageURL: {
        light: "/logos/karma-pokt-black.svg",
        dark: "/logos/karma-pokt-white.svg",
      },
    },
    {
      name: "Fractal Visions",
      slug: "fractal-visions",
      uid: "0xca43f36c16dd11d92857e90e504db221de4a15b2fd59f08556055490c1baafaa",
      imageURL: {
        light: "/logos/karma-fractal-visions.jpg",
        dark: "/logos/karma-fractal-visions.jpg",
      },
    },
    {
      name: "Greenpill",
      slug: "greenpill-network",
      uid: "0xca43f36c16dd11d92857e90e504db221de4a15b2fd59f08556055490c1baafaa",
      imageURL: {
        light: "/logos/karma-greenpill.svg",
        dark: "/logos/karma-greenpill.svg",
      },
    },
    {
      name: "TEC",
      slug: "tec",
      uid: "0x455325a0317900a8bb6ba5bf973b3ec209e03317f22985385a532bca4328a930",
      imageURL: {
        light: "/logos/tec.png",
        dark: "/logos/tec.png",
      },
    },
  ];
};
