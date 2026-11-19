import { useEffect, useRef, useState } from 'react';
import { XenditComponents, type XenditPaymentChannel } from 'xendit-components-web';
import { Button } from '@/components/ui/button';

type Props = {
  sdkKey: string;
  onPaymentStarted: (started: boolean) => void;
  onStatusChange: () => void;
  onRetry: () => void;
};

const supportedChannels = /^(QRIS|CARDS|[A-Z0-9_]+_VIRTUAL_ACCOUNT)$/;

function channelLabel(channel: XenditPaymentChannel) {
  const code = Array.isArray(channel.channelCode) ? channel.channelCode[0] : channel.channelCode;
  if (code === 'CARDS') return 'Kartu kredit atau debit';
  if (code === 'QRIS') return 'QRIS';
  return channel.brandName.includes('Virtual Account')
    ? channel.brandName
    : `${channel.brandName} Virtual Account`;
}

export function XenditCheckout({ sdkKey, onPaymentStarted, onStatusChange, onRetry }: Props) {
  const sdk = useRef<XenditComponents | null>(null);
  const fields = useRef<HTMLDivElement>(null);
  const actions = useRef<HTMLDivElement>(null);
  const [channels, setChannels] = useState<XenditPaymentChannel[] | null>(null);
  const [method, setMethod] = useState('');
  const [ready, setReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [fatal, setFatal] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fieldContainer = fields.current!;
    const actionContainer = actions.current!;
    const listeners = new AbortController();
    const options = { signal: listeners.signal };
    try {
      const components = new XenditComponents({ componentsSdkKey: sdkKey, preloadLocale: 'id' });
      sdk.current = components;
      components.addEventListener(
        'init',
        () => {
          actionContainer.replaceChildren(components.createActionContainerComponent());
          setChannels(components.getActiveChannels({ filter: supportedChannels }));
        },
        options,
      );
      components.addEventListener('submission-ready', () => setReady(true), options);
      components.addEventListener('submission-not-ready', () => setReady(false), options);
      components.addEventListener(
        'submission-begin',
        () => {
          setSubmitting(true);
          onPaymentStarted(true);
          setMessage('');
        },
        options,
      );
      components.addEventListener('submission-resume', () => setSubmitting(true), options);
      components.addEventListener(
        'submission-end',
        (event) => {
          setSubmitting(false);
          if (event.userErrorMessage?.length) setMessage(event.userErrorMessage.join(' '));
          else if (event.developerErrorMessage) setMessage('Pembayaran belum berhasil. Coba lagi.');
        },
        options,
      );
      components.addEventListener(
        'session-complete',
        () => {
          setVerifying(true);
          onStatusChange();
        },
        options,
      );
      components.addEventListener('session-pending', () => setVerifying(true), options);
      components.addEventListener('session-not-pending', () => setVerifying(false), options);
      components.addEventListener(
        'session-expired-or-canceled',
        () => {
          setFatal(true);
          setMessage('Sesi pembayaran sudah berakhir.');
          onStatusChange();
        },
        options,
      );
      components.addEventListener(
        'fatal-error',
        () => {
          setFatal(true);
          setMessage('Metode pembayaran belum bisa dimuat.');
        },
        options,
      );
    } catch {
      setFatal(true);
      setMessage('Metode pembayaran belum bisa dimuat.');
    }
    return () => {
      listeners.abort();
      sdk.current = null;
      fieldContainer.replaceChildren();
      actionContainer.replaceChildren();
    };
  }, [onPaymentStarted, onStatusChange, sdkKey]);

  function chooseMethod(value: string) {
    const channel = channels?.find((entry) => channelLabel(entry) === value);
    const client = sdk.current;
    if (!client || !fields.current) return;
    setMethod(value);
    setMessage('');
    if (channel) {
      fields.current.replaceChildren(client.createChannelComponent(channel));
    } else {
      client.setCurrentChannel(null);
      fields.current.replaceChildren();
    }
  }

  return (
    <div className="mt-5 space-y-4 border-t border-slate-200 pt-5">
      <div hidden={fatal || verifying}>
        <label htmlFor="xendit-method" className="mb-2 block text-sm font-medium">
          Metode pembayaran
        </label>
        <select
          id="xendit-method"
          className="min-h-11 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm sm:max-w-sm"
          value={method}
          onChange={(event) => chooseMethod(event.target.value)}
          disabled={!channels?.length || submitting}
        >
          <option value="">
            {channels ? 'Pilih metode pembayaran' : 'Memuat metode pembayaran…'}
          </option>
          {channels?.map((channel) => {
            const label = channelLabel(channel);
            return (
              <option key={label} value={label}>
                {label}
              </option>
            );
          })}
        </select>
      </div>
      <div ref={fields} hidden={fatal || verifying} className="min-w-0" />
      <div ref={actions} className="min-w-0" />
      {method && !fatal && !verifying ? (
        <Button type="button" disabled={!ready || submitting} onClick={() => sdk.current?.submit()}>
          {submitting
            ? 'Memproses…'
            : method === 'QRIS'
              ? 'Tampilkan QRIS'
              : method.endsWith('Virtual Account')
                ? 'Tampilkan nomor VA'
                : 'Bayar dengan kartu'}
        </Button>
      ) : null}
      {verifying ? (
        <p role="status" className="text-sm text-slate-600">
          Menunggu konfirmasi pembayaran.
        </p>
      ) : null}
      {channels?.length === 0 ? (
        <p role="status" className="text-sm text-slate-600">
          QRIS, Virtual Account, dan kartu belum tersedia untuk pesanan ini.
        </p>
      ) : null}
      {message ? (
        <p role="alert" className="text-sm text-rose-700">
          {message}
        </p>
      ) : null}
      {fatal ? (
        <Button type="button" variant="outline" onClick={onRetry}>
          Muat ulang pembayaran
        </Button>
      ) : null}
    </div>
  );
}
