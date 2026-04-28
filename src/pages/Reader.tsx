/**
 * "Reader" route. The actual ScoreReader is mounted globally in AppLayout
 * as a persistent background. This route renders nothing — it just signals
 * to AppLayout (via the path) that no page-overlay should be displayed,
 * giving the user direct, uninterrupted access to the score.
 */
const Reader = () => null;
export default Reader;
