import SubscriptionAction from '@/features/subscribe/SubscriptionAction.jsx';

/** B6: გამოწერის გაუქმება ერთი ბმულით (`/subscribe/unsubscribe#token=…`, ka / en). */
export default function UnsubscribePage() {
  return <SubscriptionAction kind="unsubscribe" />;
}
