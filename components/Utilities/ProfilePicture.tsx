import Avatar from "boring-avatars";
import { cn } from "@/utilities/tailwind";

interface ProfilePictureProps {
  imageURL?: string;
  name: string;
  size?: string;
  className?: string;
  alt?: string;
}

const isValidUrl = (url?: string): boolean => {
  if (!url) return false;
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

export const ProfilePicture = ({ 
  imageURL, 
  name, 
  size = "32", 
  className,
  alt 
}: ProfilePictureProps) => {
  const isValid = isValidUrl(imageURL);
  
  if (isValid && imageURL) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        alt={alt || name || "Profile"}
        src={imageURL}
        className={cn("rounded-full object-cover", className)}
      />
    );
  }

  return (
    <div className={cn("rounded-full overflow-hidden", className)}>
      <Avatar
        size={size}
        name={name}
        variant="marble"
        colors={["#92A1C6", "#146A7C", "#F0AB3D", "#C271B4", "#C20D90"]}
      />
    </div>
  );
}; 