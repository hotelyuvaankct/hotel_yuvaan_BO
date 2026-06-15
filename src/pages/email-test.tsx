import { FormEvent, useEffect, useState } from 'react';
import { Mail, Send } from 'lucide-react';
import { ApiError, api } from '@/lib/api';
import type { EmailTestTemplateSample } from '@/lib/api-types';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/components/ui/toast';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { FullPageLoader } from '@/components/common/loading-state';
import { TextField } from '@/components/ui/form-fields';
import { isValidEmail } from '@/lib/form-validation';

export function EmailTestPage() {
  const { session } = useAuth();
  const { showToast } = useToast();
  const [samples, setSamples] = useState<EmailTestTemplateSample[]>([]);
  const [loading, setLoading] = useState(true);
  const [recipientEmail, setRecipientEmail] = useState(session?.user?.email ?? '');
  const [emailError, setEmailError] = useState('');
  const [sendingTemplate, setSendingTemplate] = useState<string | null>(null);

  useEffect(() => {
    async function loadSamples() {
      setLoading(true);
      try {
        setSamples((await api.getEmailTestSamples()) ?? []);
      } catch (err) {
        showToast(err instanceof Error ? err.message : 'Unable to load email templates.', 'error');
      } finally {
        setLoading(false);
      }
    }

    void loadSamples();
  }, [showToast]);

  function validateRecipientEmail() {
    if (!recipientEmail.trim()) {
      setEmailError('Recipient email is required.');
      return false;
    }
    if (!isValidEmail(recipientEmail.trim())) {
      setEmailError('Enter a valid email address.');
      return false;
    }
    setEmailError('');
    return true;
  }

  async function sendTest(template: EmailTestTemplateSample['template']) {
    if (!validateRecipientEmail()) return;

    setSendingTemplate(template);
    try {
      await api.sendTestEmail({
        template,
        recipientEmail: recipientEmail.trim(),
      });
      showToast(`Test email sent to ${recipientEmail.trim()}`, 'success');
    } catch (err) {
      const message =
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : 'Failed to send test email.';
      showToast(message, 'error');
    } finally {
      setSendingTemplate(null);
    }
  }

  async function onSendAll(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validateRecipientEmail()) return;

    for (const sample of samples) {
      setSendingTemplate(sample.template);
      try {
        await api.sendTestEmail({
          template: sample.template,
          recipientEmail: recipientEmail.trim(),
        });
      } catch (err) {
        showToast(
          err instanceof Error ? err.message : `Failed to send ${sample.label}.`,
          'error',
        );
        setSendingTemplate(null);
        return;
      }
    }

    setSendingTemplate(null);
    showToast(`All ${samples.length} test emails sent to ${recipientEmail.trim()}`, 'success');
  }

  if (loading) return <FullPageLoader label="Loading email templates..." />;

  return (
    <div className="space-y-6 animate-fade-in-up">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mail className="h-5 w-5" />
            Email Template Testing
          </CardTitle>
          <CardDescription>
            Send Brevo transactional emails with pre-filled sample data. For testing only.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form className="flex flex-col gap-4 sm:flex-row sm:items-end" onSubmit={onSendAll}>
            <TextField
              label="Recipient email"
              type="email"
              placeholder="you@example.com"
              value={recipientEmail}
              onChange={(event) => {
                setRecipientEmail(event.target.value);
                if (emailError) setEmailError('');
              }}
              error={emailError}
              hint="All test emails will be delivered to this address."
              required
              wrapperClassName="flex-1"
            />
            <Button type="submit" variant="gold" disabled={samples.length === 0 || Boolean(sendingTemplate)}>
              <Send className="h-4 w-4" />
              Send all templates
            </Button>
          </form>
        </CardContent>
      </Card>

      <section className="grid gap-6 xl:grid-cols-2">
        {samples.map((sample) => (
          <Card key={sample.template}>
            <CardHeader>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <CardTitle>{sample.label}</CardTitle>
                  <CardDescription className="mt-1">{sample.htmlFile}</CardDescription>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Badge variant="secondary">Brevo #{sample.brevoTemplateId || 'local'}</Badge>
                  <Badge variant="outline">{sample.senderEmail}</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2 text-sm">
                <p>
                  <span className="font-medium text-muted-foreground">Subject:</span>{' '}
                  {sample.subject}
                </p>
                <p>
                  <span className="font-medium text-muted-foreground">Preview:</span>{' '}
                  {sample.previewText}
                </p>
              </div>

              <div className="rounded-xl border border-border bg-muted/40 p-4">
                <p className="mb-3 text-sm font-medium">Pre-filled sample data</p>
                <dl className="grid gap-2 text-sm">
                  {Object.entries(sample.sampleData).map(([key, value]) => (
                    <div key={key} className="grid grid-cols-[140px_1fr] gap-2">
                      <dt className="text-muted-foreground">{key}</dt>
                      <dd className="break-all font-medium">{String(value ?? '-')}</dd>
                    </div>
                  ))}
                </dl>
              </div>

              <Button
                type="button"
                variant="outline"
                className="w-full"
                disabled={Boolean(sendingTemplate)}
                onClick={() => void sendTest(sample.template)}
              >
                <Send className="h-4 w-4" />
                {sendingTemplate === sample.template ? 'Sending...' : 'Send test email'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </section>
    </div>
  );
}
