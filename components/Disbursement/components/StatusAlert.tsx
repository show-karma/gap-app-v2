import type React from "react";

type AlertType = "error" | "warning" | "info" | "success";

interface StatusAlertProps {
	type: AlertType;
	title: string;
	message: string;
	onDismiss?: () => void;
	dismissText?: string;
	children?: React.ReactNode;
}

const alertStyles = {
	error: {
		container: "bg-red-50 border-red-200",
		icon: "text-red-400",
		title: "text-red-800",
		message: "text-red-700",
		dismiss: "text-red-800 hover:text-red-900",
	},
	warning: {
		container: "bg-amber-50 border-amber-200",
		icon: "text-amber-400",
		title: "text-amber-800",
		message: "text-amber-700",
		dismiss: "text-amber-800 hover:text-amber-900",
	},
	info: {
		container: "bg-blue-50 border-blue-200",
		icon: "text-blue-400",
		title: "text-blue-800",
		message: "text-blue-700",
		dismiss: "text-blue-800 hover:text-blue-900",
	},
	success: {
		container: "bg-green-50 border-green-200",
		icon: "text-green-400",
		title: "text-green-800",
		message: "text-green-700",
		dismiss: "text-green-800 hover:text-green-900",
	},
};

const AlertIcon = ({ type }: { type: AlertType }) => {
	const iconClass = `h-6 w-6 ${alertStyles[type].icon}`;

	if (type === "error") {
		return (
			<svg className={iconClass} viewBox="0 0 20 20" fill="currentColor">
				<path
					fillRule="evenodd"
					d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z"
					clipRule="evenodd"
				/>
			</svg>
		);
	}

	if (type === "warning") {
		return (
			<svg className={iconClass} viewBox="0 0 20 20" fill="currentColor">
				<path
					fillRule="evenodd"
					d="M8.485 2.495c.673-1.167 2.357-1.167 3.03 0l6.28 10.875c.673 1.167-.17 2.625-1.516 2.625H3.72c-1.347 0-2.189-1.458-1.515-2.625L8.485 2.495zM10 5a.75.75 0 01.75.75v3.5a.75.75 0 01-1.5 0v-3.5A.75.75 0 0110 5zm0 9a1 1 0 100-2 1 1 0 000 2z"
					clipRule="evenodd"
				/>
			</svg>
		);
	}

	// Default info/success icon
	return (
		<svg
			className={iconClass}
			fill="none"
			viewBox="0 0 24 24"
			stroke="currentColor"
		>
			<path
				strokeLinecap="round"
				strokeLinejoin="round"
				strokeWidth="2"
				d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
			/>
		</svg>
	);
};

export const StatusAlert: React.FC<StatusAlertProps> = ({
	type,
	title,
	message,
	onDismiss,
	dismissText = "Dismiss",
	children,
}) => {
	const styles = alertStyles[type];

	return (
		<div className={`rounded-xl border p-6 shadow-sm ${styles.container}`}>
			<div className="flex">
				<div className="flex-shrink-0">
					<AlertIcon type={type} />
				</div>
				<div className="ml-3 flex-1">
					<h3 className={`text-sm font-semibold ${styles.title}`}>{title}</h3>
					<div className={`mt-2 text-sm ${styles.message}`}>{message}</div>
					{children && <div className="mt-3">{children}</div>}
					{onDismiss && (
						<div className="mt-3">
							<button
								type="button"
								onClick={onDismiss}
								className={`text-sm underline font-medium ${styles.dismiss}`}
							>
								{dismissText}
							</button>
						</div>
					)}
				</div>
			</div>
		</div>
	);
};
