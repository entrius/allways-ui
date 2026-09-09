// The one content frame every app page sits in: a centred 1400 block with
// the same side padding, the same headroom under the nav, and the same
// footroom, so pages line up as one site whatever they hold.
export const PAGE_FRAME_SX = {
  width: '100%',
  maxWidth: 1400,
  mx: 'auto',
  px: { xs: 1.5, sm: 2, md: 3 },
  pt: { xs: 1.5, md: 2 },
  pb: { xs: 2, md: 3 },
} as const;
