export const isTestMode = () => {
  return import.meta.env.VITE_IS_TEST_MODE === "true";
};
