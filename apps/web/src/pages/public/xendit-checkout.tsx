import { useQuery } from '@tanstack/react-query';
import { CreditCard, Landmark, QrCode } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { XenditComponents, type XenditPaymentChannel } from 'xendit-components-web';
import { Button } from '@/components/ui/button';
import { api, errorMessage } from '@/lib/api';
import './xendit-checkout.css';

type CheckoutEvents = {
  onPaymentStarted: (started: boolean) => void;
  onStatusChange: (sync?: boolean) => void;
};

const supportedChannels = /^(QRIS|CARDS|[A-Z0-9_]+_VIRTUAL_ACCOUNT)$/;

function channelCode(channel: XenditPaymentChannel) {
  return Array.isArray(channel.channelCode) ? channel.channelCode[0]! : channel.channelCode;
}

function isBank(channel: XenditPaymentChannel) {
  return channelCode(channel).endsWith('_VIRTUAL_ACCOUNT');
}

function channelLabel(channel: XenditPaymentChannel) {
  switch (channelCode(channel)) {
    case 'CARDS':
      return 'Kartu kredit atau debit';
    case 'QRIS':
      return 'QRIS';
    default:
      return channel.brandName.replace(/ Virtual Account$/i, '');
  }
}

function PaymentOption({
  channel,
  name,
  selected,
  onChange,
}: {
  channel: XenditPaymentChannel;
  name: string;
  selected: boolean;
  onChange: () => void;
}) {
  const [logoFailed, setLogoFailed] = useState(false);
  const code = channelCode(channel);
  const FallbackIcon = code === 'CARDS' ? CreditCard : code === 'QRIS' ? QrCode : Landmark;

  return (
    <label className="block min-w-0 cursor-pointer">
      <input
        type="radio"
        name={name}
        value={code}
        checked={selected}
        onChange={onChange}
        className="peer sr-only"
      />
      <span className="flex min-h-14 items-center gap-2 rounded-lg border border-slate-300 bg-white px-2.5 py-2 hover:border-blue-500 peer-checked:border-blue-600 peer-checked:bg-blue-50 peer-focus-visible:ring-2 peer-focus-visible:ring-blue-600 peer-focus-visible:ring-offset-2 peer-disabled:cursor-default peer-disabled:opacity-70 sm:gap-3 sm:px-3">
        <span className="grid h-8 w-10 shrink-0 place-items-center sm:w-12">
          {channel.brandLogoUrl && !logoFailed ? (
            <img
              src={channel.brandLogoUrl}
              alt=""
              className="max-h-8 max-w-full object-contain"
              onError={() => setLogoFailed(true)}
            />
          ) : (
            <FallbackIcon aria-hidden="true" className="size-5 text-slate-600" />
          )}
        </span>
        <span className="min-w-0 flex-1 break-words text-sm font-medium text-slate-900">
          {channelLabel(channel)}
        </span>
        <span
          aria-hidden="true"
          className={
            selected
              ? 'size-4 shrink-0 rounded-full border-[5px] border-blue-600 bg-white'
              : 'size-4 shrink-0 rounded-full border border-slate-400 bg-white'
          }
        />
      </span>
    </label>
  );
}

export function XenditCheckout({
  orderCode,
  orderToken,
  onPaymentStarted,
  onStatusChange,
}: CheckoutEvents & { orderCode: string; orderToken?: string }) {
  const checkout = useQuery({
    queryKey: ['xendit-checkout', orderCode, orderToken],
    queryFn: async ({ signal }) => {
      const session = await api<{ alreadyPaid: boolean; componentsSdkKey?: string }>(
        `/orders/${encodeURIComponent(orderCode)}/payment`,
        { method: 'POST', orderToken, signal },
      );
      onStatusChange(false);
      if (!session.alreadyPaid && !session.componentsSdkKey) {
        throw new Error('Sesi pembayaran belum tersedia.');
      }
      return session;
    },
    retry: false,
    staleTime: Infinity,
    gcTime: 0,
  });

  if (checkout.isError) {
    return (
      <div className="mt-5 space-y-3 border-t border-slate-200 pt-5">
        <p role="alert" className="text-sm text-rose-700">
          {errorMessage(checkout.error)}
        </p>
        <Button type="button" variant="outline" onClick={() => void checkout.refetch()}>
          Muat ulang metode pembayaran
        </Button>
      </div>
    );
  }

  const sdkKey = checkout.data?.componentsSdkKey;
  if (checkout.isFetching || !sdkKey) {
    return (
      <p className="mt-5 text-sm text-slate-600" role="status">
        {checkout.data?.alreadyPaid ? 'Memeriksa status pembayaran…' : 'Memuat metode pembayaran…'}
      </p>
    );
  }

  return (
    <XenditPaymentForm
      key={checkout.dataUpdatedAt}
      sdkKey={sdkKey}
      onPaymentStarted={onPaymentStarted}
      onStatusChange={onStatusChange}
      onRetry={() => {
        onPaymentStarted(false);
        void checkout.refetch();
      }}
    />
  );
}

function XenditPaymentForm({
  sdkKey,
  onPaymentStarted,
  onStatusChange,
  onRetry,
}: CheckoutEvents & { sdkKey: string; onRetry: () => void }) {
  const methodsName = useId();
  const sdk = useRef<XenditComponents | null>(null);
  const fields = useRef<HTMLDivElement>(null);
  const actions = useRef<HTMLDivElement>(null);
  const actionHeading = useRef<HTMLHeadingElement>(null);
  const [channels, setChannels] = useState<XenditPaymentChannel[] | null>(null);
  const [method, setMethod] = useState('');
  const [ready, setReady] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [showAction, setShowAction] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [fatal, setFatal] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    const fieldContainer = fields.current!;
    const actionContainer = actions.current!;
    const listeners = new AbortController();
    const options = { signal: listeners.signal };

    function showLoadError() {
      setFatal(true);
      setMessage('Metode pembayaran belum bisa dimuat.');
    }

    function startPayment() {
      setSubmitting(true);
      onPaymentStarted(true);
      setMessage('');
    }

    try {
      const components = new XenditComponents({ componentsSdkKey: sdkKey, preloadLocale: 'id' });
      sdk.current = components;
      components.addEventListener(
        'init',
        () => {
          try {
            actionContainer.replaceChildren(components.createActionContainerComponent());
            setChannels(components.getActiveChannels({ filter: supportedChannels }));
          } catch {
            showLoadError();
          }
        },
        options,
      );
      components.addEventListener('submission-ready', () => setReady(true), options);
      components.addEventListener('submission-not-ready', () => setReady(false), options);
      components.addEventListener('submission-begin', startPayment, options);
      components.addEventListener('submission-resume', startPayment, options);
      components.addEventListener('action-begin', () => setShowAction(true), options);
      components.addEventListener('action-end', () => setShowAction(false), options);
      components.addEventListener(
        'submission-end',
        (event) => {
          setSubmitting(false);
          if (event.userErrorMessage?.length) setMessage(event.userErrorMessage.join(' '));
          else if (event.developerErrorMessage) setMessage('Pembayaran belum berhasil. Coba lagi.');
          if (event.userErrorMessage?.length || event.developerErrorMessage)
            onPaymentStarted(false);
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
      components.addEventListener('fatal-error', showLoadError, options);
    } catch {
      showLoadError();
    }
    return () => {
      listeners.abort();
      sdk.current = null;
      fieldContainer.replaceChildren();
      actionContainer.replaceChildren();
    };
  }, [onPaymentStarted, onStatusChange, sdkKey]);

  useEffect(() => {
    if (!showAction) return;
    const heading = actionHeading.current;
    heading?.focus({ preventScroll: true });
    heading?.scrollIntoView({ block: 'start', behavior: 'instant' });
  }, [showAction]);

  function chooseMethod(channel: XenditPaymentChannel) {
    const client = sdk.current;
    if (!client || !fields.current) return;
    setMethod(channelCode(channel));
    setMessage('');
    fields.current.replaceChildren(client.createChannelComponent(channel));
  }

  function renderOption(channel: XenditPaymentChannel) {
    const code = channelCode(channel);
    return (
      <PaymentOption
        key={code}
        channel={channel}
        name={methodsName}
        selected={method === code}
        onChange={() => chooseMethod(channel)}
      />
    );
  }

  const bankChannels = channels?.filter(isBank);
  const standardChannels = channels
    ?.filter((channel) => !isBank(channel))
    .sort(
      (left, right) => Number(channelCode(right) === 'QRIS') - Number(channelCode(left) === 'QRIS'),
    );
  const canChoose = !fatal && !verifying && !showAction;

  return (
    <div className="mt-5 border-t border-slate-200 pt-5">
      {canChoose && channels === null ? (
        <p role="status" className="text-sm text-slate-600">
          Memuat metode pembayaran…
        </p>
      ) : null}
      {canChoose && channels?.length ? (
        <fieldset disabled={submitting} className="min-w-0">
          <legend className="mb-3 scroll-mt-6 text-base font-semibold text-slate-900">
            Pilih metode pembayaran
          </legend>
          {standardChannels?.length ? (
            <div className="grid gap-2 sm:grid-cols-2">{standardChannels.map(renderOption)}</div>
          ) : null}
          {bankChannels?.length ? (
            <div className={standardChannels?.length ? 'mt-4' : undefined}>
              <p className="mb-2 text-sm font-medium text-slate-700">Virtual Account</p>
              <div className="grid gap-2 min-[375px]:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
                {bankChannels.map(renderOption)}
              </div>
            </div>
          ) : null}
        </fieldset>
      ) : null}
      <div ref={fields} hidden={!canChoose || method !== 'CARDS'} className="mt-4 min-w-0" />
      {canChoose && channels?.length ? (
        <Button
          type="button"
          disabled={!method || !ready || submitting}
          onClick={() => sdk.current?.submit()}
          className="mt-4 w-full sm:w-auto"
        >
          {submitting ? 'Menyiapkan pembayaran…' : 'Lanjutkan Pembayaran'}
        </Button>
      ) : null}
      {showAction && !fatal && !verifying ? (
        <h3
          ref={actionHeading}
          tabIndex={-1}
          className="mb-3 scroll-mt-6 text-base font-semibold text-slate-900"
        >
          Instruksi pembayaran
        </h3>
      ) : null}
      <div ref={actions} className="gofest-payment-action min-w-0" />
      {verifying ? (
        <p role="status" className="mt-3 text-sm text-slate-600">
          Menunggu konfirmasi pembayaran.
        </p>
      ) : null}
      {canChoose && channels?.length === 0 ? (
        <p role="status" className="text-sm text-slate-600">
          QRIS, Virtual Account, dan kartu belum tersedia untuk pesanan ini.
        </p>
      ) : null}
      {message ? (
        <p role="alert" className="mt-3 text-sm text-rose-700">
          {message}
        </p>
      ) : null}
      {fatal ? (
        <Button type="button" variant="outline" onClick={onRetry} className="mt-3">
          Muat ulang pembayaran
        </Button>
      ) : null}
    </div>
  );
}
