const codeMap: Record<string, string> = {
  INSUFFICIENT_BALANCE: 'insufficient_balance',
  INSUFFICIENT_FUNDS: 'insufficient_balance',
  APPROVAL_REQUIRED: 'approval_required',
  PENDING_APPROVAL: 'approval_required',
  INVALID_GAME_STATE: 'invalid_game_state',
  GAME_UNAVAILABLE: 'game_unavailable',
  GAME_NOT_FOUND: 'game_unavailable',
  ROUTE_UNAVAILABLE: 'route_unavailable',
  PROVIDER_UNAVAILABLE: 'provider_unavailable',
  VALIDATION: 'validation',
  TRANSACTION_NOT_FOUND: 'transaction_not_found',
  WALLET_TOKEN_EXPIRED: 'wallet_token_expired',
  WALLET_STEP_UP_REQUIRED: 'wallet_step_up_required',
  SESSION_EXPIRED: 'session_expired',
  AUTH_REFRESH_REQUIRED: 'session_expired',
};

export const getApiErrorCode = (error: any) => {
  const payload = error?.data?.error ?? error?.error ?? error?.response?.data?.error ?? null;
  const rawCode =
    payload?.code ??
    payload?.error_code ??
    error?.code ??
    error?.data?.code ??
    error?.response?.data?.code;
  return rawCode ? codeMap[String(rawCode).toUpperCase()] ?? String(rawCode).toLowerCase() : null;
};

export const getApiErrorMessage = (error: any, fallback: string) => {
  const payload = error?.data?.error ?? error?.error ?? error?.response?.data?.error ?? null;
  const message = payload?.message ?? error?.data?.detail ?? error?.detail ?? error?.message;
  return typeof message === 'string' && message.trim().length > 0 ? message : fallback;
};

export const resolveLocalizedApiError = (
  t: (key: string, fallback?: string) => string,
  error: any,
  fallback: string,
) => {
  const code = getApiErrorCode(error);
  switch (code) {
    case 'insufficient_balance':
      return t('wallet.insufficientBalance', 'You do not have enough YelloMola for this action.');
    case 'approval_required':
      return t('common.approvalRequired', 'This action requires approval.');
    case 'invalid_game_state':
      return t('rewards.invalidGameState', 'This game is not available right now.');
    case 'game_unavailable':
      return t('rewards.gameUnavailable', 'This game is not available right now.');
    case 'route_unavailable':
      return t('wallet.routeUnavailable', 'This money-movement route is not available right now.');
    case 'provider_unavailable':
      return t('wallet.providerUnavailable', 'This payment provider is not available right now.');
    case 'validation':
      return t('common.invalidInput', 'Please check the entered details and try again.');
    case 'transaction_not_found':
      return t('wallet.transactionNotFound', 'We could not find that transaction right now.');
    case 'wallet_token_expired':
    case 'wallet_step_up_required':
      return t('wallet.walletVerificationRequiredBody', 'Please complete wallet verification to continue.');
    case 'session_expired':
      return t('login.sessionExpired', 'Your session expired. Please sign in again.');
    default:
      return getApiErrorMessage(error, fallback);
  }
};
