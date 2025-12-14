import Navbar from '../components/landing/Navbar';
import Hero from '../components/landing/Hero';
import Features from '../components/landing/Features';
import HowItWorks from '../components/landing/HowItWorks';
import CTA from '../components/landing/CTA';
import Footer from '../components/landing/Footer';
import TokenUsageDemo from '../components/TokenUsageDemo';

export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      <Navbar />
      <Hero />
      <div className="container mx-auto px-4">
        <TokenUsageDemo />
      </div>
      <Features />
      <HowItWorks />
      <CTA />
      <Footer />
    </main>
  );
}
