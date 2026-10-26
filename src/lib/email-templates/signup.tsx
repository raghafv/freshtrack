import * as React from 'react'

import { Heading, Link, Text } from '@react-email/components'

import {
  CtaButton,
  EmailShell,
  FallbackLink,
  h1,
  link,
  note,
  text,
} from './_layout'

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  siteUrl,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <EmailShell preview={`Confirm your email for ${siteName}`}>
    <Heading style={h1}>Confirm your email</Heading>
    <Text style={text}>
      Welcome to{' '}
      <Link href={siteUrl} style={link}>
        {siteName}
      </Link>
      . One quick step and your pantry is ready — confirm{' '}
      <Link href={`mailto:${recipient}`} style={link}>
        {recipient}
      </Link>{' '}
      to activate your account.
    </Text>
    <CtaButton href={confirmationUrl}>Verify my email</CtaButton>
    <Text style={note}>
      This link expires soon and can only be used once. If you didn&apos;t
      create a FreshTrack account, you can safely ignore this email.
    </Text>
    <FallbackLink href={confirmationUrl} />
  </EmailShell>
)

export default SignupEmail
