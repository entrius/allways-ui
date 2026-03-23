import React from 'react';
import { Helmet } from 'react-helmet-async';

export interface SEOProps {
  title: string;
  description: string;
  image?: string;
  type?: 'website' | 'article';
  url?: string;
}

const SITE_NAME = 'Allways';
const DEFAULT_IMAGE = '/allways-og.jpg';

export const SEO: React.FC<SEOProps> = ({
  title,
  description,
  image = DEFAULT_IMAGE,
  type = 'website',
  url,
}) => {
  const currentUrl =
    url || (typeof window !== 'undefined' ? window.location.href : '');

  const absoluteImageUrl = image.startsWith('http')
    ? image
    : `${typeof window !== 'undefined' ? window.location.origin : ''}${image}`;

  const browserTitle =
    title === SITE_NAME ? SITE_NAME : `${title} | ${SITE_NAME}`;

  return (
    <Helmet>
      <title>{browserTitle}</title>
      <meta name="description" content={description} />
      <link rel="canonical" href={currentUrl} />

      <meta property="og:title" content={browserTitle} />
      <meta property="og:description" content={description} />
      <meta property="og:image" content={absoluteImageUrl} />
      <meta property="og:image:width" content="1200" />
      <meta property="og:image:height" content="630" />
      <meta property="og:url" content={currentUrl} />
      <meta property="og:type" content={type} />
      <meta property="og:site_name" content={SITE_NAME} />

      <meta name="twitter:card" content="summary_large_image" />
      <meta name="twitter:title" content={browserTitle} />
      <meta name="twitter:description" content={description} />
      <meta name="twitter:image" content={absoluteImageUrl} />
    </Helmet>
  );
};

export default SEO;
