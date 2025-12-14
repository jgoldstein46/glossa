'use client';

import { useState } from 'react';
import { useBilling } from '@flowglad/nextjs';
import TokenUsageDemo from '@/components/TokenUsageDemo';
import Link from 'next/link';

export default function DashboardPage() {
    const { currentSubscription, loaded, checkUsageBalance, createCheckoutSession } = useBilling();
    const [submitting, setSubmitting] = useState(false);

    const handleTopUp = async () => {
        if (!createCheckoutSession) return;
        setSubmitting(true);
        try {
            const res = await createCheckoutSession({
                priceSlug: 'speech_token',
                successUrl: window.location.origin + '/dashboard',
                cancelUrl: window.location.origin + '/dashboard',
                autoRedirect: true
            });
            if ('error' in res) {
                alert('Checkout failed: ' + JSON.stringify(res.error));
            }
        } catch (e) {
            console.error('Checkout error:', e);
            alert('Error starting checkout');
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
            {/* Simple Dashboard Header */}
            <header className="bg-white dark:bg-gray-800 shadow">
                <div className="max-w-7xl mx-auto py-6 px-4 sm:px-6 lg:px-8 flex justify-between items-center">
                    <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
                    <Link href="/" className="text-blue-600 hover:text-blue-500">
                        Back to Home
                    </Link>
                </div>
            </header>

            <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
                {/* Subscription Status Card */}
                <div className="bg-white dark:bg-gray-800 overflow-hidden shadow rounded-lg mb-8">
                    <div className="px-4 py-5 sm:p-6">
                        <h2 className="text-lg font-medium leading-6 text-gray-900 dark:text-white mb-4">
                            Your Subscription
                        </h2>
                        
                        {!loaded ? (
                            <p className="text-gray-500">Loading subscription details...</p>
                        ) : currentSubscription ? (
                            <div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                    <div className="p-4 bg-green-50 dark:bg-green-900/20 rounded border border-green-100 dark:border-green-900">
                                        <p className="text-sm text-green-700 dark:text-green-400 font-medium">Current Plan</p>
                                        <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                                            Active Plan 
                                            <span className="text-sm font-normal text-gray-500 ml-2">
                                                ({currentSubscription.interval})
                                            </span>
                                        </p>
                                        <p className="text-sm text-gray-500 mt-2">
                                            Status: <span className="capitalize">{currentSubscription.status}</span>
                                        </p>
                                    </div>
                                    <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded border border-blue-100 dark:border-blue-900">
                                        <p className="text-sm text-blue-700 dark:text-blue-400 font-medium">Available Credits</p>
                                        <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">
                                            {/* Hackathon Logic: Base 100k + Flowglad Balance */}
                                            {(100000 + (checkUsageBalance('ai_tokens')?.availableBalance || 0)).toLocaleString()}
                                        </p>
                                        <p className="text-sm text-gray-500 mt-2">
                                            Tokens Remaining
                                        </p>
                                    </div>
                                    <div className="p-4 bg-gray-50 dark:bg-gray-700 rounded border border-gray-200 dark:border-gray-600">
                                        <p className="text-sm text-gray-500 dark:text-gray-400 font-medium">Top Up</p>
                                        <div className="mt-2 space-y-2">
                                            <button 
                                                onClick={handleTopUp}
                                                disabled={submitting}
                                                className="block text-center w-full px-4 py-2 bg-blue-600 text-white rounded-md text-sm font-medium hover:bg-blue-700 transition disabled:opacity-50"
                                            >
                                                {submitting ? 'Processing...' : 'Add $5 Credit (10k)'}
                                            </button>
                                            <Link 
                                                href="/pricing" 
                                                className="block text-center w-full px-4 py-2 border border-gray-300 dark:border-gray-500 rounded-md text-sm font-medium text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-600"
                                            >
                                                Change Plan
                                            </Link>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-yellow-50 dark:bg-yellow-900/20 p-4 rounded-md">
                                <p className="text-yellow-700 dark:text-yellow-400 mb-4">
                                    You don&apos;t have an active subscription.
                                </p>
                                <Link 
                                    href="/pricing"
                                    className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-blue-600 hover:bg-blue-700"
                                >
                                    View Plans
                                </Link>
                            </div>
                        )}
                    </div>
                </div>

                {/* Token Usage Demo Section */}
                <div className="bg-white dark:bg-gray-800 shadow rounded-lg p-6">
                    <h2 className="text-lg font-medium text-gray-900 dark:text-white mb-4">AI Usage Playground</h2>
                    <TokenUsageDemo />
                </div>
            </main>
        </div>
    );
}
