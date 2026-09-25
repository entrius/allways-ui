import React, { useMemo, useState } from 'react';
import { Box, Typography } from '@mui/material';
import { isAlpha, type ChainInfo } from '../../api/models/chains';
import { FONTS } from '../../theme';
import {
  SettingsCheck as Check,
  SettingsSeg as Seg,
  settingsLabelSx as labelSx,
  settingsLinkSx as linkSx,
  settingsNoteSx as noteSx,
  settingsRowSx as rowSx,
} from '../workspace/WidgetSettings';
import { quotedIds, useBestTakeable } from './takeable';
import {
  HEADER_PRESETS,
  MATRIX_WIDTHS,
  MAX_ROWS_OPTIONS,
  sameParts,
  type HeaderParts,
  type MatrixSettings,
} from './matrixSettings';

// Port of allways-matrix SettingsPanel: the rows of the Matrix widget's
// settings panel (the gear in its title row). Labels, favorites-only, and
// the sheet's entries, one axis at a time: the rows (hubs and 128 subnets)
// or the columns (the assets they trade against), with a filter, bulk
// switches, and a show/hide box and a star per entry.

const PARTS: { key: keyof HeaderParts; label: string }[] = [
  { key: 'logo', label: 'logo' },
  { key: 'ticker', label: 'ticker' },
  { key: 'network', label: 'network' },
];

type Axis = 'rows' | 'cols';

const sectionSx = {
  ...labelSx,
  pt: 1,
  pb: 0.25,
  mt: 0.5,
  borderTop: '1px solid',
  borderColor: 'divider',
} as const;

const Star: React.FC<{ on: boolean; onClick: () => void }> = ({
  on,
  onClick,
}) => (
  <Box
    component="button"
    type="button"
    title={on ? 'unstar' : 'star'}
    onClick={onClick}
    sx={{
      all: 'unset',
      cursor: 'pointer',
      ml: 'auto',
      fontSize: 12,
      lineHeight: 1,
      color: on ? '#e8b923' : 'border.light',
      '&:hover': { color: on ? '#e8b923' : 'text.secondary' },
    }}
  >
    ★
  </Box>
);

// A text toggle: on reads in the text colour with a 1px outline, off is
// dim. Used for the label parts, which any combination may switch on.
const Toggle: React.FC<{
  on: boolean;
  onClick: () => void;
  children: React.ReactNode;
}> = ({ on, onClick, children }) => (
  <Box
    component="button"
    type="button"
    aria-pressed={on}
    onClick={onClick}
    sx={{
      all: 'unset',
      cursor: 'pointer',
      px: 0.75,
      py: 0.125,
      fontFamily: FONTS.mono,
      fontSize: '0.62rem',
      border: '1px solid',
      borderColor: on ? 'text.primary' : 'transparent',
      color: on ? 'text.primary' : 'text.disabled',
      '&:hover': { color: 'text.primary' },
    }}
  >
    {children}
  </Box>
);

// Every chain that has at least one live quote on either leg.
const useQuotedIds = (): Set<string> => {
  const { map } = useBestTakeable();
  return useMemo(() => quotedIds(map), [map]);
};

const RateMatrixSettings: React.FC<{
  assets: ChainInfo[];
  settings: MatrixSettings;
  update: (patch: Partial<MatrixSettings>) => void;
  toggleHidden: (id: string) => void;
  toggleFavorite: (id: string) => void;
}> = ({ assets, settings, update, toggleHidden, toggleFavorite }) => {
  const [axis, setAxis] = useState<Axis>('rows');
  const [query, setQuery] = useState('');
  const quoted = useQuotedIds();

  // The two axes, in the sheet's own order: rows by volume, columns by
  // market cap. Hubs sit on both.
  const rows = assets.filter((a) => a.hub || isAlpha(a.id));
  const cols = assets.filter((a) => !isAlpha(a.id));
  const list = axis === 'rows' ? rows : cols;
  const hideable = list.filter((a) => !a.hub);
  const shownCount = hideable.filter(
    (a) => !settings.hidden.includes(a.id),
  ).length;

  const q = query.trim().toLowerCase();
  const matches = (a: ChainInfo) =>
    !q ||
    a.symbol.toLowerCase().includes(q) ||
    a.id.includes(q) ||
    (a.network ?? '').toLowerCase().includes(q) ||
    // "7" finds SN7 as well as SN17, SN70...
    (isAlpha(a.id) && a.id.slice(2).includes(q));
  const filtered = list.filter(matches);

  // Bulk switches act on what the filter shows, so "hide all" after
  // typing "usdc" hides only the USDC columns.
  const targets = filtered.filter((a) => !a.hub).map((a) => a.id);
  const setHidden = (hide: (id: string) => boolean) => {
    const rest = settings.hidden.filter((id) => !targets.includes(id));
    update({ hidden: [...rest, ...targets.filter(hide)] });
  };

  return (
    <>
      <Typography component="div" sx={{ ...labelSx, pt: 0.25, pb: 0.25 }}>
        width
      </Typography>
      <Box sx={rowSx}>
        <Seg
          left
          options={MATRIX_WIDTHS.map((w) => ({
            value: String(w),
            label: w === 'fit' ? 'fit' : `${w} col`,
          }))}
          value={String(settings.width)}
          onChange={(v) =>
            update({ width: v === 'fit' ? 'fit' : (Number(v) as 1 | 2 | 3) })
          }
        />
      </Box>
      <Typography component="div" sx={noteSx}>
        {settings.width === 'fit'
          ? 'As wide as its columns need, up to the whole desk.'
          : `${settings.width} of the desk\u2019s columns; the sheet scrolls sideways past that.`}
      </Typography>

      <Typography component="div" sx={sectionSx}>
        labels
      </Typography>
      <Box sx={rowSx}>
        <Seg
          left
          options={HEADER_PRESETS.map((p) => ({
            value: p.name,
            label: p.name,
          }))}
          value={
            HEADER_PRESETS.find((p) => sameParts(settings.header, p.parts))
              ?.name ?? ''
          }
          onChange={(name) => {
            const preset = HEADER_PRESETS.find((p) => p.name === name);
            if (preset) update({ header: preset.parts });
          }}
        />
      </Box>
      <Box sx={{ ...rowSx, gap: 0.5 }}>
        {PARTS.map((part) => (
          <Toggle
            key={part.key}
            on={settings.header[part.key]}
            onClick={() =>
              update({
                header: {
                  ...settings.header,
                  [part.key]: !settings.header[part.key],
                },
              })
            }
          >
            {part.label}
          </Toggle>
        ))}
      </Box>

      <Typography component="div" sx={sectionSx}>
        view
      </Typography>
      <Box sx={rowSx}>
        <Check
          checked={settings.favoritesOnly}
          onChange={() => update({ favoritesOnly: !settings.favoritesOnly })}
        >
          <span>favorites only</span>
        </Check>
        <Typography
          component="span"
          sx={{ ml: 'auto', fontSize: '0.62rem', color: 'text.disabled' }}
        >
          {settings.favorites.length
            ? `${settings.favorites.length} starred`
            : 'none starred'}
        </Typography>
      </Box>
      <Box sx={rowSx}>
        <Check
          checked={settings.quotedOnly}
          onChange={() => update({ quotedOnly: !settings.quotedOnly })}
        >
          <span>quoted only</span>
        </Check>
        <Typography
          component="span"
          sx={{ ml: 'auto', fontSize: '0.62rem', color: 'text.disabled' }}
        >
          hides empty rows
        </Typography>
      </Box>
      <Box sx={rowSx}>
        <Typography component="span" sx={{ fontSize: '0.72rem' }}>
          rows before scroll
        </Typography>
        <Seg
          options={MAX_ROWS_OPTIONS.map((n) => ({
            value: String(n),
            label: String(n),
          }))}
          value={String(settings.maxRows)}
          onChange={(v) => update({ maxRows: Number(v) })}
        />
      </Box>

      <Typography component="div" sx={sectionSx}>
        sheet
      </Typography>
      <Box sx={rowSx}>
        <Seg
          left
          options={[
            { value: 'rows', label: `rows ${rows.length}` },
            { value: 'cols', label: `columns ${cols.length}` },
          ]}
          value={axis}
          onChange={(v) => setAxis(v as Axis)}
        />
        <Typography
          component="span"
          sx={{ ml: 'auto', fontSize: '0.62rem', color: 'text.disabled' }}
        >
          {shownCount}/{hideable.length} on
        </Typography>
      </Box>
      <Box
        component="input"
        type="search"
        value={query}
        placeholder={
          axis === 'rows' ? 'filter: sn7, 12…' : 'filter: usdc, base…'
        }
        onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
          setQuery(e.target.value)
        }
        sx={{
          width: '100%',
          boxSizing: 'border-box',
          my: 0.5,
          px: 0.75,
          py: 0.5,
          fontFamily: FONTS.mono,
          fontSize: '0.68rem',
          color: 'text.primary',
          backgroundColor: 'transparent',
          border: '1px solid',
          borderColor: 'border.light',
          borderRadius: 0,
          outline: 'none',
          '&:focus': { borderColor: 'text.primary' },
        }}
      />
      {targets.length > 0 && (
        <Box sx={{ display: 'flex', gap: 1.5, py: 0.25 }}>
          <Box
            component="button"
            type="button"
            sx={linkSx}
            onClick={() => setHidden(() => false)}
          >
            show all
          </Box>
          <Box
            component="button"
            type="button"
            sx={linkSx}
            onClick={() => setHidden(() => true)}
          >
            hide all
          </Box>
        </Box>
      )}
      <Box component="ul" sx={{ listStyle: 'none', m: 0, p: 0 }}>
        {filtered.map((a) => {
          const shown = !settings.hidden.includes(a.id);
          const fav = settings.favorites.includes(a.id);
          const live = quoted.has(a.id);
          const name = (
            <>
              <Typography
                component="span"
                sx={{
                  fontFamily: FONTS.mono,
                  fontSize: '0.72rem',
                  fontWeight: 600,
                  color: shown ? 'text.primary' : 'text.disabled',
                }}
              >
                {a.symbol}
              </Typography>
              {a.network && !isAlpha(a.id) && (
                <Typography
                  component="span"
                  sx={{
                    fontFamily: FONTS.mono,
                    fontSize: '0.6rem',
                    color: shown ? 'text.secondary' : 'text.disabled',
                  }}
                >
                  {a.network}
                </Typography>
              )}
            </>
          );
          return (
            <Box
              component="li"
              key={a.id}
              sx={{ display: 'flex', alignItems: 'center', gap: 1, py: 0.375 }}
            >
              {a.hub ? (
                // A hub is always on the sheet (a row and a column), so it
                // has no show/hide box; it can be starred so favorites-only
                // keeps it.
                <Box
                  sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    pl: 2.5,
                  }}
                  title="Hubs always show; star one to keep it under favorites only."
                >
                  {name}
                </Box>
              ) : (
                <Check checked={shown} onChange={() => toggleHidden(a.id)}>
                  {name}
                </Check>
              )}
              {!live && (
                <Typography
                  component="span"
                  sx={{
                    ml: 'auto',
                    fontFamily: FONTS.mono,
                    fontSize: '0.58rem',
                    color: 'text.disabled',
                  }}
                >
                  no quotes
                </Typography>
              )}
              <Box sx={{ ml: live ? 'auto' : 0, display: 'flex' }}>
                <Star on={fav} onClick={() => toggleFavorite(a.id)} />
              </Box>
            </Box>
          );
        })}
        {filtered.length === 0 && (
          <Typography
            component="li"
            sx={{ py: 1, fontSize: '0.65rem', color: 'text.disabled' }}
          >
            nothing matches “{query}”
          </Typography>
        )}
      </Box>
    </>
  );
};

export default RateMatrixSettings;
