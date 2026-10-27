import { useEffect } from 'react';
import { useSearchParams } from 'react-router';

/**
 * ვიდეოს არჩევა URL-ში: `/videos?video={slug}` (VideoCard, F3; §9.13). prompt-ის `?v=` მიიღება და
 * `replace`-ით `?video=`-ად იქცევა (ისტორია არ ივსება, სხვა პარამეტრები — `category`, utm — რჩება).
 *
 * @returns {string | null}  slug ან null (ნაგულისხმევი — კვირის ვიდეო)
 */
export function useVideoParam() {
  const [params, setParams] = useSearchParams();
  const video = params.get('video');
  const alias = params.get('v');

  useEffect(() => {
    if (!alias) return;
    setParams(
      (previous) => {
        const next = new URLSearchParams(previous);
        if (!next.get('video')) next.set('video', alias);
        next.delete('v');
        return next;
      },
      { replace: true, preventScrollReset: true },
    );
  }, [alias, setParams]);

  return video || alias || null;
}

/**
 * ბარათის ბმული: კატეგორია რჩება, რომ სია არ შეიცვალოს.
 * @param {string} slug
 * @param {string | null} [category]
 */
export function videoHref(slug, category = null) {
  const params = new URLSearchParams();
  if (category) params.set('category', category);
  params.set('video', slug);
  return `/videos?${params}`;
}
