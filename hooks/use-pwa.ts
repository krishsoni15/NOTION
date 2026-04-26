import { useState, useEffect } from 'react';

interface BeforeInstallPromptEvent extends Event {
    readonly platforms: string[];
    readonly userChoice: Promise<{
        outcome: 'accepted' | 'dismissed';
        platform: string;
    }>;
    prompt(): Promise<void>;
}

export type InstallState = 'idle' | 'prompting' | 'installing' | 'installed';

export function usePWA() {
    const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
    const [installState, setInstallState] = useState<InstallState>('idle');
    const [isInstallable, setIsInstallable] = useState(false);
    const [isInstalled, setIsInstalled] = useState(true);
    const [isIOS, setIsIOS] = useState(false);

    useEffect(() => {
        setIsIOS(/iPad|iPhone|iPod/.test(navigator.userAgent) && !(window as any).MSStream);

        const isStandalone = window.matchMedia('(display-mode: standalone)').matches ||
            (window.navigator as any).standalone === true;

        setIsInstalled(isStandalone);
        if (isStandalone) setInstallState('installed');

        const handleBeforeInstallPrompt = (e: Event) => {
            e.preventDefault();
            setDeferredPrompt(e as BeforeInstallPromptEvent);
            setIsInstallable(true);
        };

        const handleAppInstalled = () => {
            setIsInstallable(false);
            setIsInstalled(true);
            setInstallState('installed');
            setDeferredPrompt(null);
        };

        window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
        window.addEventListener('appinstalled', handleAppInstalled);

        return () => {
            window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
            window.removeEventListener('appinstalled', handleAppInstalled);
        };
    }, []);

    const installPWA = async () => {
        if (installState === 'installed') return; // Do nothing if already installed

        if (!deferredPrompt) {
            return;
        }

        setInstallState('prompting');
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;

        if (outcome === 'accepted') {
            setInstallState('installing');
            setIsInstallable(false);
        } else {
            setInstallState('idle');
        }

        setDeferredPrompt(null);
    };

    // Safest, simplest UX: If it's already installed, or if it's iOS (which doesn't natively support 1-click), completely hide the button so there's zero bugs or confusion.
    const shouldShowInstall = !isInstalled && !isIOS;

    return { isInstallable, isInstalled, shouldShowInstall, installState, installPWA };
}
