import { StarIcon } from "@/components/Icons";
import { DynamicStars } from "@/components/Utilities/DynamicStars";

export const CardReview = () => {
  return (
    <div className="flex w-full flex-row justify-center">
      <button>Review</button>
      <StarIcon />
      <DynamicStars
        totalStars={5}
        rating={0}
        setRating={(rating) => {
          rating || 0;
        }}
      />
      <div>.. Case Submit a review</div>
      21/07/2024 Estrela 4,5 (Pontuacao)
      <button>Submit Review</button>
    </div>
  );
};
