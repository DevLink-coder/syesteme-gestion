<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Réinitialisation de votre mot de passe</title>
</head>
<body style="margin:0; padding:0; background-color:#f8fafc; font-family: 'Instrument Sans', ui-sans-serif, system-ui, sans-serif;">
<table width="100%" cellpadding="0" cellspacing="0" style="background-color:#f8fafc; padding: 32px 0;">
<tr><td align="center">
<table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff; border-radius:16px; overflow:hidden; border:1px solid #e2e8f0; max-width:600px; width:100%;">
<!-- Header -->
<tr><td style="background-color:#101828; padding:32px; text-align:center;">
<h1 style="margin:0; color:#ffffff; font-size:24px; font-weight:700; letter-spacing:-0.02em;">G.E.C.</h1>
<p style="margin:8px 0 0; color:#98a2b3; font-size:13px; letter-spacing:0.08em; text-transform:uppercase;">Groupe d'Enseignants Compétent</p>
</td></tr>

<!-- Body -->
<tr><td style="padding:32px;">
<h2 style="margin:0 0 8px; color:#101828; font-size:20px; font-weight:600;">Bonjour {{ $userName }},</h2>
<p style="margin:0 0 24px; color:#475467; font-size:14px; line-height:22px;">
Vous avez demandé à réinitialiser votre mot de passe. Cliquez sur le bouton ci-dessous pour choisir un nouveau mot de passe en toute sécurité.
</p>

<div style="text-align:center; margin-bottom:24px;">
<a href="{{ $resetUrl }}" style="display:inline-block; background-color:#101828; color:#ffffff; font-size:14px; font-weight:600; text-decoration:none; padding:12px 28px; border-radius:10px;">Réinitialiser mon mot de passe</a>
</div>

<p style="margin:0 0 8px; color:#475467; font-size:13px; line-height:20px;">
Ce lien est valable <strong>1 heure</strong>. Si le bouton ne fonctionne pas, copiez-collez cette adresse dans votre navigateur :
</p>
<p style="margin:0 0 24px; color:#344054; font-size:12px; word-break:break-all; background-color:#f9fafb; border:1px solid #e4e7ec; border-radius:8px; padding:12px;">{{ $resetUrl }}</p>

<p style="margin:0; color:#98a2b3; font-size:12px; line-height:18px;">
Si vous n'êtes pas à l'origine de cette demande, ignorez simplement cet email : votre mot de passe restera inchangé.
</p>
</td></tr>

<!-- Footer -->
<tr><td style="background-color:#f9fafb; border-top:1px solid #eaecf0; padding:20px 32px; text-align:center;">
<p style="margin:0; color:#98a2b3; font-size:12px;">© {{ date('Y') }} G.E.C. — Tous droits réservés.</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>
