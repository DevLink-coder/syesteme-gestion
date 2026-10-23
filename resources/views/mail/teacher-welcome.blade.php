<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Bienvenue au G.E.C.</title>
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
<h2 style="margin:0 0 8px; color:#101828; font-size:20px; font-weight:600;">Bienvenue, {{ $teacherName }} !</h2>
<p style="margin:0 0 24px; color:#475467; font-size:14px; line-height:22px;">
Nous sommes ravis de vous compter parmi nos enseignants. Votre compte a été créé avec succès et vous pouvez dès à présent accéder à votre espace enseignant.
</p>

<!-- Credentials -->
<div style="background-color:#f9fafb; border:1px solid #e4e7ec; border-radius:12px; padding:20px; margin-bottom:24px;">
<p style="margin:0 0 12px; color:#101828; font-size:13px; font-weight:600; text-transform:uppercase; letter-spacing:0.06em;">Vos accès</p>
<table width="100%" cellpadding="0" cellspacing="0">
<tr>
<td style="padding:8px 0; color:#667085; font-size:13px; width:120px;">Email</td>
<td style="padding:8px 0; color:#101828; font-size:13px; font-weight:600; word-break:break-all;">{{ $teacherEmail }}</td>
</tr>
<tr>
<td style="padding:8px 0; color:#667085; font-size:13px;">Mot de passe</td>
<td style="padding:8px 0;">
<span style="display:inline-block; background-color:#ffffff; border:1px solid #d0d5dd; border-radius:8px; padding:6px 12px; color:#101828; font-size:14px; font-weight:600; font-family:monospace; letter-spacing:0.04em;">{{ $plainPassword }}</span>
</td>
</tr>
<tr>
<td style="padding:8px 0; color:#667085; font-size:13px;">Connexion</td>
<td style="padding:8px 0;"><a href="{{ config('app.url') }}/signin" style="color:#465fff; font-size:13px; font-weight:500; text-decoration:none;">{{ config('app.url') }}/signin → Espace Enseignant</a></td>
</tr>
</table>
<p style="margin:12px 0 0; color:#98a2b3; font-size:12px; line-height:18px;">
Vous pourrez modifier ce mot de passe à tout moment depuis votre profil (Mon profil → Informations personnelles).
</p>
</div>

<!-- Assignments -->
@if(count($assignments) > 0)
<div style="margin-bottom:24px;">
<p style="margin:0 0 12px; color:#101828; font-size:13px; font-weight:600; text-transform:uppercase; letter-spacing:0.06em;">Vos affectations</p>
<p style="margin:0 0 12px; color:#667085; font-size:13px;">Vous êtes assigné(e) aux salles et matières suivantes. Vous ne pourrez faire cours que dans ces salles et uniquement pour ces matières.</p>
<table width="100%" cellpadding="0" cellspacing="0" style="border:1px solid #e4e7ec; border-radius:12px; overflow:hidden;">
<tr style="background-color:#f9fafb;">
<th style="padding:10px 16px; text-align:left; color:#667085; font-size:12px; font-weight:600; text-transform:uppercase; letter-spacing:0.06em; border-bottom:1px solid #e4e7ec;">Salle</th>
<th style="padding:10px 16px; text-align:left; color:#667085; font-size:12px; font-weight:600; text-transform:uppercase; letter-spacing:0.06em; border-bottom:1px solid #e4e7ec;">Matière</th>
</tr>
@foreach($assignments as $a)
<tr>
<td style="padding:10px 16px; color:#344054; font-size:13px; border-top:1px solid #f2f4f7;">{{ $a['salle_name'] }} <span style="color:#98a2b3; font-size:12px;">({{ $a['room_id'] }})</span></td>
<td style="padding:10px 16px; color:#101828; font-size:13px; font-weight:500; border-top:1px solid #f2f4f7;">{{ $a['subject'] }}</td>
</tr>
@endforeach
</table>
</div>
@endif

<!-- CTA -->
<div style="text-align:center; margin-bottom:24px;">
<a href="{{ config('app.url') }}/signin" style="display:inline-block; background-color:#465fff; color:#ffffff; font-size:14px; font-weight:600; text-decoration:none; padding:12px 24px; border-radius:10px;">Accéder à mon espace</a>
</div>

<p style="margin:0; color:#667085; font-size:13px; line-height:20px;">
Besoin d'aide ? Répondez simplement à cet email ou contactez la direction.
</p>
<p style="margin:24px 0 0; color:#101828; font-size:13px; font-weight:500;">— La direction du G.E.C.</p>
<p style="margin:4px 0 0; color:#98a2b3; font-size:12px;">Centre de Répétition • Cameroun • PWA GEC v1.0</p>
</td></tr>

<!-- Footer -->
<tr><td style="background-color:#f9fafb; border-top:1px solid #e4e7ec; padding:16px 32px; text-align:center;">
<p style="margin:0; color:#98a2b3; font-size:11px; line-height:16px;">
Ceci est un message automatique, merci de ne pas y répondre directement sauf besoin d'assistance.<br>
Vos identifiants sont personnels et confidentiels.
</p>
</td></tr>
</table>
</td></tr>
</table>
</body>
</html>
