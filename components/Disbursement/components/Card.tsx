import type React from "react";

interface CardProps {
	children: React.ReactNode;
	className?: string;
	title?: string;
	titleIcon?: React.ReactNode;
	titleEmoji?: string;
}

interface CardHeaderProps {
	title: string;
	icon?: React.ReactNode;
	emoji?: string;
}

const CardHeader: React.FC<CardHeaderProps> = ({ title, icon, emoji }) => (
	<div className="flex items-center mb-6">
		{icon && <div className="bg-indigo-100 rounded-lg p-2 mr-3">{icon}</div>}
		<h2 className="text-xl font-semibold text-gray-900">
			{emoji && `${emoji} `}
			{title}
		</h2>
	</div>
);

export const Card: React.FC<CardProps> = ({
	children,
	className = "",
	title,
	titleIcon,
	titleEmoji,
}) => {
	return (
		<div
			className={`bg-white rounded-xl shadow-sm border border-gray-200 p-6 ${className}`}
		>
			{title && (
				<CardHeader title={title} icon={titleIcon} emoji={titleEmoji} />
			)}
			{children}
		</div>
	);
};
