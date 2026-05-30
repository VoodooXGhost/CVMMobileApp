export const statusCopy = {
  unsupportedFeature: 'This feature is not available on the current backend yet.',
  genericError: 'Something went wrong. Please try again.',
  networkError: 'Unable to complete the request right now. Please retry.',
};

export const isUnsupportedError = (error: any) => {
  const status = error?.status ?? error?.originalStatus ?? error?.response?.status;
  return status === 404 || status === 405;
};
