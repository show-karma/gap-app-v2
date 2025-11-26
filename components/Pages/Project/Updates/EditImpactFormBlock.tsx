import { XMarkIcon } from "@heroicons/react/24/outline";
import { zodResolver } from "@hookform/resolvers/zod";
import { ProjectImpact } from "@show-karma/karma-gap-sdk/core/class/entities/ProjectImpact";
import { useRouter } from "next/navigation";
import type { FC } from "react";
import { useEffect, useState } from "react";
import type { SubmitHandler } from "react-hook-form";
import { Controller, useForm } from "react-hook-form";
import toast from "react-hot-toast";
import { useAccount } from "wagmi";
import { z } from "zod";
import { Button } from "@/components/Utilities/Button";
import { DatePicker } from "@/components/Utilities/DatePicker";
import { errorManager } from "@/components/Utilities/errorManager";
import { MarkdownEditor } from "@/components/Utilities/MarkdownEditor";
import { useGap } from "@/hooks/useGap";
import { useWallet } from "@/hooks/useWallet";
import { useProjectStore } from "@/store";
import { useStepper } from "@/store/modals/txStepper";
import { walletClientToSigner } from "@/utilities/eas-wagmi-utils";
import { ensureCorrectChain } from "@/utilities/ensureCorrectChain";
import fetchData from "@/utilities/fetchData";
import { INDEXER } from "@/utilities/indexer";
import { MESSAGES } from "@/utilities/messages";
import { sanitizeObject } from "@/utilities/sanitize";
import { safeGetWalletClient } from "@/utilities/wallet-helpers";

const updateSchema = z.object({
  startedAt: z.date({
    required_error: MESSAGES.PROJECT.IMPACT.FORM.DATE,
  }),
  completedAt: z.date({
    required_error: MESSAGES.PROJECT.IMPACT.FORM.DATE,
  }),
});

type UpdateType = z.infer<typeof updateSchema>;

const labelStyle = "text-sm font-bold text-black dark:text-zinc-100";

interface EditImpactFormBlockProps {
  onClose?: () => void;
  impactId: string;
}

const EditImpactFormBlock: FC<EditImpactFormBlockProps> = ({ onClose, impactId }) => {
  const [proof, setProof] = useState("");
  const [impact, setImpact] = useState("");
  const [work, setWork] = useState("");

  const { address } = useAccount();
  const { chain } = useAccount();
  const { switchChainAsync } = useWallet();
  const project = useProjectStore((state) => state.project);
  const refreshProject = useProjectStore((state) => state.refreshProject);
  const router = useRouter();

  // Find the impact to edit
  const impactToEdit = project?.impacts?.find((imp) => imp.uid === impactId);

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting, isValid },
    watch,
  } = useForm<UpdateType>({
    resolver: zodResolver(updateSchema),
    reValidateMode: "onChange",
    mode: "onChange",
    defaultValues: {
      startedAt: new Date(),
      completedAt: new Date(),
    },
  });
  const [isLoading, setIsLoading] = useState(false);
  const { gap } = useGap();
  const { changeStepperStep, setIsStepper } = useStepper();

  // Load existing impact data
  useEffect(() => {
    if (impactToEdit) {
      setWork(impactToEdit.data.work || "");
      setImpact(impactToEdit.data.impact || "");
      setProof(impactToEdit.data.proof || "");

      if (impactToEdit.data.startedAt) {
        setValue("startedAt", new Date(impactToEdit.data.startedAt * 1000));
      }

      if (impactToEdit.data.completedAt) {
        setValue("completedAt", new Date(impactToEdit.data.completedAt * 1000));
      }
    }
  }, [impactToEdit, setValue]);

  const isDescriptionValid = impact.length >= 3;

  const onSubmit: SubmitHandler<UpdateType> = async (data) => {
    if (!address || !project || !impactToEdit) return;

    let gapClient = gap;
    try {
      setIsLoading(true);
      const {
        success,
        chainId: actualChainId,
        gapClient: newGapClient,
      } = await ensureCorrectChain({
        targetChainId: project.chainID,
        currentChainId: chain?.id,
        switchChainAsync,
      });

      if (!success) {
        setIsLoading(false);
        return;
      }

      gapClient = newGapClient;

      const { walletClient, error } = await safeGetWalletClient(actualChainId);

      if (error || !walletClient || !gapClient) {
        throw new Error("Failed to connect to wallet", { cause: error });
      }

      const walletSigner = await walletClientToSigner(walletClient);

      const fetchedProject = await gapClient.fetch.projectById(project.uid);
      if (!fetchedProject) return;

      const impactInstance = fetchedProject.impacts?.find((imp) => imp.uid === impactId);
      if (!impactInstance) return;

      const impactData = sanitizeObject({
        work,
        impact,
        proof,
        startedAt: Math.floor(data.startedAt.getTime() / 1000),
        completedAt: Math.floor(data.completedAt.getTime() / 1000),
      });

      // Update the impact data
      const updatedImpactData = {
        ...impactInstance.data,
        ...impactData,
      };

      // Create a new impact instance with updated data
      const updatedImpact = new ProjectImpact({
        data: updatedImpactData,
        recipient: impactInstance.recipient,
        attester: address as `0x${string}`,
        schema: impactInstance.schema,
        refUID: impactInstance.refUID,
        uid: impactInstance.uid,
        createdAt: impactInstance.createdAt,
      });

      changeStepperStep("preparing");

      await updatedImpact.attest(walletSigner as any, changeStepperStep).then(async (res) => {
        let retries = 1000;
        const txHash = res?.tx[0]?.hash;
        if (txHash) {
          await fetchData(INDEXER.ATTESTATION_LISTENER(txHash, project.chainID), "POST", {});
        }
        changeStepperStep("indexing");
        while (retries > 0) {
          await refreshProject()
            .then(async (fetchedProject) => {
              const attestUID = updatedImpact.uid;
              const foundImpact = fetchedProject?.impacts?.find((imp) => imp.uid === attestUID);

              if (foundImpact) {
                retries = 0;
                changeStepperStep("indexed");
                toast.success("Impact updated successfully");
                if (onClose) {
                  onClose();
                }
                router.refresh();
              }
            })
            .catch(() => {
              retries -= 1;
            });
          await new Promise((resolve) => setTimeout(resolve, 1500));
        }
      });
    } catch (error: any) {
      errorManager(`Error updating impact ${impactId} from project ${project?.uid}`, error);
      toast.error("There was an error updating the impact. Please try again");
    } finally {
      setIsLoading(false);
      setIsStepper(false);
    }
  };

  if (!impactToEdit) {
    return (
      <div className="flex flex-col w-full gap-4">
        <div className="flex justify-between items-center mb-2">
          <h2 className="text-xl font-bold text-black dark:text-zinc-100">Impact Not Found</h2>
          {onClose && (
            <button
              onClick={onClose}
              className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-700"
            >
              <XMarkIcon className="w-5 h-5 text-gray-500" />
            </button>
          )}
        </div>
        <p className="text-gray-600 dark:text-gray-400">
          The impact you&apos;re trying to edit could not be found.
        </p>
      </div>
    );
  }

  return (
    <div className="flex flex-col w-full gap-4">
      <div className="flex justify-between items-center mb-2">
        <h2 className="text-xl font-bold text-black dark:text-zinc-100">Edit Impact</h2>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 rounded-full hover:bg-gray-100 dark:hover:bg-zinc-700"
          >
            <XMarkIcon className="w-5 h-5 text-gray-500" />
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="flex w-full flex-col gap-4">
        <div className="flex w-full flex-col">
          <label htmlFor="work" className={labelStyle}>
            Explain the work you did *
          </label>
          <div className="w-full bg-transparent" data-color-mode="light">
            <MarkdownEditor
              value={work}
              onChange={(newValue: string) => setWork(newValue || "")}
              placeholderText="Organized an onboarding event"
            />
          </div>
        </div>

        <div className="flex w-full flex-col">
          <label htmlFor="impact" className={labelStyle}>
            Explain the impact of your work *
          </label>
          <div className="w-full bg-transparent" data-color-mode="light">
            <MarkdownEditor
              value={impact}
              onChange={(newValue: string) => setImpact(newValue || "")}
              placeholderText="50 new members joined the community"
            />
          </div>
        </div>

        <div className="flex w-full flex-row gap-4 max-lg:flex-col">
          <div className="flex w-full flex-col gap-2">
            <label htmlFor="startedAt" className={labelStyle}>
              Started at *
            </label>
            <Controller
              name="startedAt"
              control={control}
              render={({ field }) => (
                <DatePicker
                  selected={field.value}
                  onSelect={(date) => {
                    setValue("startedAt", date, {
                      shouldValidate: true,
                    });
                    field.onChange(date);
                  }}
                  minDate={new Date("2000-01-01")}
                  placeholder="Pick a date"
                  buttonClassName="w-full text-base bg-white dark:bg-zinc-800"
                />
              )}
            />
            <p className="text-red-500">{errors.startedAt?.message}</p>
          </div>

          <div className="flex w-full flex-col gap-2">
            <label htmlFor="completedAt" className={labelStyle}>
              Completed at *
            </label>
            <Controller
              name="completedAt"
              control={control}
              render={({ field }) => (
                <DatePicker
                  selected={field.value}
                  onSelect={(date) => {
                    setValue("completedAt", date, {
                      shouldValidate: true,
                    });
                    field.onChange(date);
                  }}
                  minDate={watch("startedAt")}
                  placeholder="Pick a date"
                  buttonClassName="w-full text-base bg-white dark:bg-zinc-800"
                />
              )}
            />
            <p className="text-red-500">{errors.completedAt?.message}</p>
          </div>
        </div>

        <div className="flex w-full gap-2 flex-col">
          <label htmlFor="proof" className={labelStyle}>
            Add Proof of Impact *
          </label>
          <div className="w-full bg-transparent" data-color-mode="light">
            <MarkdownEditor
              value={proof}
              onChange={(newValue: string) => setProof(newValue || "")}
              placeholderText="Add links to charts, videos, dashboards etc. that evaluators can check to verify your work and impact"
            />
          </div>
        </div>

        <div className="flex w-full flex-row gap-3 justify-end">
          {onClose && (
            <Button
              type="button"
              className="flex w-max flex-row bg-transparent border border-gray-300 text-gray-600 hover:bg-gray-50"
              onClick={onClose}
            >
              Cancel
            </Button>
          )}
          <Button
            type="submit"
            className="flex w-max flex-row bg-slate-600 text-slate-200 hover:bg-slate-800 hover:text-slate-200"
            disabled={
              isSubmitting ||
              !isValid ||
              !isDescriptionValid ||
              !work.length ||
              !proof.length ||
              !impact.length
            }
            isLoading={isSubmitting || isLoading}
          >
            Update Impact
          </Button>
        </div>
      </form>
    </div>
  );
};

export default EditImpactFormBlock;
