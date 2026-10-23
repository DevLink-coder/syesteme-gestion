<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Queue\SerializesModels;

class CenterDirectorAccessMail extends Mailable
{
    use Queueable, SerializesModels;

    public string $centerName;

    public function __construct(
        public string $directorName,
        public string $directorEmail,
        public string $temporaryPassword,
        array $assignments = [],
    ) {
        $this->centerName = (string) ($assignments['center_name'] ?? 'votre centre');
    }

    public function build(): self
    {
        return $this->subject('Votre accès administrateur EduCore')
            ->view('mail.center-director-access');
    }
}
