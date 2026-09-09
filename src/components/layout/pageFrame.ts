// The one content frame every app page sits in: the landing page's centred
// 1400 block and side padding (see landing/Section), so content edges line
// up with the hero and the landing sections on every route, plus the same
// headroom under the nav and the same footroom.
export const PAGE_FRAME_SX = {
  width: '100%',
  maxWidth: 1400,
  mx: 'auto',
  px: { xs: 2, sm: 3, md: 6 },
  pt: { xs: 1.5, md: 2 },
  pb: { xs: 2, md: 3 },
} as const;
