export type EmailContent = {
  subject: string;
  text: string;
  html: string;
};

export function buildPasswordResetEmail(code: string, validityMinutes: number): EmailContent {
  const subject = 'Code de réinitialisation Resource Manager';
  const text = [
    'Bonjour,',
    '',
    'Vous avez demandé la réinitialisation de votre mot de passe Resource Manager.',
    '',
    `Votre code de vérification : ${code}`,
    '',
    `Ce code est valable ${validityMinutes} minutes et ne peut être utilisé qu’une seule fois.`,
    '',
    'Si vous n’êtes pas à l’origine de cette demande, ignorez cet email : votre mot de passe reste inchangé.',
    '',
    'Resource Manager',
  ].join('\n');

  const html = `<!doctype html>
<html lang="fr">
  <body style="margin:0;padding:24px;background:#f5f7f6;font-family:Arial,Helvetica,sans-serif;color:#1f2937;">
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:480px;margin:0 auto;background:#ffffff;border-radius:12px;padding:32px;">
      <tr><td>
        <p style="margin:0 0 8px;font-size:18px;font-weight:bold;color:#14532d;">Resource Manager</p>
        <p style="margin:0 0 16px;font-size:15px;line-height:22px;">Vous avez demandé la réinitialisation de votre mot de passe.</p>
        <p style="margin:0 0 8px;font-size:14px;color:#4b5563;">Votre code de vérification :</p>
        <p style="margin:0 0 16px;font-size:32px;font-weight:bold;letter-spacing:8px;color:#111827;">${code}</p>
        <p style="margin:0 0 16px;font-size:14px;line-height:20px;color:#4b5563;">Ce code est valable ${validityMinutes} minutes et ne peut être utilisé qu’une seule fois.</p>
        <p style="margin:0;font-size:13px;line-height:19px;color:#6b7280;">Si vous n’êtes pas à l’origine de cette demande, ignorez cet email : votre mot de passe reste inchangé.</p>
      </td></tr>
    </table>
  </body>
</html>`;

  return { subject, text, html };
}
