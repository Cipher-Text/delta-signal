import type { Metadata } from 'next';
import LegalPage from '../../../components/legal-page';

export const metadata: Metadata = {
  title: 'User Data Deletion — Delta Signal',
  description: 'Request deletion of your Delta Signal account and personal information.',
};

export default function DataDeletionPage() {
  return (
    <LegalPage
      label="Privacy request"
      title="User Data Deletion"
      intro="You can request deletion of your Delta Signal account and associated personal information at any time."
      sections={[
        {
          title: 'How to request deletion',
          children: (
            <ol>
              <li>Send an email to <a href="mailto:privacy@deltasignal.org" className="text-link">privacy@deltasignal.org</a> from the email address associated with your account.</li>
              <li>Use the subject line <strong>Delete my Delta Signal data</strong>.</li>
              <li>Include your Delta Signal account email and any relevant organization or profile identifier.</li>
            </ol>
          ),
        },
        {
          title: 'What happens next',
          children: (
            <p>We will verify the request, delete or anonymize eligible personal information, and confirm completion. Some information may be retained where required by law, needed to prevent fraud or abuse, or preserved in aggregated or anonymized environmental records that no longer identify you.</p>
          ),
        },
        {
          title: 'Connected social accounts',
          children: (
            <p>If you connected a social platform, you can also revoke Delta Signal’s access from that platform’s account settings. Revoking access does not by itself delete your Delta Signal account, so send the deletion request as described above.</p>
          ),
        },
        {
          title: 'Questions',
          children: (
            <p>For questions about a deletion request, contact <a href="mailto:privacy@deltasignal.org" className="text-link">privacy@deltasignal.org</a>.</p>
          ),
        },
      ]}
    />
  );
}
