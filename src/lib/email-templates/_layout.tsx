import * as React from 'react'

import {
  Body,
  Button,
  Container,
  Font,
  Head,
  Heading,
  Hr,
  Html,
  Link,
  Preview,
  Section,
  Text,
} from '@react-email/components'

export const palette = {
  ink: '#0A0908',
  bordeaux: '#49111C',
  smoke: '#F2F4F3',
  taupe: '#A9927D',
  stone: '#5E503F',
  muted: '#6B6257',
  border: '#E6E2DB',
  card: '#FFFFFF',
}

const FONT_STACK =
  "'Montserrat', -apple-system, BlinkMacSystemFont, 'Segoe UI', Helvetica, Arial, sans-serif"

export const main = {
  backgroundColor: '#ffffff',
  fontFamily: FONT_STACK,
  margin: '0',
  padding: '0',
}

const outer = {
  backgroundColor: '#ffffff',
  padding: '32px 16px',
}

const card = {
  maxWidth: '560px',
  margin: '0 auto',
  backgroundColor: palette.card,
  border: `1px solid ${palette.border}`,
  borderRadius: '20px',
  overflow: 'hidden' as const,
}

const brandBar = {
  backgroundColor: palette.ink,
  padding: '22px 32px',
}

const brandText = {
  margin: '0',
  color: '#FFFFFF',
  fontSize: '19px',
  fontWeight: 700 as const,
  letterSpacing: '-0.02em',
}

const brandTag = {
  margin: '4px 0 0',
  color: palette.taupe,
  fontSize: '11px',
  fontWeight: 600 as const,
  letterSpacing: '0.14em',
  textTransform: 'uppercase' as const,
}

const inner = { padding: '36px 32px 8px' }

export const h1 = {
  fontSize: '26px',
  lineHeight: '1.25',
  fontWeight: 700 as const,
  color: palette.ink,
  letterSpacing: '-0.02em',
  margin: '0 0 14px',
}

export const text = {
  fontSize: '15px',
  lineHeight: '1.65',
  color: palette.stone,
  margin: '0 0 18px',
}

export const link = {
  color: palette.bordeaux,
  fontWeight: 600 as const,
  textDecoration: 'underline',
}

export const button = {
  display: 'inline-block',
  backgroundColor: palette.bordeaux,
  color: '#FFFFFF',
  fontSize: '15px',
  fontWeight: 700 as const,
  letterSpacing: '0.01em',
  borderRadius: '14px',
  padding: '15px 30px',
  textDecoration: 'none',
  textAlign: 'center' as const,
}

export const buttonWrap = { margin: '8px 0 26px' }

export const note = {
  fontSize: '13px',
  lineHeight: '1.6',
  color: palette.muted,
  backgroundColor: palette.smoke,
  border: `1px solid ${palette.border}`,
  borderRadius: '12px',
  padding: '14px 16px',
  margin: '0 0 8px',
}

export const codeBox = {
  fontFamily: "'SFMono-Regular', Menlo, Consolas, monospace",
  fontSize: '30px',
  fontWeight: 700 as const,
  letterSpacing: '0.28em',
  color: palette.ink,
  backgroundColor: palette.smoke,
  border: `1px solid ${palette.border}`,
  borderRadius: '14px',
  padding: '20px 16px',
  textAlign: 'center' as const,
  margin: '0 0 22px',
}

const hr = {
  borderColor: palette.border,
  borderStyle: 'solid' as const,
  borderWidth: '1px 0 0',
  margin: '28px 0 18px',
}

const footerText = {
  fontSize: '12px',
  lineHeight: '1.7',
  color: '#9A9186',
  margin: '0 0 4px',
}

const footerPad = { padding: '0 32px 30px' }

export const EmailShell = ({
  preview,
  children,
}: {
  preview: string
  children: React.ReactNode
}) => (
  <Html lang="en" dir="ltr">
    <Head>
      <Font
        fontFamily="Montserrat"
        fallbackFontFamily="Helvetica"
        webFont={{
          url: 'https://fonts.gstatic.com/s/montserrat/v26/JTUHjIg1_i6t8kCHKm4532VJOt5-QNFgpCtr6Hw0aXp-p7K4KLjztg.woff2',
          format: 'woff2',
        }}
        fontWeight={400}
        fontStyle="normal"
      />
      <Font
        fontFamily="Montserrat"
        fallbackFontFamily="Helvetica"
        webFont={{
          url: 'https://fonts.gstatic.com/s/montserrat/v26/JTUHjIg1_i6t8kCHKm4532VJOt5-QNFgpCuM73w0aXp-p7K4KLjztg.woff2',
          format: 'woff2',
        }}
        fontWeight={700}
        fontStyle="normal"
      />
    </Head>
    <Preview>{preview}</Preview>
    <Body style={main}>
      <Section style={outer}>
        <Container style={card}>
          <Section style={brandBar}>
            <Text style={brandText}>FreshTrack</Text>
            <Text style={brandTag}>Know what&apos;s fresh</Text>
          </Section>
          <Section style={inner}>{children}</Section>
          <Section style={footerPad}>
            <Hr style={hr} />
            <Text style={footerText}>
              Need a hand? Write to us at{' '}
              <Link href="mailto:hello@fresh-track.in" style={link}>
                hello@fresh-track.in
              </Link>
            </Text>
            <Text style={footerText}>
              FreshTrack — smart pantry tracking, less food waste.
            </Text>
          </Section>
        </Container>
      </Section>
    </Body>
  </Html>
)

export const CtaButton = ({
  href,
  children,
}: {
  href: string
  children: React.ReactNode
}) => (
  <Section style={buttonWrap}>
    <Button style={button} href={href}>
      {children}
    </Button>
  </Section>
)

export const FallbackLink = ({ href }: { href: string }) => (
  <Text style={{ ...footerText, wordBreak: 'break-all' as const }}>
    Button not working? Paste this link into your browser:
    <br />
    <Link href={href} style={link}>
      {href}
    </Link>
  </Text>
)
