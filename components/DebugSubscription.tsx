'use client';
import { useBilling } from '@flowglad/nextjs';

export function DebugSubscription() {
    const { currentSubscription } = useBilling();
    
    if (!currentSubscription) return null;

    return (
        <pre className="bg-gray-100 p-4 rounded text-xs overflow-auto max-w-lg fixed bottom-4 right-4 z-50">
            {JSON.stringify(currentSubscription, null, 2)}
        </pre>
    );
}
