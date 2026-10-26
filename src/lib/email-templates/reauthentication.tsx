import * as React from 'react'

import { Heading, Text } from '@react-email/components'

import { EmailShell, codeBox, h1, note, text } from './_layout'

interface ReauthenticationEmailProps {
  token: string
}

export const ReauthenticationEmail = ({
  token,
}: ReauthenticationEmailProps) => (
  <EmailShell preview="Your FreshTrack verification code">
    <Heading style={h1}>Confirm it&apos;s you</Heading>
    <Text style={text}>Enter this code in FreshTrack to continue:</Text>
    <Text style={codeBox}>{token}</Text>
    <Text style={note}>
      This code expires shortly. If you didn&apos;t request it, ignore this
      email and consider changing your password.
    </Text>
  </EmailShell>
)

export default ReauthenticationEmail
