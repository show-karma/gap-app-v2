import Image from "next/image";
import { useParams } from "next/navigation";
import { ExternalLink } from "@/components/Utilities/ExternalLink";
import { useCopyToClipboard } from "@/hooks/useCopyToClipboard";
import { useProjectStore } from "@/store";
import { useEndorsementStore } from "@/store/modals/endorsement";
import { useIntroModalStore } from "@/store/modals/intro";
import { envVars } from "@/utilities/enviromentVars";
import { PAGES } from "@/utilities/pages";
import { cn } from "@/utilities/tailwind";

export function ProjectBlocks() {
	const project = useProjectStore((state) => state.project);
	const { setIsEndorsementOpen } = useEndorsementStore();
	const [, copy] = useCopyToClipboard();
	const params = useParams();
	const { setIsIntroModalOpen } = useIntroModalStore();

	const mountBlocks = () => {
		const blocks: {
			iconSrc: string;
			title: string;
			description: string;
			link?: string;
			action?: () => void;
			disabled?: boolean;
			bg: string;
		}[] = [
			{
				iconSrc: "/icons/wave.svg",
				title: "Request intro",
				description: "Get an introduction to connect",
				action: () => setIsIntroModalOpen(true),
				bg: "bg-[#DBFFC5]",
			},
		];

		const havePitchDeck = !!project?.details?.data.links?.find(
			(link) => link.type === "pitchDeck",
		)?.url;
		const haveDemoVideo = !!project?.details?.data.links?.find(
			(link) => link.type === "demoVideo",
		)?.url;
		const haveWebsite = !!project?.details?.data.links?.find(
			(link) => link.type === "website",
		)?.url;

		if (!havePitchDeck || !haveDemoVideo) {
			blocks.push({
				iconSrc: "/icons/thumbs-up.svg",
				title: "Endorse the Project",
				description: "Publicly endorse our project",
				action: () => setIsEndorsementOpen(true),
				bg: "bg-[#FFF3D4]",
			});
		}
		if (haveWebsite) {
			blocks.push({
				iconSrc: "/icons/website.svg",
				title: "Website",
				description: "Visit the website of the project",
				link: project?.details?.data.links
					?.find((link) => link.type === "website")
					?.url.includes("http")
					? project?.details?.data.links?.find(
							(link) => link.type === "website",
						)?.url
					: `https://${
							project?.details?.data.links?.find(
								(link) => link.type === "website",
							)?.url
						}`,
				bg: "bg-[#FFE6D5]",
			});
		}
		if (havePitchDeck) {
			blocks.push({
				iconSrc: "/icons/deck.svg",
				title: "Read Pitch Deck",
				description: "Read the pitch deck of the project",
				bg: "bg-[#ECE9FE]",
				link: project?.details?.data.links
					?.find((link) => link.type === "pitchDeck")
					?.url.includes("http")
					? project?.details?.data.links?.find(
							(link) => link.type === "pitchDeck",
						)?.url
					: `https://${
							project?.details?.data.links?.find(
								(link) => link.type === "pitchDeck",
							)?.url
						}`,
			});
		}
		if (haveDemoVideo) {
			blocks.push({
				iconSrc: "/icons/video.svg",
				title: "Watch Demo Video",
				description: "Watch the demo video of the project",
				bg: "bg-[#FDE3FF]",
				link: project?.details?.data.links
					?.find((link) => link.type === "demoVideo")
					?.url.includes("http")
					? project?.details?.data.links?.find(
							(link) => link.type === "demoVideo",
						)?.url
					: `https://${
							project?.details?.data.links?.find(
								(link) => link.type === "demoVideo",
							)?.url
						}`,
			});
		}

		return blocks;
	};

	const blocksMounted = mountBlocks();

	function Block({ item }: { item: (typeof blocksMounted)[number] }) {
		return (
			<div
				className={cn(
					`flex flex-col items-start gap-3 p-3 rounded-lg flex-1 max-w-full w-full justify-start h-full`,
					item.bg,
				)}
			>
				<Image
					width={24}
					height={24}
					src={item.iconSrc}
					alt={item.title}
					className="w-6 h-6"
				/>
				<p className="text-sm font-bold text-black text-left">{item.title}</p>
			</div>
		);
	}

	return (
		<div className="flex flex-row gap-3 flex-wrap max-lg:gap-1 max-md:flex-col">
			{blocksMounted.map((item) =>
				item.action ? (
					<div className="flex flex-1" key={item.title}>
						<button
							type="button"
							onClick={() => item?.action?.()}
							className="w-full h-full min-h-max max-h-full"
						>
							<Block key={item.title} item={item} />
						</button>
					</div>
				) : (
					<div className="flex flex-1" key={item.title}>
						<ExternalLink
							href={item.link}
							className="w-full h-full min-h-max max-h-full"
						>
							<Block key={item.title} item={item} />
						</ExternalLink>
					</div>
				),
			)}
		</div>
	);
}
