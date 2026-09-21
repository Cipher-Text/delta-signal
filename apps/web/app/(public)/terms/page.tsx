import type { Metadata } from 'next';
import LegalPage from '../../../components/legal-page';

export const metadata: Metadata = {
  title: 'Terms of Service — Delta Signal',
  description: 'Terms governing use of the Delta Signal platform.',
};

export default function TermsPage() {
  return (
    <LegalPage
      label="Legal"
      title="Terms of Service"
      intro="These terms govern your use of Delta Signal. By using the platform, you agree to use it responsibly and in accordance with these terms."
      sections={[
        {
          title: 'Using Delta Signal',
          children: (
            <p>You may use Delta Signal only for lawful purposes. You are responsible for the accuracy of information you submit, for protecting your account credentials, and for activity carried out through your account.</p>
          ),
        },
        {
          title: 'Community contributions',
          children: (
            <p>Do not submit content that is fraudulent, defamatory, abusive, invasive of privacy, unlawful, harmful, or unrelated to the platform’s environmental and civic purposes. We may review, limit, or remove content that violates these terms or threatens the integrity of the service.</p>
          ),
        },
        {
          title: 'Content and license',
          children: (
            <p>You retain rights in content you submit. By submitting content, you grant Delta Signal a non-exclusive, worldwide, royalty-free license to host, reproduce, process, moderate, display, and distribute that content as needed to operate and improve the platform and its public environmental data products.</p>
          ),
        },
        {
          title: 'Environmental information',
          children: (
            <p>Data on Delta Signal may be incomplete, delayed, estimated, or subject to revision. It is provided for information and civic research purposes and should not be treated as a substitute for official emergency, medical, legal, or professional advice.</p>
          ),
        },
        {
          title: 'Third-party services',
          children: (
            <p>Some features may connect to third-party services, including social platforms. Those services have their own terms and privacy policies. You are responsible for authorizing only accounts and Pages you are permitted to connect.</p>
          ),
        },
        {
          title: 'Availability and changes',
          children: (
            <p>We may change, suspend, or discontinue features, and may update these terms as the platform evolves. Continued use after an update means you accept the revised terms.</p>
          ),
        },
        {
          title: 'Contact',
          children: (
            <p>Questions about these terms can be sent to <a href="mailto:privacy@deltasignal.org" className="text-link">privacy@deltasignal.org</a>.</p>
          ),
        },
      ]}
    />
  );
}
