import type { Auth } from '@/types/auth';

declare global {
    type User = import('./auth').User;
    type RoomId = string;
    type InscriptionStatut =
        | 'En attente de paiement'
        | 'Validée'
        | 'Suspendue'
        | 'Archivée'
        | 'En pause';

    interface SubjectCoeff {
        name: string;
        coefficient: number;
        teacherId?: string;
    }

    interface Salle {
        id: string;
        roomId: string;
        name: string;
        schoolYearId: string;
        status: 'active' | 'archivée';
        principalTeacherId?: string;
        subjects: SubjectCoeff[];
        createdAt: string;
        code?: string;
    }

    interface SchoolYear {
        id: string;
        code?: string;
        label: string;
        startDate: string;
        endDate: string;
        isActive: boolean;
        isArchived: boolean;
    }

    interface Student {
        id: string;
        code: string;
        name: string;
        parentName: string;
        parentWhatsApp: string;
        roomId?: string;
        language?: 'espagnol' | 'allemand';
        enrollmentStatus?: 'validée' | 'suspendue' | 'archivée';
    }

    interface Inscription {
        id: string;
        studentId: string;
        salleId: string;
        schoolYearId: string;
        statut: InscriptionStatut;
        tarifId: string;
        dateInscription: string;
        nombreMois?: number;
        createdAt: string;
    }
}

declare module 'react' {
    interface InputHTMLAttributes<T> {
        passwordrules?: string;
    }
}

declare module '@inertiajs/core' {
    export interface InertiaConfig {
        sharedPageProps: {
            name: string;
            auth: Auth;
            sidebarOpen: boolean;
            [key: string]: unknown;
        };
    }
}
