import * as React from 'react'

import { Heading, Text } from '@react-email/components'

import { CtaButton, EmailShell, FallbackLink, h1, note, text } from './_layout'

interface RecoveryEmailProps {
  siteName: string
  confirmationUrl: string
}

export const RecoveryEmail = ({
  siteName,
  confirmationUrl,
}: RecoveryEmailProps) => (
  <EmailShell preview={`Reset your password for ${siteName}`}>
    <Heading style={h1}>Reset your password</Heading>
    <Text style={text}>
      We received a request to reset the password for your {siteName} account.
      Choose a new one using the button below.
    </Text>
    <CtaButton href={confirmationUrl}>Choose a new password</CtaButton>
    <Text style={note}>
      Didn&apos;t request this? You can safely ignore this email — your password
      stays exactly as it is.
    </Text>
    <FallbackLink href={confirmationUrl} />
  </EmailShell>
)

export default RecoveryEmail
