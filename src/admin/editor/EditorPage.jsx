import { useParams } from 'react-router';

import { TYPE_CONFIG, isContentType } from '../content-types.js';
import AdminNotFound from '../pages/AdminNotFound.jsx';

import EntityEditor from './EntityEditor.jsx';
import './editor.css';

/**
 * რედაქტორის როუტი (`/admin/:type/:id`, `id = new` — ახალი მასალა). ცალკე lazy chunk-ია
 * TipTap-თან ერთად — ადმინის სხვა ეკრანები მას არ ტვირთავს. ახალი მასალა პირველ შენახვაზე
 * იქმნება და მისამართი `replace`-ით `/:id`-ად იცვლება — კომპონენტი იგივე რჩება (იგივე როუტი).
 */
export default function EditorPage() {
  const { type, id = 'new' } = useParams();
  if (!isContentType(type) || (id === 'new' && !TYPE_CONFIG[type].creatable)) {
    return <AdminNotFound />;
  }
  return <EntityEditor key={type} type={type} routeId={id} />;
}
