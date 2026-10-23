<?php

namespace App\Console\Commands;

use Illuminate\Console\Attributes\Description;
use Illuminate\Console\Attributes\Signature;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\Crypt;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Facades\Mail;

#[Signature('app:send-pending-emails')]
#[Description('Send pending emails stored in offline mode')]
class SendPendingEmails extends Command
{
    /**
     * Execute the console command.
     */
    public function handle()
    {
        $pendingEmails = DB::table('pending_emails')
            ->where('status', 'pending')
            ->where('retry_count', '<', 5)
            ->get();

        $this->info("Found {$pendingEmails->count()} pending emails to send.");

        foreach ($pendingEmails as $pending) {
            try {
                $data = json_decode($pending->mailable_data, true);
                // Déchiffrer le mot de passe avant de l'utiliser
                $password = isset($data['password']) ? Crypt::decrypt($data['password']) : '';
                $mailable = new $pending->mailable_class(
                    $data['name'],
                    $data['email'],
                    $password,
                    $data['assignments'] ?? []
                );

                Mail::to($pending->email)->send($mailable);

                DB::table('pending_emails')
                    ->where('id', $pending->id)
                    ->update([
                        'status' => 'sent',
                        'sent_at' => now(),
                        'updated_at' => now(),
                    ]);

                $this->info("Email sent to {$pending->email}");
                Log::info("Pending email sent to {$pending->email}");
            } catch (\Throwable $e) {
                DB::table('pending_emails')
                    ->where('id', $pending->id)
                    ->update([
                        'retry_count' => $pending->retry_count + 1,
                        'error_message' => $e->getMessage(),
                        'updated_at' => now(),
                    ]);

                $this->error("Failed to send email to {$pending->email}: {$e->getMessage()}");
                Log::error("Failed to send pending email to {$pending->email}: {$e->getMessage()}");
            }
        }

        $this->info('Pending emails processing completed.');

        return 0;
    }
}
