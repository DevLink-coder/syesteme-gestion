export const NB_MOIS = 9;

export type StatutEcheance = 'payee' | 'partielle' | 'impayee' | 'a_venir';

export type ObjetPaiement = 'inscription' | 'mensualite';

export interface Echeance {
    index: number;
    kind: 'frais' | 'mois';
    label: string;
    dueDate: string; // YYYY-MM-DD
    amount: number;
    paid: number;
    solde: number;
    status: StatutEcheance;
    overdue: boolean;
}

export interface Echeancier {
    cycles: Echeance[];
    totalDu: number;
    totalPaye: number;
    solde: number;
    /** Échéances dont la date est passée et non soldées */
    currentDue: number;
    /** Montant total des échéances arrivées à échéance */
    dueToDate: number;
    /** Paiements affectés aux échéances déjà arrivées à échéance */
    paidToDate: number;
    /** Reste des frais d'inscription */
    fraisDue: number;
    /** Reste des mensualités dues à aujourd'hui (hors frais) */
    moisDue: number;
    /** Libellé de la prochaine échéance non soldée */
    currentLabel: string;
    /** Mois N de la prochaine mensualité non soldée (ex. "Mois 1") */
    currentMoisLabel: string;
    /** true si rien n'est dû à aujourd'hui */
    isClean: boolean;
    overdue: boolean;
    nextDueDate: string | null;
    nextDueAmount: number;
}

export interface EcheancierInput {
    dateInscription: string;
    fraisInscription: number;
    mensualite: number;
    nombreMois?: number;
}

export interface PaiementInput {
    amount: number;
    date: string;
    status: string;
    /** Objet BD : 'inscription' | 'mensualité' (legacy 'total'/'partiel' acceptés) */
    type?: string;
}

function todayStr(): string {
    const d = new Date();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${d.getFullYear()}-${m}-${day}`;
}

/** Ajoute k mois en conservant le jour (plafonné à fin de mois). */
export function addMonthsClamped(dateStr: string, months: number): string {
    const [y, m, d] = dateStr.split('-').map(Number);
    if (!y || !m || !d) return dateStr;
    const target = new Date(y, m - 1 + months, 1);
    const lastDay = new Date(
        target.getFullYear(),
        target.getMonth() + 1,
        0,
    ).getDate();
    const day = Math.min(d, lastDay);
    const mm = String(target.getMonth() + 1).padStart(2, '0');
    return `${target.getFullYear()}-${mm}-${String(day).padStart(2, '0')}`;
}

function allocate(
    cycles: Echeance[],
    amount: number,
    onlyKind?: 'frais' | 'mois',
): number {
    let rest = amount;
    const order = [...cycles].sort((a, b) =>
        String(a.dueDate).localeCompare(String(b.dueDate)),
    );
    for (const c of order) {
        if (rest <= 0) break;
        if (onlyKind && c.kind !== onlyKind) continue;
        if (c.solde <= 0) continue;
        const take = Math.min(c.solde, rest);
        c.paid += take;
        c.solde -= take;
        rest -= take;
    }
    // Trop-perçu sur une catégorie : reverse le reliquat sur l'autre
    if (rest > 0 && onlyKind) {
        for (const c of order) {
            if (rest <= 0) break;
            if (c.kind === onlyKind || c.solde <= 0) continue;
            const take = Math.min(c.solde, rest);
            c.paid += take;
            c.solde -= take;
            rest -= take;
        }
    }
    return rest;
}

export function buildEcheancier(
    inscription: EcheancierInput,
    tarif:
        | { fraisInscription: number; mensualite: number; nombreMois?: number }
        | undefined,
    paiements: PaiementInput[],
    today: string = todayStr(),
): Echeancier {
    const frais = Math.round(tarif?.fraisInscription ?? 0);
    const mens = Math.round(tarif?.mensualite ?? 0);
    const nbMois = tarif?.nombreMois ?? 9;
    const start = inscription.dateInscription || today;

    const cycles: Echeance[] = [
        {
            index: 0,
            kind: 'frais',
            label: 'Inscription',
            dueDate: start,
            amount: frais,
            paid: 0,
            solde: frais,
            status: 'a_venir',
            overdue: false,
        },
    ];
    for (let k = 0; k < nbMois; k++) {
        cycles.push({
            index: k + 1,
            kind: 'mois',
            label: `Mois ${k + 1}`,
            dueDate: addMonthsClamped(start, k),
            amount: mens,
            paid: 0,
            solde: mens,
            status: 'a_venir',
            overdue: false,
        });
    }

    // Allocation par objet : l'inscription solde les frais, la mensualité
    // solde les mois (FIFO). On peut donc payer le mois avant les frais.
    const ordered = [...paiements]
        .filter((p) => p.status !== 'impayé' && p.amount > 0 && p.date <= today)
        .sort((a, b) => String(a.date).localeCompare(String(b.date)));
    for (const p of ordered) {
        const t = (p.type || '').toLowerCase();
        if (t === 'inscription') allocate(cycles, p.amount, 'frais');
        else if (t === 'mensualité' || t === 'mensualite')
            allocate(cycles, p.amount, 'mois');
        else allocate(cycles, p.amount);
    }

    for (const c of cycles) {
        if (c.solde <= 0) c.status = 'payee';
        else if (c.paid > 0) c.status = 'partielle';
        else if (c.dueDate <= today) c.status = 'impayee';
        else c.status = 'a_venir';
        c.overdue = c.dueDate <= today && c.solde > 0;
    }

    const totalDu = cycles.reduce((s, c) => s + c.amount, 0);
    const totalPaye = cycles.reduce((s, c) => s + c.paid, 0);
    const solde = Math.max(0, totalDu - totalPaye);
    const currentDue = cycles
        .filter((c) => c.dueDate <= today)
        .reduce((s, c) => s + c.solde, 0);
    const dueToDate = cycles
        .filter((c) => c.dueDate <= today)
        .reduce((s, c) => s + c.amount, 0);
    const paidToDate = cycles
        .filter((c) => c.dueDate <= today)
        .reduce((s, c) => s + c.paid, 0);
    const fraisDue = cycles[0]?.solde ?? 0;
    const moisDue = Math.max(
        0,
        currentDue - (cycles[0]?.overdue ? fraisDue : 0),
    );
    const firstUnpaid = cycles.find((c) => c.solde > 0) ?? null;
    const firstUnpaidMois =
        cycles.find((c) => c.kind === 'mois' && c.solde > 0) ?? null;

    // Custom label for first month when both inscription and first month are due
    let currentLabel = firstUnpaid ? firstUnpaid.label : 'Soldé';
    if (cycles[0]?.solde > 0 && cycles[1]?.solde > 0) {
        currentLabel = 'Inscription + mensualité';
    } else if (cycles[0]?.solde > 0) {
        currentLabel = "Frais d'inscription";
    } else if (cycles[1]?.solde > 0) {
        currentLabel = 'Mensualité';
    }

    return {
        cycles,
        totalDu,
        totalPaye,
        solde,
        currentDue,
        dueToDate,
        paidToDate,
        fraisDue,
        moisDue,
        currentLabel,
        currentMoisLabel: firstUnpaidMois ? firstUnpaidMois.label : 'Soldé',
        isClean: currentDue === 0,
        overdue: cycles.some((c) => c.overdue),
        nextDueDate: firstUnpaid ? firstUnpaid.dueDate : null,
        nextDueAmount: firstUnpaid ? firstUnpaid.solde : 0,
    };
}
