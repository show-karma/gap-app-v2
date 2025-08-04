import { Hex } from "viem";
import { create } from "zustand";

export type TxStepperSteps =
  | "preparing"
  | "pending"
  | "confirmed"
  | "indexing"
  | "indexed";

interface TxStepperStore {
  isStepperOpen: boolean;
  setIsStepper: (isStepperOpen: boolean) => void;
  stepperStep: TxStepperSteps;
  changeStepperStep: (stepperStep: TxStepperSteps) => void;
}

export const useStepper = create<TxStepperStore>((set, get) => ({
  isStepperOpen: false,
  setIsStepper: (isStepperOpen: boolean) => {
    set({ isStepperOpen });
    setTimeout(() => {
      set({ stepperStep: "preparing" });
    }, 200);
  },
  stepperStep: "indexed",
  changeStepperStep: (stepperStep: TxStepperSteps) => {
    set({ stepperStep, isStepperOpen: true });
  },
}));
