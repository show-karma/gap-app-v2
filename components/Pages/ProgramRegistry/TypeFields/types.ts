import type { Control, FieldErrors, UseFormRegister } from "react-hook-form";
import type { ProgramFormData } from "../schema";

export interface TypeFieldsProps {
  register: UseFormRegister<ProgramFormData>;
  control: Control<ProgramFormData>;
  errors: FieldErrors<ProgramFormData>;
  labelStyle: string;
  inputStyle: string;
}
