'use client';
import { useBilling } from '@flowglad/nextjs';
import { useState } from 'react';

export default function PricingPage() {
    const { createCheckoutSession, loaded } = useBilling();
    const [submitting, setSubmitting] = useState(false);

    const handleSubscribe = async (priceSlug: string) => {
        if (!createCheckoutSession) return;
        setSubmitting(true);
        try {
            const res = await createCheckoutSession({
                priceSlug,
                successUrl: window.location.origin + '/dashboard',
                cancelUrl: window.location.origin + '/pricing',
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

    const isLoading = !loaded || submitting;

    return (
        <div className="min-h-screen bg-white">
            <div className="pt-24 pb-12 px-4 sm:px-6 lg:px-8 max-w-7xl mx-auto">
                <div className="text-center mb-16">
                    <h1 className="text-4xl font-bold text-gray-900 mb-4">Simple, Transparent Pricing</h1>
                    <p className="text-xl text-gray-600">Choose the plan that's right for you</p>
                </div>

                <div className="grid md:grid-cols-3 gap-8 max-w-6xl mx-auto">
                    {/* Free Plan */}
                    <div className="p-8 bg-gray-50 rounded-2xl border border-gray-200 flex flex-col">
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">Basic</h3>
                        <div className="text-4xl font-bold text-gray-900 mb-6">$0<span className="text-lg text-gray-600 font-normal">/mo</span></div>
                        <ul className="space-y-4 mb-8 text-gray-600 flex-1">
                            <li className="flex items-center gap-2">✓ 100k AI Tokens / month</li>
                            <li className="flex items-center gap-2">✓ Basic Support</li>
                        </ul>
                        <button className="w-full py-3 px-6 rounded-lg bg-gray-900 text-white font-semibold hover:bg-gray-800 transition">
                            Current Plan
                        </button>
                    </div>

                    {/* Pro Plan */}
                    <div className="p-8 bg-blue-50 rounded-2xl border border-blue-100 relative overflow-hidden flex flex-col">
                        <div className="absolute top-4 right-4 bg-blue-600 text-white text-xs font-bold px-3 py-1 rounded-full">POPULAR</div>
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">Pro</h3>
                        <div className="text-4xl font-bold text-gray-900 mb-6">$19<span className="text-lg text-gray-600 font-normal">/mo</span></div>
                        <ul className="space-y-4 mb-8 text-gray-600 flex-1">
                            <li className="flex items-center gap-2">✓ Unlimited Tokens</li>
                            <li className="flex items-center gap-2">✓ Priority Support</li>
                            <li className="flex items-center gap-2">✓ Advanced Analytics</li>
                        </ul>
                        <button 
                            onClick={() => handleSubscribe('starter_monthly')}
                            disabled={isLoading}
                            className="w-full py-3 px-6 rounded-lg bg-blue-600 text-white font-semibold hover:bg-blue-700 transition shadow-lg hover:shadow-xl disabled:opacity-50"
                        >
                            {isLoading ? 'Processing...' : 'Subscribe Now'}
                        </button>
                    </div>

                    {/* Credit Top Up */}
                    <div className="p-8 bg-purple-50 rounded-2xl border border-purple-100 flex flex-col">
                        <h3 className="text-2xl font-bold text-gray-900 mb-2">Credit Top Up</h3>
                        <div className="text-4xl font-bold text-gray-900 mb-6">$5<span className="text-lg text-gray-600 font-normal"> one-time</span></div>
                        <ul className="space-y-4 mb-8 text-gray-600 flex-1">
                            <li className="flex items-center gap-2">✓ Add 10,000 Extra Tokens</li>
                            <li className="flex items-center gap-2">✓ Never Expires</li>
                            <li className="flex items-center gap-2">✓ Use Anytime</li>
                        </ul>
                        <button 
                            onClick={() => handleSubscribe('prod_xifyHsc6yi530scT0A0nb')}
                            disabled={isLoading}
                            className="w-full py-3 px-6 rounded-lg bg-purple-600 text-white font-semibold hover:bg-purple-700 transition shadow-lg hover:shadow-xl disabled:opacity-50"
                        >
                            {isLoading ? 'Processing...' : 'Buy Credits'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
}
