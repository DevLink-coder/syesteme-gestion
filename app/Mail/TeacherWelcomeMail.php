<?php

namespace App\Mail;

use Illuminate\Bus\Queueable;
use Illuminate\Mail\Mailable;
use Illuminate\Mail\Mailables\Content;
use Illuminate\Mail\Mailables\Envelope;
use Illuminate\Queue\SerializesModels;

class TeacherWelcomeMail extends Mailable
{
    use Queueable, SerializesModels;

    public string $teacherName;

    public string $teacherEmail;

    public string $plainPassword;

    public array $assignments; // [['room_id'=>'premiereC','subject'=>'Mathématiques','salle_name'=>'Première C'], ...]

    public function __construct(string $teacherName, string $teacherEmail, string $plainPassword, array $assignments)
    {
        $this->teacherName = $teacherName;
        $this->teacherEmail = $teacherEmail;
        $this->plainPassword = $plainPassword;
        $this->assignments = $assignments;
    }

    public function envelope(): Envelope
    {
        return new Envelope(
            subject: 'Bienvenue au G.E.C. — Vos accès enseignant',
        );
    }

    public function content(): Content
    {
        return new Content(
            view: 'mail.teacher-welcome',
            with: [
                'teacherName' => $this->teacherName,
                'teacherEmail' => $this->teacherEmail,
                'plainPassword' => $this->plainPassword,
                'assignments' => $this->assignments,
            ],
        );
    }

    public function attachments(): array
    {
        return [];
    }
}
