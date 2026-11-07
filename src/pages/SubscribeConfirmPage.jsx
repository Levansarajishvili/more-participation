import SubscriptionAction from '@/features/subscribe/SubscriptionAction.jsx';

/** B6: გამოწერის დადასტურება წერილის ბმულიდან (`/subscribe/confirm#token=…`, ka / en). */
export default function SubscribeConfirmPage() {
  return <SubscriptionAction kind="confirm" />;
}
