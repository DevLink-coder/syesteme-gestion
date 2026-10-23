<?php

namespace Database\Seeders;

use App\Support\TenantDB;
use Illuminate\Database\Seeder;

class AuditLogSeeder extends Seeder
{
    public function run(): void
    {
        $logs = [
            ['code' => 'audit-15', 'author' => 'admin-001', 'name' => "Direction de l'Établissement", 'date' => '2026-09-18 10:32:00', 'type' => 'changement_statut', 'entity' => 'Statut — Enseignant — Mme Leroy (t-03)', 'year' => '2026-2027', 'avant' => 'Actif', 'apres' => 'Suspendu', 'details' => 'Suspension suite alerte créneaux impactés (6 créneaux)'],
            ['code' => 'audit-14', 'author' => 'admin-001', 'name' => "Direction de l'Établissement", 'date' => '2026-09-17 16:05:00', 'type' => 'modification_paiement', 'entity' => 'Paiement — Noé Tchinda (s08) — Inscription Première D 2026-2027', 'year' => '2026-2027', 'avant' => '5000 FCFA (partiel)', 'apres' => '12 000 FCFA (payé)', 'details' => 'Mensualité septembre régularisée'],
            ['code' => 'audit-13', 'author' => 'admin-002', 'name' => 'Mme Secrétaire', 'date' => '2026-09-16 09:12:00', 'type' => 'modification_note', 'entity' => 'Note — Mathématiques, Première C — Clara Ngo (s05)', 'year' => '2026-2027', 'avant' => '12 /20 (coef 6)', 'apres' => '15 /20 (coef 6)', 'details' => 'Correction après réclamation'],
            ['code' => 'audit-12', 'author' => 'admin-001', 'name' => "Direction de l'Établissement", 'date' => '2026-09-15 14:45:00', 'type' => 'changement_statut', 'entity' => 'Statut — Élève — Hugo Mbarga (s04) — Inscription Seconde C', 'year' => '2026-2027', 'avant' => 'Validée', 'apres' => 'En pause', 'details' => 'Pause demandée par la famille'],
            ['code' => 'audit-11', 'author' => 'admin-002', 'name' => 'Mme Secrétaire', 'date' => '2026-09-14 11:20:00', 'type' => 'modification_paiement', 'entity' => 'Paiement — Awa Diallo (s01) — Troisième 2026-2027', 'year' => '2026-2027', 'avant' => '24 000 FCFA', 'apres' => '36 000 FCFA', 'details' => 'Ajout mensualité octobre'],
        ];

        foreach ($logs as $l) {
            $authorId = TenantDB::table('users')->where('code', $l['author'])->value('id');
            $yearId = TenantDB::table('school_years')->where('code', $l['year'])->value('id');
            TenantDB::table('audit_logs')->updateOrInsert(
                ['code' => $l['code']],
                [
                    'author_id' => $authorId,
                    'author_name' => $l['name'],
                    'happened_at' => $l['date'],
                    'type' => $l['type'],
                    'entity' => $l['entity'],
                    'school_year_code' => $l['year'],
                    'school_year_id' => $yearId,
                    'old_value' => $l['avant'],
                    'new_value' => $l['apres'],
                    'details' => $l['details'],
                    'created_at' => $l['date'],
                    'updated_at' => now(),
                ]
            );
        }
    }
}
