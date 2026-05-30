import { useState, useCallback } from 'react';
import { logger } from '../services/logger';

/**
 * useBiometricAuth Hook (Mocked)
 * 
 * NOTE: expo-local-authentication is missing from package.json.
 * This mock ensures the app can bundle until the package is installed.
 */
export const useBiometricAuth = () => {
    const [isAuthenticating, setIsAuthenticating] = useState(false);

    const authenticate = useCallback(async (
        promptMessage: string = 'Authenticate to continue',
        _fallbackLabel: string = 'Use Passcode'
    ): Promise<boolean> => {
        // Mocking success for demo purposes
        logger.log('Mock biometric auth accepted', { promptMessage });
        return true;
    }, []);

    return {
        authenticate,
        isAuthenticating
    };
};
