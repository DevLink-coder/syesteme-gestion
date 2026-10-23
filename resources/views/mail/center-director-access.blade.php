<!doctype html>
<html lang="fr">
<body style="font-family:Arial,sans-serif;color:#1f2937;line-height:1.6">
    <h1>Bienvenue sur EduCore</h1>
    <p>Bonjour {{ $directorName }},</p>
    <p>Le centre <strong>{{ $centerName }}</strong> a été créé. Voici vos identifiants administrateur :</p>
    <p><strong>Adresse :</strong> {{ $directorEmail }}<br>
       <strong>Mot de passe provisoire :</strong> {{ $temporaryPassword }}</p>
    <p>Connectez-vous sur <a href="{{ url('/signin') }}">{{ url('/signin') }}</a>. Vous pourrez modifier ce mot de passe depuis votre profil si vous le souhaitez.</p>
    <p>Pour votre sécurité, ne transférez pas ce message et changez ce mot de passe dès que possible.</p>
</body>
</html>
