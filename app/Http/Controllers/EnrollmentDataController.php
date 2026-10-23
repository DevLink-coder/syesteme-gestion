<?php

namespace App\Http\Controllers;

use App\Models\Inscription;
use App\Models\Payment;
use App\Models\Salle;
use App\Models\SchoolYear;
use App\Models\Student;
use App\Models\Tarif;
use App\Support\CameroonPhoneNumber;
use App\Support\PersonName;
use App\Support\SystemNotificationLogger;
use App\Support\TenantRules;
use Illuminate\Http\Request;

class EnrollmentDataController extends Controller
{
    public function students(Request $request)
    {
        $students = Student::query()
            ->with(['inscriptions' => function ($query) {
                $query->with(['salle', 'schoolYear', 'tarif'])->orderByDesc('date_inscription');
            }])
            ->orderBy('name')
            ->get()
            ->map(function ($student) {
                $inscriptions = $student->inscriptions->map(function ($inscription) use ($student) {
                    return [
                        'id' => (string) $inscription->id,
                        'studentId' => (string) $student->id,
                        'salleId' => (string) $inscription->salle_id,
                        'schoolYearId' => (string) $inscription->school_year_id,
                        'tarifId' => (string) $inscription->tarif_id,
                        'statut' => $inscription->statut,
                        'dateInscription' => $inscription->date_inscription?->format('Y-m-d'),
                        'createdAt' => $inscription->created_at?->format('Y-m-d'),
                    ];
                })->values();

                $latestPayment = Payment::query()
                    ->where('student_id', $student->id)
                    ->where('status', '!=', 'impayé')
                    ->orderByDesc('paid_at')
                    ->first();

                return [
                    'id' => (string) $student->id,
                    'code' => $student->code,
                    'name' => $student->name,
                    'student' => [
                        'name' => $student->name,
                    ],
                    'parentName' => $student->parent_name,
                    'parentWhatsApp' => $student->parent_whatsapp,
                    'roomId' => $student->room_id ?? 'non-renseigne',
                    'enrollmentStatus' => $student->enrollment_status ?? 'validée',
                    'language' => $student->language,
                    'inscriptions' => $inscriptions,
                    'lastPaymentDate' => $latestPayment?->paid_at?->format('Y-m-d'),
                ];
            })->values();

        $inscriptions = Inscription::query()
            ->with(['salle', 'schoolYear', 'tarif'])
            ->orderByDesc('date_inscription')
            ->get()
            ->map(fn ($inscription) => [
                'id' => (string) $inscription->id,
                'studentId' => (string) $inscription->student_id,
                'salleId' => (string) $inscription->salle_id,
                'schoolYearId' => (string) $inscription->school_year_id,
                'tarifId' => (string) $inscription->tarif_id,
                'statut' => $inscription->statut,
                'dateInscription' => $inscription->date_inscription?->format('Y-m-d'),
                'createdAt' => $inscription->created_at?->format('Y-m-d'),
            ])->values();

        $payments = Payment::query()
            ->with(['inscription'])
            ->orderByDesc('paid_at')
            ->get()
            ->map(function ($payment) {
                return [
                    'id' => (string) $payment->id,
                    'inscriptionId' => (string) $payment->inscription_id,
                    'amount' => (int) $payment->amount,
                    'date' => $payment->paid_at?->format('Y-m-d') ?? $payment->due_date?->format('Y-m-d'),
                    'type' => $payment->type,
                    'status' => $payment->status,
                    'reference' => $payment->code,
                ];
            })->values();

        $studentModel = $students[0] ?? null;

        return response()->json([
            'data' => [
                'students' => $students,
                'inscriptions' => $inscriptions,
                'payments' => $payments,
            ],
            'students' => $students,
            'student' => $studentModel ? [
                'name' => $studentModel['name'],
            ] : null,
            'inscriptions' => $inscriptions,
            'payments' => $payments,
        ]);
    }

    public function tarifs(Request $request)
    {
        $tarifs = Tarif::query()
            ->with(['salle', 'schoolYear'])
            ->orderBy('salle_id')
            ->orderBy('school_year_id')
            ->get()
            ->map(fn ($tarif) => [
                'id' => (string) $tarif->id,
                'salleId' => (string) $tarif->salle_id,
                'schoolYearId' => (string) $tarif->school_year_id,
                'salleLabel' => $tarif->salle?->name,
                'schoolYearLabel' => $tarif->schoolYear?->label,
                'fraisInscription' => (int) $tarif->frais_inscription,
                'mensualite' => (int) $tarif->mensualite,
                'nombreMois' => (int) ($tarif->nombre_mois ?? 9),
                'code' => $tarif->code,
            ])->values();

        return response()->json([
            'data' => $tarifs,
            'tarifs' => $tarifs,
        ]);
    }

    public function dettes(Request $request)
    {
        $rows = Inscription::query()
            ->with(['student', 'salle', 'schoolYear', 'tarif', 'payments'])
            ->whereIn('statut', ['En attente de paiement', 'Validée', 'En pause'])
            ->get()
            ->map(function ($inscription) {
                $due = 0;
                $monthlyDue = 0;
                $tarif = $inscription->tarif;
                if ($tarif) {
                    $start = $inscription->date_inscription?->copy()->startOfDay() ?? now()->startOfDay();
                    $today = now()->startOfDay();
                    // Utiliser le nombre de mois de l'inscription, sinon celui du tarif
                    $nbMois = (int) ($inscription->nombre_mois ?? $tarif->nombre_mois ?? 9);
                    $due = (int) $tarif->frais_inscription;
                    for ($month = 0; $month < $nbMois; $month++) {
                        if ($start->copy()->addMonthsNoOverflow($month)->gt($today)) {
                            break;
                        }
                        $due += (int) $tarif->mensualite;
                    }
                    // Calcul du solde mensuel (mensualité du mois en cours)
                    $monthsPassed = 0;
                    for ($month = 0; $month < $nbMois; $month++) {
                        if ($start->copy()->addMonthsNoOverflow($month)->gt($today)) {
                            break;
                        }
                        $monthsPassed++;
                    }
                    // Premier mois : inscription + mensualité
                    if ($monthsPassed >= 1) {
                        $monthlyDue = (int) $tarif->frais_inscription + (int) $tarif->mensualite;
                    }
                }

                $payments = $inscription->payments ?? collect();
                $paid = (int) $payments
                    ->filter(fn ($payment) => $payment->status !== 'impayé'
                        && (! $payment->paid_at || $payment->paid_at->lte(now())))
                    ->sum('amount');
                $paid = min($due, $paid);
                $solde = max(0, $due - $paid);
                $monthlyPaid = min($monthlyDue, $paid);
                $monthlySolde = max(0, $monthlyDue - $monthlyPaid);

                return [
                    'inscriptionId' => (string) $inscription->id,
                    'studentId' => (string) $inscription->student_id,
                    'studentName' => $inscription->student?->name,
                    'studentCode' => $inscription->student?->code,
                    'roomLabel' => $inscription->salle?->name,
                    'schoolYearId' => (string) $inscription->school_year_id,
                    'schoolYearLabel' => $inscription->schoolYear?->label,
                    'statut' => $inscription->statut,
                    'totalDu' => $due,
                    'totalPaye' => $paid,
                    'solde' => $solde,
                    'monthlyDue' => $monthlyDue,
                    'monthlySolde' => $monthlySolde,
                    'lastPaymentDate' => $payments->max('paid_at')?->format('Y-m-d'),
                ];
            })->filter(fn ($row) => $row['solde'] > 0 || $row['statut'] === 'En attente de paiement')
            ->values();

        return response()->json([
            'data' => $rows,
            'dettes' => $rows,
        ]);
    }

    public function storeStudent(Request $request)
    {
        $request->merge([
            'parentWhatsApp' => CameroonPhoneNumber::localDigits($request->input('parentWhatsApp')),
        ]);
        $validated = $request->validate([
            'name' => ['required', 'string', 'min:2', 'max:255'],
            'parentName' => ['required', 'string', 'min:2', 'max:255'],
            'parentWhatsApp' => ['required', 'string', 'size:9', 'regex:/^6\d{8}$/'],
            'language' => ['nullable', 'in:espagnol,allemand'],
        ]);

        do {
            $studentCode = (string) random_int(100_000_000, 999_999_999);
        } while (Student::withTrashed()->where('code', $studentCode)->exists());

        $student = Student::create([
            'code' => $studentCode,
            'name' => PersonName::title($validated['name']),
            'parent_name' => PersonName::title($validated['parentName']),
            'parent_whatsapp' => CameroonPhoneNumber::toInternational($validated['parentWhatsApp']),
            'enrollment_status' => 'validée',
            'language' => $validated['language'] ?? null,
        ]);

        return response()->json([
            'message' => 'Étudiant créé avec succès.',
            'student' => [
                'id' => (string) $student->id,
                'code' => $student->code,
                'name' => $student->name,
                'parentName' => $student->parent_name,
                'parentWhatsApp' => $student->parent_whatsapp,
                'language' => $student->language,
                'enrollmentStatus' => $student->enrollment_status,
            ],
        ], 201);
    }

    public function storeInscription(Request $request)
    {
        $validated = $request->validate([
            'student_id' => ['required', TenantRules::exists('students')],
            'salle_id' => ['required', TenantRules::exists('salles')],
            'school_year_id' => ['required', TenantRules::exists('school_years')],
            'tarif_id' => ['nullable', TenantRules::exists('tarifs')],
            'date_inscription' => ['nullable', 'date'],
            'nombre_mois' => ['nullable', 'integer', 'min:1', 'max:12'],
        ]);

        $student = Student::findOrFail($validated['student_id']);
        $salle = Salle::findOrFail($validated['salle_id']);
        $schoolYear = SchoolYear::findOrFail($validated['school_year_id']);

        $existingInscription = Inscription::query()
            ->where('student_id', $student->id)
            ->where('school_year_id', $schoolYear->id)
            ->first();

        if ($existingInscription) {
            return response()->json([
                'message' => 'Un élève ne peut avoir qu\'une inscription par année scolaire.',
            ], 409);
        }

        $tarifId = $validated['tarif_id'] ?? Tarif::query()
            ->where('salle_id', $salle->id)
            ->where('school_year_id', $schoolYear->id)
            ->value('id');

        if (! $tarifId) {
            return response()->json([
                'message' => "Aucun tarif pour cette salle et cette année. Créez d'abord le tarif.",
            ], 422);
        }

        $inscription = Inscription::create([
            'code' => 'ins-'.$student->id.'-'.$schoolYear->id.'-'.now()->timestamp,
            'student_id' => $student->id,
            'salle_id' => $salle->id,
            'school_year_id' => $schoolYear->id,
            'tarif_id' => $tarifId,
            'statut' => 'En attente de paiement',
            'date_inscription' => $validated['date_inscription'] ?? now()->toDateString(),
            'nombre_mois' => (int) ($validated['nombre_mois'] ?? 9),
        ]);

        $tarifModel = Tarif::find($tarifId);
        $mens = (int) ($tarifModel?->mensualite ?? 0);
        $frais = (int) ($tarifModel?->frais_inscription ?? 0);
        $insDate = $inscription->date_inscription ?? now();
        $firstDue = $frais + $mens;

        SystemNotificationLogger::record([
            'entity' => 'Inscription '.$student->name,
            'type' => 'modification_note',
            'student_id' => $student->id,
            'recipient_name' => $student->parent_name,
            'recipient_whatsapp' => $student->parent_whatsapp,
            'school_year_id' => $schoolYear->id,
            'school_year_code' => $schoolYear->code,
            'old_value' => null,
            'new_value' => 'En attente de paiement',
            'details' => 'Inscription du '.$insDate->format('Y-m-d').' en '.$salle->name,
            'notification_type' => 'rappel_paiement',
            'notification_content' => '1ère échéance ('.$salle->name.') pour '.$student->name.' : inscription + mois 1 = '.number_format($firstDue, 0, ',', ' ').' FCFA dus entre le '.$insDate->format('d/m/Y').' et le '.$insDate->copy()->addMonth()->format('d/m/Y').'. Cycle mensuel à date anniversaire.',
        ]);

        return response()->json([
            'message' => 'Inscription enregistrée.',
            'inscription' => [
                'id' => (string) $inscription->id,
                'student_id' => $inscription->student_id,
                'studentId' => (string) $inscription->student_id,
                'salle_id' => $inscription->salle_id,
                'salleId' => (string) $inscription->salle_id,
                'school_year_id' => $inscription->school_year_id,
                'schoolYearId' => (string) $inscription->school_year_id,
                'tarif_id' => $inscription->tarif_id,
                'tarifId' => (string) $inscription->tarif_id,
                'statut' => $inscription->statut,
                'date_inscription' => $inscription->date_inscription?->format('Y-m-d'),
                'dateInscription' => $inscription->date_inscription?->format('Y-m-d'),
            ],
        ], 201);
    }

    public function updateStudent(Request $request, $id)
    {
        $student = Student::findOrFail($id);
        if ($request->exists('parentWhatsApp')) {
            $request->merge([
                'parentWhatsApp' => CameroonPhoneNumber::localDigits($request->input('parentWhatsApp')),
            ]);
        }
        $validated = $request->validate([
            'name' => ['sometimes', 'string', 'min:2', 'max:255'],
            'parentName' => ['sometimes', 'string', 'min:2', 'max:255'],
            'parentWhatsApp' => ['sometimes', 'string', 'size:9', 'regex:/^6\d{8}$/'],
            'language' => ['nullable', 'in:espagnol,allemand'],
        ]);

        $map = [
            'name' => 'name',
            'parentName' => 'parent_name',
            'parentWhatsApp' => 'parent_whatsapp',
            'language' => 'language',
        ];
        $data = [];
        foreach ($map as $input => $column) {
            if (array_key_exists($input, $validated)) {
                $data[$column] = match ($input) {
                    'parentWhatsApp' => CameroonPhoneNumber::toInternational($validated[$input]),
                    'name', 'parentName' => PersonName::title($validated[$input]),
                    default => $validated[$input],
                };
            }
        }
        if (! empty($data)) {
            $student->update($data);
        }

        return response()->json([
            'message' => 'Élève mis à jour.',
            'student' => [
                'id' => (string) $student->id,
                'code' => $student->code,
                'name' => $student->name,
                'parentName' => $student->parent_name,
                'parentWhatsApp' => $student->parent_whatsapp,
                'language' => $student->language,
                'enrollmentStatus' => $student->enrollment_status,
            ],
        ]);
    }

    public function destroyStudent($id)
    {
        $student = Student::findOrFail($id);
        $student->delete();

        return response()->json(['message' => 'Élève archivé.']);
    }

    public function restoreStudent($id)
    {
        $student = Student::withTrashed()->findOrFail($id);
        if (! $student->trashed()) {
            return response()->json(['message' => 'L’élève est déjà actif.'], 409);
        }
        $student->restore();

        return response()->json(['message' => 'Élève restauré.']);
    }

    public function storeTarif(Request $request)
    {
        $validated = $request->validate([
            'salle_id' => ['required', TenantRules::exists('salles')],
            'school_year_id' => ['required', TenantRules::exists('school_years')],
            'frais_inscription' => ['required', 'numeric', 'min:0'],
            'mensualite' => ['required', 'numeric', 'min:1'],
            'nombre_mois' => ['nullable', 'integer', 'min:1', 'max:12'],
        ]);

        $existingTarif = Tarif::withTrashed()
            ->where('salle_id', $validated['salle_id'])
            ->where('school_year_id', $validated['school_year_id'])
            ->first();
        if ($existingTarif && ! $existingTarif->trashed()) {
            return response()->json(['message' => 'Un tarif existe déjà pour cette salle et cette année.'], 409);
        }
        if ($existingTarif?->trashed()) {
            return response()->json(['message' => 'Un tarif supprimé existe déjà pour cette salle et cette année. Restaurez-le avant de le modifier.'], 409);
        }

        $count = Tarif::query()->max('id') ?? 0;
        $tarif = Tarif::create([
            'code' => 'tarif-'.$validated['salle_id'].'-'.$validated['school_year_id'].'-'.($count + 1),
            'salle_id' => $validated['salle_id'],
            'school_year_id' => $validated['school_year_id'],
            'frais_inscription' => (int) round($validated['frais_inscription']),
            'mensualite' => (int) round($validated['mensualite']),
            'nombre_mois' => (int) ($validated['nombre_mois'] ?? 9),
        ]);

        return response()->json([
            'message' => 'Tarif créé.',
            'tarif' => [
                'id' => (string) $tarif->id,
                'salleId' => (string) $tarif->salle_id,
                'schoolYearId' => (string) $tarif->school_year_id,
                'fraisInscription' => (int) $tarif->frais_inscription,
                'mensualite' => (int) $tarif->mensualite,
                'nombreMois' => (int) $tarif->nombre_mois,
            ],
        ], 201);
    }

    public function updateTarif(Request $request, $id)
    {
        $tarif = Tarif::findOrFail($id);
        $validated = $request->validate([
            'salle_id' => ['sometimes', TenantRules::exists('salles')],
            'school_year_id' => ['sometimes', TenantRules::exists('school_years')],
            'frais_inscription' => ['sometimes', 'numeric', 'min:0'],
            'mensualite' => ['sometimes', 'numeric', 'min:1'],
            'nombre_mois' => ['nullable', 'integer', 'min:1', 'max:12'],
        ]);

        $salleId = $validated['salle_id'] ?? $tarif->salle_id;
        $yearId = $validated['school_year_id'] ?? $tarif->school_year_id;
        $dup = Tarif::query()
            ->where('salle_id', $salleId)
            ->where('school_year_id', $yearId)
            ->where('id', '!=', $tarif->id)
            ->exists();
        if ($dup) {
            return response()->json(['message' => 'Doublon salle/année.'], 409);
        }

        $tarif->update([
            'salle_id' => $salleId,
            'school_year_id' => $yearId,
            'frais_inscription' => isset($validated['frais_inscription']) ? (int) round($validated['frais_inscription']) : $tarif->frais_inscription,
            'mensualite' => isset($validated['mensualite']) ? (int) round($validated['mensualite']) : $tarif->mensualite,
            'nombre_mois' => isset($validated['nombre_mois']) ? (int) $validated['nombre_mois'] : $tarif->nombre_mois,
        ]);

        return response()->json([
            'message' => 'Tarif mis à jour.',
            'tarif' => [
                'id' => (string) $tarif->id,
                'salleId' => (string) $tarif->salle_id,
                'schoolYearId' => (string) $tarif->school_year_id,
                'fraisInscription' => (int) $tarif->frais_inscription,
                'mensualite' => (int) $tarif->mensualite,
                'nombreMois' => (int) $tarif->nombre_mois,
            ],
        ]);
    }

    public function destroyTarif($id)
    {
        $tarif = Tarif::findOrFail($id);
        if (Inscription::query()->where('tarif_id', $tarif->id)->exists()) {
            return response()->json(['message' => 'Impossible : des inscriptions utilisent ce tarif.'], 409);
        }
        $tarif->delete();

        return response()->json(['message' => 'Tarif supprimé.']);
    }

    public function restoreTarif($id)
    {
        $tarif = Tarif::withTrashed()->findOrFail($id);
        if (! $tarif->trashed()) {
            return response()->json(['message' => 'Le tarif est déjà actif.'], 409);
        }
        $tarif->restore();

        return response()->json(['message' => 'Tarif restauré.']);
    }

    public function updateInscriptionStatut(Request $request, $id)
    {
        $inscription = Inscription::findOrFail($id);
        $validated = $request->validate([
            'statut' => ['required', 'in:Validée,En pause,En attente de paiement'],
            'reason' => ['nullable', 'string', 'max:255'],
        ]);

        $inscription->statut = $validated['statut'];
        if ($validated['statut'] === 'En pause') {
            $inscription->paused_at = now();
            $inscription->pause_reason = $validated['reason'] ?? null;
        }
        if ($validated['statut'] === 'Validée') {
            $inscription->reactivated_at = now();
            $inscription->validated_at = $inscription->validated_at ?? now();
        }
        $inscription->save();

        return response()->json([
            'message' => 'Statut inscription mis à jour.',
            'inscription' => [
                'id' => (string) $inscription->id,
                'statut' => $inscription->statut,
            ],
        ]);
    }

    public function updateInscription(Request $request, $id)
    {
        $validated = $request->validate([
            'nombre_mois' => ['required', 'integer', 'min:1', 'max:12'],
        ]);

        $inscription = Inscription::query()->findOrFail($id);
        $inscription->nombre_mois = $validated['nombre_mois'];
        $inscription->save();

        return response()->json([
            'message' => 'Nombre de mois mis à jour.',
            'inscription' => [
                'id' => (string) $inscription->id,
                'nombreMois' => (int) $inscription->nombre_mois,
            ],
        ]);
    }

    public function storePayment(Request $request)
    {
        $validated = $request->validate([
            'inscription_id' => ['required', TenantRules::exists('inscriptions')],
            'amount' => ['required', 'numeric', 'min:1'],
            'date' => ['nullable', 'date'],
            'type' => ['nullable', 'in:inscription,mensualité'],
        ]);

        $inscription = Inscription::with(['tarif', 'payments'])->findOrFail($validated['inscription_id']);
        $tarif = $inscription->tarif;
        if (! $tarif) {
            return response()->json(['message' => 'Aucun tarif lié à cette inscription.'], 422);
        }

        $due = (int) $tarif->frais_inscription + ((int) $tarif->mensualite * 9);
        $paid = (int) $inscription->payments->where('status', '!=', 'impayé')->sum('amount');
        $solde = max(0, $due - $paid);
        $amount = (int) round($validated['amount']);
        if ($amount > $solde) {
            return response()->json(['message' => 'Montant supérieur au solde dû ('.$solde.').'], 422);
        }

        $newSolde = $solde - $amount;
        $count = Payment::query()->max('id') ?? 0;
        $payment = Payment::create([
            'code' => 'PAY-'.str_pad((string) ($count + 1), 6, '0', STR_PAD_LEFT),
            'student_id' => $inscription->student_id,
            'inscription_id' => $inscription->id,
            'type' => $validated['type'] ?? 'mensualité',
            'amount' => $amount,
            'expected_amount' => $due,
            'solde_du' => $newSolde,
            'status' => $amount >= $solde ? 'payé' : 'partiel',
            'due_date' => $validated['date'] ?? now()->toDateString(),
            'paid_at' => $validated['date'] ?? now()->toDateString(),
            'created_by' => $request->user()?->id,
        ]);

        if ($inscription->statut === 'En attente de paiement' && $amount > 0) {
            $inscription->statut = 'Validée';
            $inscription->validated_at = $inscription->validated_at ?? now();
            $inscription->save();
        }

        return response()->json([
            'message' => 'Paiement enregistré.',
            'payment' => [
                'id' => (string) $payment->id,
                'inscriptionId' => (string) $payment->inscription_id,
                'amount' => (int) $payment->amount,
                'date' => $payment->paid_at?->format('Y-m-d'),
                'type' => $payment->type,
                'status' => $payment->status,
            ],
            'newSolde' => $newSolde,
        ], 201);
    }
}
