import type { Metadata } from 'next';
import LegalPage from '../../../components/legal-page';

export const metadata: Metadata = {
  title: 'Contact — Delta Signal',
  description: 'How to reach the Delta Signal team.',
};

export default function ContactPage() {
  return (
    <LegalPage
      label="Get in touch"
      title="Contact"
      intro="Delta Signal is an independent public platform. For questions about the data, a correction, a partnership enquiry, or anything else, reach us by email."
      sections={[
        {
          title: 'Email',
          children: (
            <p>
              <a href="mailto:privacy@deltasignal.org" className="text-link">privacy@deltasignal.org</a>
            </p>
          ),
        },
      ]}
    />
  );
}
