import { MarketingShell } from './MarketingShell';
import { HeroSection } from './HeroSection';
import { ModesSection } from './ModesSection';
import { TemplatesSection } from './TemplatesSection';
import { FeatureBento } from './FeatureBento';
import { IntegrationsSection } from './IntegrationsSection';
import { PricingSection } from './PricingSection';
import { FaqSection } from './FaqSection';
import { FinalCta } from './FinalCta';
import { RevealController } from './RevealController';

export default function HomePage() {
  return (
    <MarketingShell>
      <HeroSection />
      <ModesSection />
      <TemplatesSection />
      <FeatureBento />
      <IntegrationsSection />
      <PricingSection />
      <FaqSection />
      <FinalCta />
      <RevealController />
    </MarketingShell>
  );
}
