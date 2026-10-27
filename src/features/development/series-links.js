/**
 * სერიის მისამართი სლაიდერში (`SeriesCard`-ის ბმულის ფორმატი, F3) — გაზიარების ბმულიც ესაა.
 * @param {string} slug
 * @returns {string}
 */
export const seriesHref = (slug) => `/development?series=${encodeURIComponent(slug)}`;
