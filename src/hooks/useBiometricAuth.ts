import { useState, useCallback } from 'react';
import { Alert } from 'react-native';

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
        fallbackLabel: string = 'Use Passcode'
    ): Promise<boolean> => {
        // Mocking success for demo purposes
        console.log(`[Mock Auth] ${promptMessage}`);
        return true;
    }, []);

    return {
        authenticate,
        isAuthenticating
    };
};
