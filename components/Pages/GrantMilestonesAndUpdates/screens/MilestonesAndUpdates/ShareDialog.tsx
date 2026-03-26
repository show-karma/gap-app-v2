import JSConfetti from "js-confetti";
import { type FC, useEffect } from "react";
import { TwitterIcon } from "@/components/Icons";
import { Button } from "@/components/Utilities/Button";
import { ExternalLink } from "@/components/Utilities/ExternalLink";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useShareDialogStore } from "@/store/modals/shareDialog";
import { shareOnX } from "@/utilities/share/shareOnX";

export const ShareDialog: FC = () => {
  const {
    isOpen,
    modalShareText,
    shareButtonText,
    shareText,
    modalShareSecondText,
    closeShareDialog,
  } = useShareDialogStore();

  useEffect(() => {
    if (isOpen) {
      const jsConfetti = new JSConfetti();

      jsConfetti.addConfetti({
        confettiRadius: 3,
        confettiNumber: 500,
      });
    }
  }, [isOpen]);

  const shareURI = shareOnX(shareText);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && closeShareDialog()}>
      <DialogContent className="max-w-4xl rounded-2xl dark:bg-zinc-800 bg-white p-6">
        <div className="flex flex-col gap-3 justify-center items-center pt-6 pb-12 px-[80px] bg-[#F5F8FF] rounded dark:bg-zinc-700 mt-2">
          <DialogHeader className="items-center">
            <DialogTitle className="text-[40px] font-bold font-body">🎉</DialogTitle>
            <DialogDescription asChild>
              <div className="flex flex-col gap-0 justify-center items-center">
                <h1
                  className="text-brand-darkblue dark:text-zinc-100 font-bold text-xl"
                  style={{
                    textAlign:
                      modalShareSecondText === " " || !modalShareSecondText ? "center" : "left",
                  }}
                >
                  {modalShareText}
                </h1>
                <p className="text-brand-darkblue dark:text-zinc-100 font-normal text-base">
                  {modalShareSecondText}
                </p>
                <ExternalLink href={shareURI}>
                  <Button className="flex flex-row gap-1 items-center px-5 py-3 text-white bg-[#155EEF] dark:bg-[#155EEF] text-sm font-semibold mt-5">
                    {"Share on"} <TwitterIcon className="w-5 h-5" />
                  </Button>
                </ExternalLink>
              </div>
            </DialogDescription>
          </DialogHeader>
        </div>
      </DialogContent>
    </Dialog>
  );
};
