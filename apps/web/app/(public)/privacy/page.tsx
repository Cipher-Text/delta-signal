import type { Metadata } from 'next';
import Link from 'next/link';
import LegalPage from '../../../components/legal-page';

export const metadata: Metadata = {
  title: 'Privacy Policy — Delta Signal',
  description: 'How Delta Signal collects, uses, and protects information.',
};

export default function PrivacyPage() {
  return (
    <LegalPage
      label="Legal"
      title="Privacy Policy"
      intro="Delta Signal is a civic environmental intelligence platform for Bangladesh. This policy explains what information we collect, why we use it, and the choices available to you."
      sections={[
        {
          title: 'Information we collect',
          children: (
            <>
              <p>We collect information you provide when you create an account, submit an environmental report, add an observation, join an organization, or contact us. This may include your name, email address, organization details, location information, and the content of your submissions.</p>
              <p>We also collect technical information needed to operate and secure the service, such as authentication records, audit events, device and request information, and usage metrics.</p>
            </>
          ),
        },
        {
          title: 'How we use information',
          children: (
            <p>We use information to provide and improve Delta Signal, authenticate accounts, moderate and verify community submissions, display environmental data, send requested notifications, protect the platform, and meet legal obligations. We do not sell personal information.</p>
          ),
        },
        {
          title: 'Public submissions and visibility',
          children: (
            <p>Reports, observations, and other contributions may be displayed publicly after moderation. Do not include sensitive personal information in a public submission. Account and profile visibility controls apply where the platform provides them.</p>
          ),
        },
        {
          title: 'Sharing and service providers',
          children: (
            <p>We share information only as needed to operate the platform, provide connected services you choose to use, comply with law, investigate abuse, or protect people and the service. Service providers process information under appropriate contractual and security controls.</p>
          ),
        },
        {
          title: 'Retention and security',
          children: (
            <p>We retain information for as long as necessary for the purposes described here, including maintaining environmental records and meeting legal or security requirements. We use access controls, encryption where appropriate, audit logging, and other reasonable safeguards, but no internet service can guarantee absolute security.</p>
          ),
        },
        {
          title: 'Your choices',
          children: (
            <p>You may update eligible account information, adjust available profile visibility settings, or request deletion of your account and personal information. See our <Link href="/data-deletion" className="text-link">data deletion instructions</Link> for details.</p>
          ),
        },
        {
          title: 'Contact',
          children: (
            <p>Questions about privacy or this policy can be sent to <a href="mailto:privacy@deltasignal.org" className="text-link">privacy@deltasignal.org</a>.</p>
          ),
        },
      ]}
    />
  );
}
