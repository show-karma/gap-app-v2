export const normalizeProgramId = (id: string): string => {
  return id.includes("_") ? id.split("_")[0] : id;
};
